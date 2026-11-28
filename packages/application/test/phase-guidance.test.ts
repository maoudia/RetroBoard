import { type AgendaState, type PhaseKind, PHASE_KINDS } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { reviewState, writingHidden } from '../src'

const action = (status: string, carriedFrom: string | null) => ({ status, carriedFrom }) as never
const agenda = (current: number, rules = true, kinds: PhaseKind[] = [...PHASE_KINDS]): AgendaState => ({
  phases: kinds.map((kind, i) => ({ id: `p${i}`, kind, plannedMs: 60_000 })),
  current, startedAt: 0, pausedAt: null, rules, autoPublish: true,
})
const snap = (over: { hide?: boolean; agenda?: AgendaState | null; notes?: number }) => ({
  settings: over.hide === undefined ? {} : { hideWritingOnReturn: over.hide },
  agenda: over.agenda === undefined ? agenda(1) : over.agenda,
  notes: Array.from({ length: over.notes ?? 6 }, () => ({})),
}) as never

describe('reviewState', () => {
  it('is none without carried actions, even with plain actions', () => {
    expect(reviewState({ actions: [] })).toBe('none')
    expect(reviewState({ actions: [action('todo', null)] })).toBe('none')
  })
  it('is open when one carried action is open', () => {
    expect(reviewState({ actions: [action('done', 'A'), action('doing', 'A')] })).toBe('open')
    expect(reviewState({ actions: [action('blocked', 'A')] })).toBe('open')
  })
  it('is allDone when every carried action is done or dropped', () => {
    expect(reviewState({ actions: [action('done', 'A'), action('dropped', 'A'), action('todo', null)] })).toBe('allDone')
  })
})

describe('writingHidden', () => {
  it('hides when back before Write with ideas', () => {
    expect(writingHidden(snap({ agenda: agenda(0) }))).toBe(true)
    expect(writingHidden(snap({}))).toBe(true)
  })
  it('is off on the first pass without ideas', () => {
    expect(writingHidden(snap({ notes: 0 }))).toBe(false)
  })
  it('is off in Write and later phases', () => {
    for (let i = 2; i < PHASE_KINDS.length; i++) expect(writingHidden(snap({ agenda: agenda(i) }))).toBe(false)
  })
  it('is off with rules off, no running agenda, or the option off', () => {
    expect(writingHidden(snap({ agenda: agenda(1, false) }))).toBe(false)
    expect(writingHidden(snap({ agenda: null }))).toBe(false)
    expect(writingHidden(snap({ agenda: agenda(-1) }))).toBe(false)
    expect(writingHidden(snap({ hide: false }))).toBe(false)
    expect(writingHidden(snap({ hide: true }))).toBe(true)
  })
  it('is off when the agenda has no Write phase', () => {
    expect(writingHidden(snap({ agenda: agenda(0, true, ['checkin', 'review', 'close']) }))).toBe(false)
  })
})
