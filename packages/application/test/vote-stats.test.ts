import { describe, expect, it } from 'vitest'
import type { SnapshotGroup, SnapshotNote } from '@retroboard/domain'
import { voteStats } from '../src'

const note = (id: string, columnId: string, votes: number | null, groupId: string | null = null): SnapshotNote => ({
  id, columnId, text: `idea ${id}`, color: 0, author: null, groupId, votes, voted: false, myVotes: 0, votable: !groupId, mine: false, createdAt: 0,
})
const col = (id: string) => ({ id, title: id }) as never
const snap = (notes: SnapshotNote[], groups: SnapshotGroup[] = [], voteLimit = 5) =>
  ({ notes, groups, columns: [col('c1'), col('c2')], settings: { voteLimit } }) as never

describe('voteStats', () => {
  it('returns null while counts are hidden', () => {
    expect(voteStats(snap([note('a', 'c1', null)]))).toBeNull()
  })

  it('totals votes, shares per column and top ideas with ties flagged', () => {
    const s = voteStats(snap([note('a', 'c1', 6), note('b', 'c1', 6), note('c', 'c2', 4), note('d', 'c2', 0)]), 4)!
    expect(s.totalVotes).toBe(16)
    expect(s.perColumn).toEqual([{ columnId: 'c1', votes: 12, share: 0.75 }, { columnId: 'c2', votes: 4, share: 0.25 }])
    expect(s.top.map((t) => [t.id, t.tied, t.ratio])).toEqual([['a', true, 1], ['b', true, 1], ['c', false, 4 / 6]])
    expect(s.votedIdeas).toBe(3)
    expect(s.votesAvailable).toBe(20)
    expect(s.usedShare).toBeCloseTo(0.8)
  })

  it('keeps only the ten best ideas', () => {
    const notes = Array.from({ length: 14 }, (_, i) => note(`n${i}`, 'c1', 14 - i))
    expect(voteStats(snap(notes))!.top).toHaveLength(10)
  })

  it('participation is unknown without participants and capped at 100%', () => {
    expect(voteStats(snap([note('a', 'c1', 3)]))!.usedShare).toBeNull()
    expect(voteStats(snap([note('a', 'c1', 30)]), 1)!.usedShare).toBe(1)
  })

  it('spread: concentrated when the top three hold 70% or more', () => {
    expect(voteStats(snap([note('a', 'c1', 5), note('b', 'c1', 4), note('c', 'c1', 3), note('d', 'c1', 2)]))!.spread).toBe('concentrated')
    expect(voteStats(snap(['a', 'b', 'c', 'd', 'e'].map((id) => note(id, 'c1', 2))))!.spread).toBe('balanced')
  })

  it('no votes at all: empty charts, no spread, no division by zero', () => {
    const s = voteStats(snap([note('a', 'c1', 0)]), 3)!
    expect(s.top).toEqual([])
    expect(s.spread).toBeNull()
    expect(s.perColumn.every((c) => c.share === 0)).toBe(true)
  })

  it('up and down style: totals ups and downs, ties need the same ups, no budget', () => {
    const ud = (id: string, votes: number, ups: number, downs: number): SnapshotNote => ({ ...note(id, 'c1', votes), ups, downs })
    const input = { notes: [ud('a', 1, 2, 1), ud('b', 1, 1, 0), ud('c', -1, 0, 1)], groups: [], columns: [col('c1')], settings: { voteLimit: 5, voteStyle: 'updown' } } as never
    const s = voteStats(input, 4)!
    expect([s.totalUps, s.totalDowns, s.totalVotes]).toEqual([3, 2, 1])
    expect(s.votesAvailable).toBeNull()
    expect(s.top.map((t) => [t.id, t.tied])).toEqual([['a', false], ['b', false]])
    expect(voteStats(snap([note('a', 'c1', 1)]))!.totalUps).toBeNull()
  })
})
