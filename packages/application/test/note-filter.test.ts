import { describe, expect, it } from 'vitest'
import type { SnapshotGroup, SnapshotNote } from '@retroboard/domain'
import { type ColumnItem, EMPTY_FILTER, filterItems, isFilterActive, matchesFilter, similarIdeas, similarity, tokens } from '../src'

const note = (id: string, o: Partial<SnapshotNote> = {}): SnapshotNote => ({
  id, columnId: 'c1', text: 'idea', color: 0, author: null, groupId: null, votes: 0, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 1, ...o,
})
const loose = (n: SnapshotNote): ColumnItem => ({ kind: 'note', key: n.id, note: n, votes: n.votes ?? 0 })
const cluster = (title: string, notes: SnapshotNote[], votes = 0): ColumnItem => ({
  kind: 'group', key: 'g', group: { id: 'g', title } as unknown as SnapshotGroup, notes, votes, title,
})

describe('note filter', () => {
  it('matches text without case or accents, colours, author and votes', () => {
    const n = note('a', { text: 'Déploiement lent', color: 2, author: 'Ana', votes: 1 })
    expect(matchesFilter(n, { ...EMPTY_FILTER, text: ' DEPLOIEMENT ' })).toBe(true)
    expect(matchesFilter(n, { ...EMPTY_FILTER, text: 'rapide' })).toBe(false)
    expect(matchesFilter(n, { ...EMPTY_FILTER, colors: [1, 2] })).toBe(true)
    expect(matchesFilter(n, { ...EMPTY_FILTER, colors: [1] })).toBe(false)
    expect(matchesFilter(n, { ...EMPTY_FILTER, author: 'Ana' })).toBe(true)
    expect(matchesFilter(n, { ...EMPTY_FILTER, author: 'Bob' })).toBe(false)
    expect(matchesFilter(n, { ...EMPTY_FILTER, voted: true })).toBe(true)
    expect(matchesFilter(note('b'), { ...EMPTY_FILTER, voted: true })).toBe(false)
    // Hidden counts: my own vote still counts as "has votes" for me.
    expect(matchesFilter(note('c', { votes: null, voted: true }), { ...EMPTY_FILTER, voted: true })).toBe(true)
    expect(matchesFilter(note('d', { votes: null }), { ...EMPTY_FILTER, voted: true })).toBe(false)
  })

  it('knows when it is active', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false)
    expect(isFilterActive({ ...EMPTY_FILTER, text: '  ' })).toBe(false)
    expect([{ text: 'x' }, { colors: [1] }, { author: 'A' }, { voted: true }].every((p) => isFilterActive({ ...EMPTY_FILTER, ...p }))).toBe(true)
  })

  it('keeps everything without a filter, and filters loose notes', () => {
    const items = [loose(note('a', { text: 'CI' })), loose(note('b', { text: 'Pairing' }))]
    expect(filterItems(items, EMPTY_FILTER)).toEqual(items)
    expect(filterItems(items, { ...EMPTY_FILTER, text: 'pair' }).map((i) => i.key)).toEqual(['b'])
  })

  it('keeps a cluster by its title (all notes) or by its matching notes only', () => {
    const c = cluster('Tooling', [note('a', { text: 'Slow CI' }), note('b', { text: 'Flaky tests' })])
    const byTitle = filterItems([c], { ...EMPTY_FILTER, text: 'tool' })[0] as Extract<ColumnItem, { kind: 'group' }>
    expect(byTitle.notes.map((n) => n.id)).toEqual(['a', 'b'])
    const byNote = filterItems([c], { ...EMPTY_FILTER, text: 'flaky' })[0] as Extract<ColumnItem, { kind: 'group' }>
    expect(byNote.notes.map((n) => n.id)).toEqual(['b'])
    expect(filterItems([c], { ...EMPTY_FILTER, text: 'nothing' })).toEqual([])
  })

  it('"has votes" keeps a cluster with a score, whatever its notes', () => {
    const notes = [note('a'), note('b')]
    expect(filterItems([cluster('T', notes, 2)], { ...EMPTY_FILTER, voted: true })).toHaveLength(1)
    expect(filterItems([cluster('T', notes, 0)], { ...EMPTY_FILTER, voted: true })).toHaveLength(0)
  })
})

describe('similar ideas', () => {
  it('tokens ignore case, accents, stop words and plural s', () => {
    expect([...tokens('Les Tests sont LENTS en CI')]).toEqual(['test', 'lent', 'ci'])
    expect(tokens('the a of').size).toBe(0)
  })

  it('scores shared meaningful words over the shorter idea', () => {
    expect(similarity('CI is slow', 'Slow CI')).toBe(1)
    expect(similarity('Slow CI builds', 'The CI is slow')).toBe(1)
    expect(similarity('Slow CI builds', 'Fast deploys')).toBe(0)
    expect(similarity('', 'x')).toBe(0)
  })

  it('finds look-alikes in the same column, most similar first', () => {
    const notes = [
      note('same', { text: 'Slow CI' }),
      note('half', { text: 'CI flaky and long queue', createdAt: 2 }),
      note('other-col', { text: 'Slow CI', columnId: 'c2' }),
      note('unrelated', { text: 'Great pairing' }),
    ]
    expect(similarIdeas('CI is slow', notes, 'c1').map((n) => n.id)).toEqual(['same'])
    expect(similarIdeas('the', notes, 'c1')).toEqual([])
    expect(similarIdeas('slow', [note('x', { text: 'slow' }), note('y', { text: 'slow', createdAt: 0 })], 'c1', 1).map((n) => n.id)).toEqual(['y'])
  })
})
