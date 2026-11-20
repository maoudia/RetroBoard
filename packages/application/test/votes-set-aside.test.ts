import { describe, expect, it } from 'vitest'
import type { Snapshot } from '@retroboard/domain'
import { votesSetAside } from '../src'

const view = (votes: (number | null)[], groupVotes: number | null = 0): Pick<Snapshot, 'columns' | 'notes' | 'groups'> => ({
  columns: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as Snapshot['columns'],
  notes: votes.map((v, i) => ({ id: `n${i}`, columnId: i === 0 ? 'a' : 'c', groupId: null, votes: v })) as Snapshot['notes'],
  groups: [{ id: 'g', columnId: 'b', votes: groupVotes }] as Snapshot['groups'],
})

describe('votesSetAside', () => {
  it('counts the votes on ideas whose new column is not votable, clusters included', () => {
    expect(votesSetAside(view([2, 3], 4), [false, true, true])).toBe(2)
    expect(votesSetAside(view([2, 3], 4), [true, false, true])).toBe(4)
  })

  it('follows the column mapping when the new format has fewer columns', () => {
    expect(votesSetAside(view([2, 3], 4), [true, false])).toBe(7)
  })

  it('is zero when every new column votes and null while counts are hidden', () => {
    expect(votesSetAside(view([2, 3], 4), [true, true, true])).toBe(0)
    expect(votesSetAside(view([null, 3]), [false, true, true])).toBeNull()
  })
})
