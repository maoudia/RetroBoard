import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { harness } from '@retroboard/testkit'
import { AGENDA_PRESETS, allowedInPhase, type AgendaState, extendPhase, MIN, newAgenda, PHASE_FLOOR_MS, PHASE_KINDS, phaseClock, presetPhases } from '../src'

const ids = () => { let i = 0; return () => `p${i++}` }
/** Earlier phases ran exactly their plan, as recorded when they were left. */
const started = (minutes: number[], current = 0, startedAt = 0): AgendaState => {
  const a = newAgenda(minutes.map((m, i) => ({ kind: PHASE_KINDS[i % 8]!, minutes: m })), ids())
  return { ...a, current, startedAt, phases: a.phases.map((p, i) => (i < current ? { ...p, actualMs: p.plannedMs } : p)) }
}

describe('presets', () => {
  it.each([30, 45, 60, 90] as const)('the %i-minute preset has 8 phases summing exactly', (total) => {
    const phases = presetPhases(total)
    expect(phases.map((p) => p.kind)).toEqual([...PHASE_KINDS])
    expect(phases.reduce((n, p) => n + p.minutes, 0)).toBe(total)
    expect(Object.keys(AGENDA_PRESETS[total])).toHaveLength(8)
  })
})

describe('phase clock', () => {
  it('reports elapsed, remaining, overtime and totals', () => {
    const a = started([10, 5, 5], 1, 1_000)
    const c = phaseClock(a, 1_000 + 2 * MIN)
    expect([c.phase?.kind, c.elapsedMs, c.remainingMs, c.overtime, c.totalPlannedMs, c.totalElapsedMs]).toEqual(['review', 2 * MIN, 3 * MIN, false, 20 * MIN, 12 * MIN])
    expect(phaseClock(a, 1_000 + 7 * MIN)).toMatchObject({ remainingMs: -2 * MIN, overtime: true })
  })

  it('freezes while paused and handles before and after', () => {
    const a = { ...started([5], 0, 0), pausedAt: 2 * MIN }
    expect(phaseClock(a, 9 * MIN)).toMatchObject({ elapsedMs: 2 * MIN, paused: true })
    expect(phaseClock(newAgenda([{ kind: 'write', minutes: 5 }], ids()), 0)).toMatchObject({ phase: null, totalElapsedMs: 0 })
    expect(phaseClock(started([5], 1), 0)).toMatchObject({ phase: null, totalElapsedMs: 5 * MIN })
  })
})

describe('global time follows the real time spent', () => {
  it('a skipped phase adds what it really took, not its plan', () => {
    // 10 + 15 + 35 = 60 min planned; the 15 minute phase was left after one minute.
    const a = started([10, 15, 35], 2, 11 * MIN)
    const skipped: AgendaState = { ...a, phases: a.phases.map((p, i) => (i === 1 ? { ...p, actualMs: MIN } : p)) }
    const c = phaseClock(skipped, 11 * MIN + 2 * MIN)
    expect(c.totalPlannedMs).toBe(60 * MIN)
    expect(c.totalElapsedMs).toBe(10 * MIN + MIN + 2 * MIN)
  })

  it('a phase left without recorded time counts nothing, also once the retro ended', () => {
    const a = started([10, 15, 35], 3)
    const ended: AgendaState = { ...a, phases: a.phases.map((p, i) => (i === 1 ? { ...p, actualMs: 0 } : p)) }
    expect(phaseClock(ended, 0).totalElapsedMs).toBe(10 * MIN + 35 * MIN)
  })
})

