import { describe, expect, it } from 'vitest'
import { type AnnounceKey, newIds, summarizeAnnouncements } from '../src'

const say = (key: AnnounceKey, p: Record<string, string | number>) => `${key}:${JSON.stringify(p)}`

describe('summarizeAnnouncements', () => {
  it('says nothing for nothing', () => {
    expect(summarizeAnnouncements([], say)).toEqual([])
  })

  it('merges a burst of notes into one message per column, in order of appearance', () => {
    const items = [
      { kind: 'note' as const, column: 'Start' }, { kind: 'note' as const, column: 'Stop' },
      { kind: 'note' as const, column: 'Start' }, { kind: 'note' as const, column: 'Start' },
    ]
    expect(summarizeAnnouncements(items, say)).toEqual(['a11y.newNotes:{"n":3,"column":"Start"}', 'a11y.newNotes:{"n":1,"column":"Stop"}'])
  })

  it('keeps only the last phase change and says the reveal once', () => {
    const items = [
      { kind: 'phase' as const, phase: 'Write' }, { kind: 'revealed' as const }, { kind: 'phase' as const, phase: 'Group' }, { kind: 'revealed' as const },
    ]
    expect(summarizeAnnouncements(items, say)).toEqual(['a11y.phase:{"phase":"Group"}', 'a11y.revealed:{}'])
  })

  it('appends the detail of a phase change', () => {
    expect(summarizeAnnouncements([{ kind: 'phase', phase: 'Write', detail: 'Writing is open.' }], say)).toEqual(['a11y.phase:{"phase":"Write"}. Writing is open.'])
  })

  it('puts what changes the options first, then the notes', () => {
    const items = [{ kind: 'note' as const, column: 'Start' }, { kind: 'phase' as const, phase: 'Vote' }]
    expect(summarizeAnnouncements(items, say).map((m) => m.split(':')[0])).toEqual(['a11y.phase', 'a11y.newNotes'])
  })
})

describe('newIds', () => {
  it('is silent on the first load and lists only unseen ids afterwards', () => {
    expect(newIds(null, ['a', 'b'])).toEqual([])
    expect(newIds(new Set(['a']), ['a', 'b', 'c'])).toEqual(['b', 'c'])
    expect(newIds(new Set(['a', 'b']), ['a'])).toEqual([])
  })
})
