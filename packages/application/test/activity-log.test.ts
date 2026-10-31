import type { Snapshot } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { activityBetween, appendActivity, ACTIVITY_MAX } from '../src'

const base = (over: Record<string, unknown> = {}, agenda: Record<string, unknown> | null = null) => ({
  settings: { votingClosed: false }, agenda: agenda && { phases: [{ id: 'p0', kind: 'write', plannedMs: 1 }, { id: 'p1', kind: 'vote', plannedMs: 1 }], current: 0, startedAt: 0, pausedAt: null, rules: true, autoPublish: false, ...agenda },
  reveal: null, ...over,
}) as unknown as Snapshot

describe('activity between snapshots', () => {
  it('says nothing for the first snapshot or when nothing changed', () => {
    expect(activityBetween(null, base(), 1)).toEqual([])
    expect(activityBetween(base(), base(), 1)).toEqual([])
  })

  it('reports a phase start and the end of the agenda', () => {
    expect(activityBetween(base({}, { current: 0 }), base({}, { current: 1 }), 5)).toEqual([{ kind: 'phase.started', at: 5, phase: 'vote' }])
    expect(activityBetween(base({}, { current: 1 }), base({}, { current: 2 }), 6)).toEqual([{ kind: 'agenda.ended', at: 6 }])
  })

  it('reports pause and resume', () => {
    expect(activityBetween(base({}, { pausedAt: null }), base({}, { pausedAt: 3 }), 1)[0]?.kind).toBe('agenda.paused')
    expect(activityBetween(base({}, { pausedAt: 3 }), base({}, { pausedAt: null }), 1)[0]?.kind).toBe('agenda.resumed')
  })

  it('reports voting closing, reopening and a reveal countdown', () => {
    const closed = base({ settings: { votingClosed: true } })
    expect(activityBetween(base(), closed, 1).map((e) => e.kind)).toEqual(['voting.closed'])
    expect(activityBetween(closed, base(), 1).map((e) => e.kind)).toEqual(['voting.opened'])
    expect(activityBetween(base(), base({ reveal: { endsAt: 9 } }), 1).map((e) => e.kind)).toEqual(['reveal.started'])
  })
})

describe('append activity', () => {
  it('puts the newest first and caps the log', () => {
    const log = appendActivity([], [{ kind: 'voting.closed', at: 1 }, { kind: 'reveal.started', at: 1 }], 1)
    expect(log.map((e) => e.kind)).toEqual(['reveal.started', 'voting.closed'])
    const many = appendActivity(log, Array.from({ length: 60 }, (_, i) => ({ kind: 'voting.opened' as const, at: i })), 10)
    expect(many).toHaveLength(ACTIVITY_MAX)
  })
})
