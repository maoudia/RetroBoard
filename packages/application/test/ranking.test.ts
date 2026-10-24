import { describe, expect, it } from 'vitest'
import type { SnapshotGroup, SnapshotNote } from '@retroboard/domain'
import { buildRanking, podium } from '../src'

const note = (id: string, votes: number | null, groupId: string | null = null): SnapshotNote => ({
  id, columnId: 'c1', text: `idea ${id}`, color: 0, author: null, groupId, votes, voted: false, myVotes: 0, votable: !groupId, mine: false, createdAt: 0,
})
const cluster = (id: string, votes: number | null, title: string | null = null): SnapshotGroup => ({ id, columnId: 'c1', title, votes, myVotes: 0, votable: true })

describe('ranking', () => {
  it('uses competition ranking: ties share a rank, the next rank skips (1, 2, 2, 4)', () => {
    const r = buildRanking({ notes: [note('a', 5), note('b', 3), note('c', 3), note('d', 1)], groups: [] })!
    expect(r.map((x) => [x.id, x.rank])).toEqual([['a', 1], ['b', 2], ['c', 2], ['d', 4]])
  })

  it('ranks clusters as one idea (title or first note) next to loose notes, by board order on ties', () => {
    const r = buildRanking({ notes: [note('a', 9, 'g'), note('b', 0, 'g'), note('c', 4), note('d', 4)], groups: [cluster('g', 4), cluster('empty', 7)] })!
    expect(r.map((x) => [x.kind, x.id, x.rank, x.size])).toEqual([['cluster', 'g', 1, 2], ['note', 'c', 1, 1], ['note', 'd', 1, 1]])
    expect(r[0]!.title).toBe('idea a')
    expect(buildRanking({ notes: [note('a', 1, 'g')], groups: [cluster('g', 1, 'Named')] })![0]!.title).toBe('Named')
  })

  it('returns nothing while counts are hidden', () => {
    expect(buildRanking({ notes: [note('a', null)], groups: [] })).toBeNull()
    expect(buildRanking({ notes: [note('a', 1, 'g')], groups: [cluster('g', null)] })).toBeNull()
    expect(buildRanking({ notes: [], groups: [] })).toEqual([])
  })

  it('podium keeps ranks 1 to 3 with ties and skips items without votes', () => {
    const r = buildRanking({ notes: [note('a', 5), note('b', 3), note('c', 3), note('d', 2), note('e', 0)], groups: [] })!
    expect(podium(r).map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(podium(buildRanking({ notes: [note('x', 0)], groups: [] })!)).toEqual([])
  })
})