describe('extending a phase', () => {
  it('borrows proportionally from later phases and keeps the total', () => {
    const a = extendPhase(started([10, 10, 5, 3]), 3 * MIN, true)
    // Rooms above the floor: 540, 240 and 120 s; 180 s taken in that proportion: 108, 48, 24.
    expect(a.phases.map((p) => p.plannedMs / 1000)).toEqual([780, 492, 252, 156])
    expect(a.phases.reduce((n, p) => n + p.plannedMs, 0)).toBe(28 * MIN)
  })

  it('never takes a later phase below the floor, and extends the total for the rest', () => {
    const a = extendPhase(started([5, 2, 1]), 5 * MIN, true)
    expect(a.phases.map((p) => p.plannedMs)).toEqual([10 * MIN, PHASE_FLOOR_MS, PHASE_FLOOR_MS])
    expect(a.phases.reduce((n, p) => n + p.plannedMs, 0)).toBe(12 * MIN)
  })

  it('extends the total when asked, and does nothing when not running', () => {
    expect(extendPhase(started([5, 5]), 2 * MIN, false).phases.map((p) => p.plannedMs)).toEqual([7 * MIN, 5 * MIN])
    const idle = newAgenda([{ kind: 'write', minutes: 5 }], ids())
    expect(extendPhase(idle, MIN, true)).toBe(idle)
  })

  it('property: borrowing keeps the total when later phases have room, keeps floors and whole seconds', () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 2, maxLength: 8 }), fc.integer({ min: 1, max: 30 }), (mins, extra) => {
      const before = started(mins)
      const after = extendPhase(before, extra * MIN, true)
      const sum = (x: AgendaState) => x.phases.reduce((n, p) => n + p.plannedMs, 0)
      const room = before.phases.slice(1).reduce((n, p) => n + Math.max(0, p.plannedMs - PHASE_FLOOR_MS), 0)
      expect(sum(after)).toBe(sum(before) + Math.max(0, extra * MIN - room))
      after.phases.slice(1).forEach((p, i) => {
        expect(p.plannedMs).toBeGreaterThanOrEqual(Math.min(PHASE_FLOOR_MS, before.phases[i + 1]!.plannedMs))
        expect(p.plannedMs % 1000).toBe(0)
      })
    }))
  })
})

describe('agenda commands', () => {
  it('start, pause, resume (pause not counted), next, end', () => {
    const h = harness()
    expect(h.run({ t: 'agenda.start' })).toEqual({ ok: false, error: 'invalid' })
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 3 }] })
    h.run({ t: 'agenda.start' })
    const t0 = h.now
    h.tick(MIN); h.run({ t: 'agenda.pause' })
    h.tick(10 * MIN); h.run({ t: 'agenda.start' })
    h.tick(MIN)
    expect(phaseClock(h.state.agenda!, h.now)).toMatchObject({ elapsedMs: 2 * MIN, paused: false })
    expect(h.state.agenda!.startedAt).toBe(t0 + 10 * MIN)
    expect(h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 1 }] })).toEqual({ ok: false, error: 'invalid' })
    h.run({ t: 'agenda.next' })
    expect(phaseClock(h.state.agenda!, h.now)).toMatchObject({ elapsedMs: 0, phase: { kind: 'vote' } })
    // The report needs the time actually spent: pauses excluded.
    expect(h.state.agenda!.phases[0]!.actualMs).toBe(2 * MIN)
    h.tick(4 * MIN); h.run({ t: 'agenda.pause' }); h.tick(MIN)
    h.run({ t: 'agenda.end' })
    expect(h.state.agenda!.current).toBe(2)
    expect(h.state.agenda!.phases[1]!.actualMs).toBe(4 * MIN)
    expect(h.run({ t: 'agenda.next' })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'agenda.pause' })).toEqual({ ok: false, error: 'invalid' })
  })

  it('validates phases, options, extend and clear', () => {
    const h = harness()
    expect(h.run({ t: 'agenda.set', phases: [] })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 500 }] })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'agenda.options', rules: false })).toEqual({ ok: false, error: 'not-found' })
    h.run({ t: 'agenda.set', phases: presetPhases(60), rules: true, autoPublish: false })
    h.run({ t: 'agenda.options', rules: false })
    expect([h.state.agenda!.rules, h.state.agenda!.autoPublish]).toEqual([false, false])
    expect(h.run({ t: 'agenda.extend', minutes: 3, borrow: true })).toEqual({ ok: false, error: 'invalid' })
    h.run({ t: 'agenda.start' })
    h.run({ t: 'agenda.extend', minutes: 3, borrow: true })
    expect(h.state.agenda!.phases.reduce((n, p) => n + p.plannedMs, 0)).toBe(60 * MIN)
    h.run({ t: 'board.reset' })
    expect(h.state.agenda!.current).toBe(-1)
    h.run({ t: 'agenda.clear' })
    expect(h.state.agenda).toBeNull()
  })
})

