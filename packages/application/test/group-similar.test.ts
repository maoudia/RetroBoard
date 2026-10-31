import type { SnapshotNote } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { groupSimilarPlan } from '../src'

const note = (id: string, text: string, extra: Partial<SnapshotNote> = {}): SnapshotNote => ({
  id, columnId: 'c1', text, color: 0, author: null, groupId: null, votes: null, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...extra,
})

describe('group similar ideas plan', () => {
  it('chains look-alike ideas and labels the cluster with the shortest one', () => {
    const notes = [note('a', 'Daily meeting is too long'), note('b', 'daily meeting too long and boring'), note('c', 'Better coffee')]
    expect(groupSimilarPlan({ notes }, 'c1')).toEqual([{ label: 'Daily meeting is too long', noteIds: ['a', 'b'] }])
  })

  it('ignores clustered, frozen, other-column and unrelated ideas', () => {
    const notes = [
      note('a', 'Slow deployments'), note('b', 'Slow deployments', { groupId: 'g' }), note('c', 'Slow deployments', { frozen: true }),
      note('d', 'Slow deployments', { columnId: 'c2' }), note('e', 'Great team spirit'),
    ]
    expect(groupSimilarPlan({ notes }, 'c1')).toEqual([])
  })
})
