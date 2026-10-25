import { type AgendaState, MIN } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { ringProgress } from '../src'

const agenda = (current: number, startedAt = 0, pausedAt: number | null = null): AgendaState => ({
  phases: [
    { id: 'a', kind: 'checkin', plannedMs: 10 * MIN },
    { id: 'b', kind: 'write', plannedMs: 10 * MIN },
    { id: 'c', kind: 'vote', plannedMs: 40 * MIN },
  ],
  current, startedAt, pausedAt, rules: true, autoPublish: true,
})

describe('ringProgress', () => {
  it('middle of Write: outer one third, current half', () => {
    const a: AgendaState = { ...agenda(1, 0), phases: [
      { id: 'a', kind: 'checkin', plannedMs: 10 * MIN },
      { id: 'b', kind: 'write', plannedMs: 20 * MIN },
      { id: 'c', kind: 'vote', plannedMs: 30 * MIN },
    ] }
    const r = ringProgress(a, 10 * MIN)
    expect(r.outer.fill).toBeCloseTo(1 / 3)
    expect(r.current?.fill).toBeCloseTo(0.5)
    expect(r.current?.kind).toBe('write')
    expect(r.next?.kind).toBe('vote')
    expect(r.next?.fill).toBe(0)
  })

  it('overtime: full turn, then the overtime lap, never negative', () => {
    const r = ringProgress(agenda(1, 0), 12 * MIN) // 12 min into a 10 min phase
    expect(r.current?.fill).toBe(1)
    expect(r.current?.complete).toBe(true)
    expect(r.current?.over).toBeCloseTo(0.2)
    expect(r.overtime).toBe(true)
  })

  it('caps the overtime lap at one extra turn', () => {
    expect(ringProgress(agenda(1, 0), 50 * MIN).current?.over).toBe(1)
  })

  it('before the start: empty rings, first phase is next', () => {
    const r = ringProgress(agenda(-1), 5 * MIN)
    expect(r.outer.fill).toBe(0)
    expect(r.current).toBeNull()
    expect(r.next?.kind).toBe('checkin')
  })

  it('after the end: outer closed, nothing current or next', () => {
    const r = ringProgress(agenda(3), 5 * MIN)
    expect(r.ended).toBe(true)
    expect(r.outer.complete).toBe(true)
    expect(r.current).toBeNull()
    expect(r.next).toBeNull()
  })

  it('paused: elapsed freezes at the pause time', () => {
    const r = ringProgress(agenda(0, 0, 3 * MIN), 30 * MIN)
    expect(r.paused).toBe(true)
    expect(r.current?.turns).toBeCloseTo(0.3)
  })

  it('clock skew before the start never gives a negative ring', () => {
    expect(ringProgress(agenda(0, 5 * MIN), 0).current?.fill).toBe(0)
  })
})
