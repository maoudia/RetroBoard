import { describe, expect, it } from 'vitest'
import { type AgendaState, agendaRunning, allowedInPhase, closePhase, type CommandType, extendPhase, MIN, newAgenda, PHASE_FLOOR_MS, type Phase, type PhaseKind, phaseAllows, phaseBudgetMs, phaseClock } from '../src'

const phase = (kind: PhaseKind, minutes: number, actualMs?: number): Phase => ({ id: `p-${kind}`, kind, plannedMs: minutes * MIN, ...(actualMs === undefined ? {} : { actualMs }) })
const agenda = (over: Partial<AgendaState> = {}): AgendaState => ({ phases: [phase('write', 10), phase('group', 20), phase('vote', 30)], current: 0, startedAt: 0, pausedAt: null, rules: true, autoPublish: true, ...over })

describe('the time of an agenda, exactly', () => {
  it('lets the running phase use the whole planned time minus what the others took, never less than nothing', () => {
    const a = agenda({ phases: [phase('write', 10, 4 * MIN), phase('group', 20, 99 * MIN), phase('vote', 30)], current: 1 })
    expect(phaseBudgetMs(a)).toBe(56 * MIN)
    expect(phaseBudgetMs({ ...a, current: 0 })).toBe(0)
    expect(phaseBudgetMs(agenda({ phases: [phase('write', 1, 5 * MIN), phase('group', 1)], current: 1 }))).toBe(0)
  })

  it('records the time of the phase it leaves, pauses excluded and capped by the budget, and nothing outside a running agenda', () => {
    const a = agenda()
    const left = closePhase({ ...a, startedAt: 1_000 }, 1_000 + 3 * MIN)
    expect(left.map((p) => p.actualMs)).toEqual([3 * MIN, undefined, undefined])
    expect(closePhase({ ...a, startedAt: 1_000, pausedAt: 1_000 + 2 * MIN }, 1_000 + 9 * MIN)[0]!.actualMs).toBe(2 * MIN)
    expect(closePhase({ ...a, startedAt: 5_000 }, 1_000)[0]!.actualMs).toBe(0)
    expect(closePhase(a, 500 * MIN)[0]!.actualMs).toBe(60 * MIN)
    for (const current of [-1, 3]) expect(closePhase({ ...a, current }, 9_999)).toBe(a.phases)
    expect(closePhase({ ...a, current: 2 }, 3 * MIN)[2]!.actualMs).toBe(3 * MIN)
  })

  it('builds an agenda from phases in minutes: ids in order, rounded to the millisecond, rules and publishing on, chaining off', () => {
    let n = 0
    const built = newAgenda([{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 0.5 }, { kind: 'close', minutes: 1.0000004 }], () => `id${n++}`)
    expect(built).toEqual({ phases: [{ id: 'id0', kind: 'write', plannedMs: 5 * MIN }, { id: 'id1', kind: 'vote', plannedMs: 30_000 }, { id: 'id2', kind: 'close', plannedMs: 60_000 }], current: -1, startedAt: 0, pausedAt: null, rules: true, autoPublish: true, chain: false })
    const custom = newAgenda([{ kind: 'write', minutes: 1 }], () => 'x', { rules: false, autoPublish: false, chain: true })
    expect(custom).toMatchObject({ rules: false, autoPublish: false, chain: true })
    expect(newAgenda([{ kind: 'write', minutes: 1 }], () => 'x', { rules: true, autoPublish: true, chain: false })).toMatchObject({ rules: true, autoPublish: true, chain: false })
  })

  it('is running from the first phase to the last, not before and not after', () => {
    expect(agendaRunning(null)).toBe(false)
    expect([-1, 0, 2, 3].map((current) => agendaRunning(agenda({ current })))).toEqual([false, true, true, false])
  })

  describe('the clock', () => {
    it('shows nothing before the start, and the time really spent once it is over', () => {
      const phases = [phase('write', 10, 4 * MIN), phase('group', 20, 7 * MIN)]
      expect(phaseClock(agenda({ phases, current: -1 }), 9)).toEqual({ index: -1, phase: null, elapsedMs: 0, remainingMs: 0, overtime: false, paused: false, capped: false, totalPlannedMs: 30 * MIN, totalElapsedMs: 0 })
      expect(phaseClock(agenda({ phases, current: 2 }), 9)).toEqual({ index: 2, phase: null, elapsedMs: 0, remainingMs: 0, overtime: false, paused: false, capped: false, totalPlannedMs: 30 * MIN, totalElapsedMs: 11 * MIN })
    })

    it('counts down the running phase, and is in overtime only once the time is over, not at the moment it is', () => {
      const a = agenda({ phases: [phase('write', 10), phase('group', 10)], startedAt: 1_000 })
      expect(phaseClock(a, 1_000 + 4 * MIN)).toMatchObject({ index: 0, elapsedMs: 4 * MIN, remainingMs: 6 * MIN, overtime: false, paused: false, capped: false, totalPlannedMs: 20 * MIN, totalElapsedMs: 4 * MIN })
      expect(phaseClock(a, 1_000 + 10 * MIN)).toMatchObject({ remainingMs: 0, overtime: false, capped: false })
      expect(phaseClock(a, 1_000 + 10 * MIN + 1)).toMatchObject({ remainingMs: -1, overtime: true })
    })

    it('freezes when the whole retro time is used, exactly at that moment, and while paused', () => {
      const one = agenda({ phases: [phase('write', 10)], startedAt: 0 })
      expect(phaseClock(one, 10 * MIN - 1)).toMatchObject({ capped: false, elapsedMs: 10 * MIN - 1 })
      expect(phaseClock(one, 10 * MIN)).toMatchObject({ capped: true, elapsedMs: 10 * MIN })
      expect(phaseClock(one, 99 * MIN)).toMatchObject({ capped: true, elapsedMs: 10 * MIN, overtime: false })
      const paused = agenda({ phases: [phase('write', 10)], startedAt: 0, pausedAt: 3 * MIN })
      expect(phaseClock(paused, 9 * MIN)).toMatchObject({ paused: true, elapsedMs: 3 * MIN, remainingMs: 7 * MIN })
      expect(phaseClock(agenda({ startedAt: 5_000 }), 1_000)).toMatchObject({ elapsedMs: 0 })
    })
  })
})

