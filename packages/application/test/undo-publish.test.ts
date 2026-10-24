import { describe, expect, it } from 'vitest'
import type { SnapshotNote } from '@retroboard/domain'
import { canUndo, publishedNotes, UNDO_WINDOW_MS } from '../src'

const note = (id: string, o: Partial<SnapshotNote> = {}): SnapshotNote => ({
  id, columnId: 'c1', text: 'idea', color: 0, author: null, groupId: null, votes: 0, voted: false, myVotes: 0, votable: true, mine: true, createdAt: 100, ...o,
})

describe('undo publish', () => {
  it('finds the notes a publication created: mine, same column and text, not older', () => {
    const notes = [
      note('old', { createdAt: 50 }),
      note('other', { mine: false }),
      note('elsewhere', { columnId: 'c2' }),
      note('n1'),
      note('n2', { text: 'second', createdAt: 101 }),
    ]
    expect(publishedNotes(notes, [{ columnId: 'c1', text: 'idea', color: 0 }, { columnId: 'c1', text: 'second', color: 1 }], 100).map((n) => n.id)).toEqual(['n1', 'n2'])
  })

  it('takes one note per item, oldest first, so duplicates are all found once', () => {
    const notes = [note('b', { createdAt: 102 }), note('a', { createdAt: 101 }), note('c', { createdAt: 103 })]
    const items = [{ columnId: 'c1', text: 'idea', color: 0 }, { columnId: 'c1', text: 'idea', color: 0 }]
    expect(publishedNotes(notes, items, 100).map((n) => n.id)).toEqual(['a', 'b'])
    expect(publishedNotes([note('x', { createdAt: 5 }), note('w', { createdAt: 5 })], items.slice(0, 1), 0).map((n) => n.id)).toEqual(['w'])
  })

  it('returns what it found when some notes are gone already', () => {
    expect(publishedNotes([], [{ columnId: 'c1', text: 'idea', color: 0 }], 0)).toEqual([])
  })

  it('offers undo for 10 seconds only', () => {
    expect([canUndo(1_000, 1_000), canUndo(1_000, 1_000 + UNDO_WINDOW_MS - 1), canUndo(1_000, 1_000 + UNDO_WINDOW_MS), canUndo(1_000, 999)]).toEqual([true, true, false, false])
  })
})