describe('phase rules', () => {
  it('allow only what the current phase is about, and everything without rules or outside the agenda', () => {
    const a = started([5, 5, 5, 5, 5], 2) // write
    expect(allowedInPhase(a, 'note.add')).toBe(true)
    expect(allowedInPhase(a, 'vote.add')).toBe(false)
    expect(allowedInPhase({ ...a, current: 4 }, 'vote.add')).toBe(true) // vote
    expect(allowedInPhase({ ...a, current: 4 }, 'note.add')).toBe(false)
    expect(allowedInPhase({ ...a, rules: false }, 'vote.add')).toBe(true)
    expect(allowedInPhase({ ...a, current: -1 }, 'vote.add')).toBe(true)
    expect(allowedInPhase(null, 'vote.add')).toBe(true)
  })
})

describe('voting override and go to closing (facilitator-controls-v2)', () => {
  const setup = () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'idea' })
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'group', minutes: 5 }, { kind: 'vote', minutes: 5 }, { kind: 'close', minutes: 5 }], rules: true })
    h.run({ t: 'agenda.start' })
    return { h }
  }

  it('closes voting by phase, opens it under the override, and drops the override at the next phase change', () => {
    const { h } = setup()
    const voting = () => allowedInPhase(h.state.agenda, 'vote.add')
    expect(voting()).toBe(false)
    expect(h.run({ t: 'agenda.voteOpen', on: true }).ok).toBe(true)
    expect(voting()).toBe(true)
    expect(allowedInPhase(h.state.agenda, 'note.add')).toBe(true)
    h.run({ t: 'agenda.next' })
    expect(h.state.agenda!.voteOpen).toBeUndefined()
    expect(voting()).toBe(false)
    h.run({ t: 'agenda.voteOpen', on: true })
    h.run({ t: 'agenda.prev' })
    expect(h.state.agenda!.voteOpen).toBeUndefined()
    h.run({ t: 'agenda.voteOpen', on: true })
    h.run({ t: 'agenda.voteOpen', on: false })
    expect(h.state.agenda!.voteOpen).toBeUndefined()
    expect(voting()).toBe(false)
    h.run({ t: 'agenda.voteOpen', on: true })
    h.run({ t: 'agenda.end' })
    expect(h.state.agenda!.voteOpen).toBeUndefined()
  })

  it('the override needs a running agenda', () => {
    const h = harness()
    expect(h.run({ t: 'agenda.voteOpen', on: true })).toEqual({ ok: false, error: 'invalid' })
  })

  it('go to closing jumps forward, records the time of the phase left and keeps skipped phases without time', () => {
    const { h } = setup()
    h.tick(2 * MIN)
    expect(h.run({ t: 'agenda.toClose' }).ok).toBe(true)
    const a = h.state.agenda!
    expect(a.current).toBe(3)
    expect(a.phases[0]!.actualMs).toBe(2 * MIN)
    expect(a.phases[1]!.actualMs).toBeUndefined()
    expect(a.phases[2]!.actualMs).toBeUndefined()
    // Already there: nothing changes. Not running: refused.
    expect(h.run({ t: 'agenda.toClose' }).ok).toBe(true)
    expect(h.state.agenda!.current).toBe(3)
    expect(harness().run({ t: 'agenda.toClose' })).toEqual({ ok: false, error: 'invalid' })
  })

  it('go to closing needs a close phase', () => {
    const h = harness()
    h.run({ t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 5 }], rules: true })
    h.run({ t: 'agenda.start' })
    expect(h.run({ t: 'agenda.toClose' })).toEqual({ ok: false, error: 'not-found' })
  })
})