describe('borrowing time, exactly', () => {
  const planned = (a: AgendaState) => a.phases.map((p) => p.plannedMs)
  const withLater = (...later: number[]): AgendaState => agenda({ phases: [phase('write', 10), ...later.map((ms, i) => ({ id: `l${i}`, kind: 'group' as const, plannedMs: ms }))], current: 0 })

  it('changes nothing when no phase is running', () => {
    const a = withLater(PHASE_FLOOR_MS + 5_000)
    for (const current of [-1, 2]) {
      const idle = { ...a, current }
      expect(extendPhase(idle, MIN, true)).toBe(idle)
    }
  })

  it('extends the running phase alone without borrowing, and does not touch the original', () => {
    const a = withLater(PHASE_FLOOR_MS + 5_000)
    const longer = extendPhase(a, 2 * MIN, false)
    expect(planned(longer)).toEqual([12 * MIN, PHASE_FLOOR_MS + 5_000])
    expect(planned(a)).toEqual([10 * MIN, PHASE_FLOOR_MS + 5_000])
  })

  it('takes from later phases in proportion to what each can give above the floor', () => {
    const out = extendPhase(withLater(PHASE_FLOOR_MS + 10_000, PHASE_FLOOR_MS + 30_000), 20_000, true)
    expect(planned(out)).toEqual([10 * MIN + 20_000, PHASE_FLOOR_MS + 5_000, PHASE_FLOOR_MS + 15_000])
  })

  it('gives the leftovers of the rounding to the phases with the most room, first in order on a tie', () => {
    expect(planned(extendPhase(withLater(PHASE_FLOOR_MS + 1_000, PHASE_FLOOR_MS + 2_000, PHASE_FLOOR_MS + 2_000), 3_000, true))).toEqual([10 * MIN + 3_000, 61_000, 60_000, 61_000])
    expect(planned(extendPhase(withLater(PHASE_FLOOR_MS + 1_500, PHASE_FLOOR_MS + 1_500, PHASE_FLOOR_MS + 1_500), 4_000, true))).toEqual([10 * MIN + 4_000, 60_000, 60_000, 60_500])
  })

  it('borrows only what is there and never takes a phase below the floor, nor produces nonsense without room', () => {
    const noRoom = extendPhase(withLater(PHASE_FLOOR_MS, PHASE_FLOOR_MS), 5_000, true)
    expect(planned(noRoom)).toEqual([10 * MIN + 5_000, PHASE_FLOOR_MS, PHASE_FLOOR_MS])
    const little = extendPhase(withLater(PHASE_FLOOR_MS + 2_000), 10_000, true)
    expect(planned(little)).toEqual([10 * MIN + 10_000, PHASE_FLOOR_MS])
    expect(planned(extendPhase(agenda({ phases: [phase('write', 10)], current: 0 }), 5_000, true))).toEqual([10 * MIN + 5_000])
  })
})

