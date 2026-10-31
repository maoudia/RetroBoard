import type { SnapshotNote } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { groupByAuthorPlan } from '../src'

const note = (id: string, author: string | null, extra: Partial<SnapshotNote> = {}): SnapshotNote => ({
  id, columnId: 'c1', text: id, color: 0, author, groupId: null, votes: null, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...extra,
})

describe('group by author plan', () => {
  it('plans one cluster per author with two or more loose ideas, in first-idea order', () => {
    const notes = [note('a1', 'Alice'), note('b1', 'Bob'), note('a2', 'alice '), note('b2', 'Bob'), note('c1', 'Cy')]
    expect(groupByAuthorPlan({ notes }, 'c1')).toEqual([
      { author: 'Alice', noteIds: ['a1', 'a2'] },
      { author: 'Bob', noteIds: ['b1', 'b2'] },
    ])
  })

  it('leaves anonymous, clustered, frozen and other-column ideas alone', () => {
    const notes = [
      note('x1', null), note('x2', null), note('g1', 'Dan', { groupId: 'g' }), note('g2', 'Dan'),
      note('f1', 'Eve', { frozen: true }), note('f2', 'Eve'), note('o1', 'Fay', { columnId: 'c2' }), note('o2', 'Fay', { columnId: 'c2' }),
    ]
    expect(groupByAuthorPlan({ notes }, 'c1')).toEqual([])
  })
})
