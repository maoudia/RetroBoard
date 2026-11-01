import { type AgendaState, MIN } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { phaseStepper } from '../src'

const agenda = (current: number, startedAt = 0): AgendaState => ({
  phases: [
    { id: 'a', kind: 'checkin', plannedMs: 10 * MIN },
    { id: 'b', kind: 'write', plannedMs: 20 * MIN },
    { id: 'c', kind: 'vote', plannedMs: 30 * MIN },
  ],
  current, startedAt, pausedAt: null, rules: true, autoPublish: true,
})

describe('phaseStepper', () => {
  it('middle of the retro: earlier phases done, one current with its time left, the next named', () => {
    const s = phaseStepper(agenda(1, 10 * MIN), 15 * MIN)
    expect(s.steps.map((x) => x.state)).toEqual(['done', 'current', 'todo'])
    expect(s.steps[1]!.fill).toBeCloseTo(0.25)
    expect(s.current).toMatchObject({ kind: 'write', overtime: false })
    expect(s.current!.remainingMs).toBe(15 * MIN)
    expect(s.next).toBe('vote')
  })
  it('before the start nothing is current and the first phase is next', () => {
    const s = phaseStepper(agenda(-1), 0)
    expect(s.steps.every((x) => x.state === 'todo' && x.fill === 0)).toBe(true)
    expect(s.current).toBeNull()
    expect(s.next).toBe('checkin')
    expect(s.started).toBe(false)
  })
  it('the last phase has no next; an ended agenda is all done', () => {
    expect(phaseStepper(agenda(2, 0), 5 * MIN).next).toBeNull()
    const end = phaseStepper(agenda(3), 0)
    expect(end.ended).toBe(true)
    expect(end.steps.every((x) => x.state === 'done')).toBe(true)
    expect(end.current).toBeNull()
  })
  it('overtime keeps the segment full and flags it', () => {
    const s = phaseStepper(agenda(0, 0), 15 * MIN)
    expect(s.steps[0]!.fill).toBe(1)
    expect(s.current!.overtime).toBe(true)
  })
})

describe('phase stepper: real time spent (agenda-clock-v2)', () => {
  it('finished phases carry their recorded time, a skipped one is flagged, the current one runs, the next has none', () => {
    const a: AgendaState = { ...agenda(2, 0), phases: agenda(2, 0).phases.map((p, i) => (i === 0 ? { ...p, actualMs: 4 * MIN } : p)) }
    const s = phaseStepper(a, 90_000)
    expect(s.steps.map((x) => x.spentMs)).toEqual([4 * MIN, 0, 90_000])
    expect(s.steps.map((x) => x.skipped)).toEqual([false, true, false])
  })
})