describe('what a phase is about, exactly', () => {
  const EXPECTED: Record<PhaseKind, CommandType[]> = {
    checkin: [],
    review: ['action.status', 'action.update', 'action.toggle'],
    write: ['note.add', 'note.addMany', 'note.edit', 'note.delete', 'note.color'],
    group: ['note.group', 'note.ungroup', 'note.move', 'group.rename', 'group.recolor', 'group.dissolve', 'group.merge', 'group.move', 'note.edit', 'note.color', 'note.addMany'],
    vote: ['vote.add', 'vote.remove', 'vote.toggle'],
    rank: ['action.add'],
    actions: ['action.add', 'action.update', 'action.status', 'action.toggle', 'action.delete'],
    close: ['roti.set'],
  }
  const everything = [...new Set(Object.values(EXPECTED).flat()), 'chat.post', 'timer.start', 'settings.update'] as CommandType[]

  it('lets a participant do exactly the commands of the phase, and nothing else', () => {
    for (const [kind, commands] of Object.entries(EXPECTED) as [PhaseKind, CommandType[]][]) {
      for (const command of everything) expect(phaseAllows(kind, command), `${kind}: ${command}`).toBe(commands.includes(command))
    }
  })

  it('applies the rules only while the agenda runs with its rules on', () => {
    const running = (kind: PhaseKind, over: Partial<AgendaState> = {}) => agenda({ phases: [phase(kind, 5)], current: 0, ...over })
    expect(allowedInPhase(null, 'note.add')).toBe(true)
    expect(allowedInPhase(agenda({ current: -1 }), 'vote.add')).toBe(true)
    expect(allowedInPhase(running('write', { rules: false }), 'vote.add')).toBe(true)
    expect(allowedInPhase(running('write'), 'note.add')).toBe(true)
    expect(allowedInPhase(running('write'), 'vote.add')).toBe(false)
    expect(allowedInPhase(running('checkin'), 'note.add')).toBe(false)
  })

  it('never makes taking a speaking turn, chatting or presenting a matter of phase', () => {
    for (const command of ['talk.self', 'talk.done', 'chat.post', 'presenter.set'] as CommandType[]) expect(allowedInPhase(agenda({ phases: [phase('checkin', 5)] }), command), command).toBe(true)
    expect(allowedInPhase(agenda({ phases: [phase('checkin', 5)] }), 'talk.assign')).toBe(false)
  })

  it('opens voting outside the vote phase when the facilitator did, for voting commands only', () => {
    const open = agenda({ phases: [phase('write', 5)], voteOpen: true })
    for (const command of ['vote.add', 'vote.remove', 'vote.toggle'] as CommandType[]) expect(allowedInPhase(open, command), command).toBe(true)
    for (const command of ['vote.add', 'vote.remove', 'vote.toggle'] as CommandType[]) expect(allowedInPhase({ ...open, voteOpen: false }, command), `closed ${command}`).toBe(false)
    expect(allowedInPhase(open, 'note.add')).toBe(true)
    expect(allowedInPhase(open, 'action.add')).toBe(false)
  })
})
