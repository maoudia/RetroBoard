import { type AgendaState, MIN } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { sampleAgenda, sampleCountdown, type TimerSample, timerEvents } from '../src'

const s = (remainingMs: number, over: Partial<TimerSample> = {}): TimerSample => ({ key: 'k', remainingMs, paused: false, totalMs: 5 * MIN, ...over })

describe('timerEvents', () => {
  it('fires nothing without a previous sample (first load, reconnect after the end)', () => {
    expect(timerEvents(null, s(-5000))).toEqual([])
    expect(timerEvents(null, s(30_000))).toEqual([])
    expect(timerEvents(s(1000), null)).toEqual([])
  })

  it('warns once when crossing one minute, then ends once', () => {
    expect(timerEvents(s(61_000), s(59_000))).toEqual(['warning'])
    expect(timerEvents(s(59_000), s(58_000))).toEqual([])
    expect(timerEvents(s(1000), s(-200))).toEqual(['ended'])
    expect(timerEvents(s(-200), s(-1200))).toEqual([])
  })

  it('does not repeat an event already past its threshold', () => {
    expect(timerEvents(s(0), s(-100))).toEqual([])
    expect(timerEvents(s(60_000), s(59_000))).toEqual([])
    expect(timerEvents(s(70_000), s(65_000))).toEqual([])
    expect(timerEvents(s(61_000), s(0))).toEqual(['ended'])
  })

  it('fires on the exact thresholds', () => {
    expect(timerEvents(s(60_001), s(60_000))).toEqual(['warning'])
    expect(timerEvents(s(1), s(0))).toEqual(['ended'])
  })

  it('reports only the end when a tick jumps over both thresholds', () => {
    expect(timerEvents(s(120_000), s(-3000))).toEqual(['ended'])
  })

  it('does not warn on a run shorter than the warning', () => {
    expect(timerEvents(s(61_000, { totalMs: 60_000 }), s(59_000, { totalMs: 60_000 }))).toEqual([])
    expect(timerEvents(s(30_000, { totalMs: 30_000 }), s(-1, { totalMs: 30_000 }))).toEqual(['ended'])
  })

  it('stays silent while paused and when the run changes', () => {
    expect(timerEvents(s(1000, { paused: true }), s(-1000, { paused: true }))).toEqual([])
    expect(timerEvents(s(1000), s(-1000, { paused: true }))).toEqual([])
    expect(timerEvents(s(1000, { key: 'a' }), s(-1000, { key: 'b' }))).toEqual([])
  })

  it('re-arms after time is added', () => {
    const ended = timerEvents(s(500), s(-100))
    const extended = timerEvents(s(-100), s(2 * MIN))
    const again = timerEvents(s(2 * MIN), s(-1))
    expect([ended, extended, again]).toEqual([['ended'], [], ['ended']])
    expect(timerEvents(s(2 * MIN), s(59_000))).toEqual(['warning'])
  })
})

describe('samples', () => {
  const agenda = (over: Partial<AgendaState> = {}): AgendaState => ({
    phases: [{ id: 'p0', kind: 'write', plannedMs: 5 * MIN }, { id: 'p1', kind: 'group', plannedMs: 5 * MIN }],
    current: 0, startedAt: 1000, pausedAt: null, rules: true, autoPublish: true, ...over,
  })

  it('samples the running phase and changes key with the phase', () => {
    expect(sampleAgenda(agenda(), 1000 + MIN)).toEqual({ key: 'agenda:p0:0', remainingMs: 4 * MIN, paused: false, totalMs: 5 * MIN })
    expect(sampleAgenda(agenda({ current: 1 }), 1000)?.key).toBe('agenda:p1:1')
    expect(sampleAgenda(agenda({ pausedAt: 5000 }), 99_999_999)?.paused).toBe(true)
    expect(sampleAgenda(agenda({ current: -1 }), 0)).toBeNull()
    expect(sampleAgenda(agenda({ current: 2 }), 0)).toBeNull()
    expect(sampleAgenda(null, 0)).toBeNull()
  })

  it('goes from the agenda phase to its end through events', () => {
    const a = agenda()
    const ticks = [3 * MIN, 4 * MIN + 1000, 5 * MIN - 1000, 5 * MIN + 1000].map((t) => sampleAgenda(a, 1000 + t))
    const out = ticks.slice(1).map((next, i) => timerEvents(ticks[i]!, next))
    expect(out).toEqual([['warning'], [], ['ended']])
  })

  it('samples the shared countdown', () => {
    expect(sampleCountdown({ running: true, endsAt: 10_000, remaining: 0, length: 60_000 }, 4000)).toEqual({ key: 'countdown:60000', remainingMs: 6000, paused: false, totalMs: 60_000 })
    expect(sampleCountdown({ running: false, endsAt: 0, remaining: 20_000, length: 60_000 }, 0)?.paused).toBe(true)
    expect(sampleCountdown({ running: false, endsAt: 0, remaining: 0, length: 60_000 }, 0)).toBeNull()
    expect(sampleCountdown(undefined, 0)).toBeNull()
  })
})
