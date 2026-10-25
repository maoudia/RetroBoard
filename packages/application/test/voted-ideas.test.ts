import type { AgendaState, Snapshot } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { ownerChoices, VOTED_SORTS, votedIdeas, votingOver } from '../src'

const note = (id: string, columnId: string, votes: number | null, over: Partial<Snapshot['notes'][number]> = {}): Snapshot['notes'][number] => ({
  id, columnId, text: `text ${id}`, color: 0, author: null, groupId: null, votes, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...over,
})
const settings = (over: Partial<Snapshot['settings']> = {}) => ({ secretVoting: false, votingClosed: true, ...over }) as Snapshot['settings']
const agenda = (current: number): AgendaState => ({
  phases: ['write', 'vote', 'actions'].map((kind, i) => ({ id: `p${i}`, kind: kind as 'write', plannedMs: 60_000 })),
  current, startedAt: 0, pausedAt: null, rules: true, autoPublish: true,
})
const view = (notes: Snapshot['notes'], over: { settings?: Snapshot['settings']; agenda?: AgendaState | null; groups?: Snapshot['groups'] } = {}) => ({
  settings: over.settings ?? settings(), agenda: over.agenda ?? null, notes, groups: over.groups ?? [],
})

describe('votingOver', () => {
  it('needs readable votes and a finished vote', () => {
    expect(votingOver({ settings: settings(), agenda: null })).toBe(true)
    expect(votingOver({ settings: settings({ votingClosed: false }), agenda: null })).toBe(false)
  })
  it('never while a secret vote is open, even past the Vote phase', () => {
    expect(votingOver({ settings: settings({ secretVoting: true, votingClosed: false }), agenda: agenda(2) })).toBe(false)
    expect(votingOver({ settings: settings({ secretVoting: true, votingClosed: true }), agenda: agenda(1) })).toBe(true)
  })
  it('handles a Vote phase placed first and the sort list', () => {
    const first = (current: number): AgendaState => ({ ...agenda(current), phases: [{ id: 'v', kind: 'vote', plannedMs: 1 }, { id: 'w', kind: 'write', plannedMs: 1 }] })
    const open = settings({ votingClosed: false })
    expect(votingOver({ settings: open, agenda: first(0) })).toBe(false)
    expect(votingOver({ settings: open, agenda: first(1) })).toBe(true)
    expect(VOTED_SORTS).toEqual(['votes', 'column', 'newest', 'author'])
  })

  it('follows the agenda when voting is not explicitly closed', () => {
    const open = settings({ votingClosed: false })
    expect(votingOver({ settings: open, agenda: agenda(0) })).toBe(false)
    expect(votingOver({ settings: open, agenda: agenda(1) })).toBe(false)
    expect(votingOver({ settings: open, agenda: agenda(2) })).toBe(true)
    expect(votingOver({ settings: open, agenda: agenda(3) })).toBe(true)
    expect(votingOver({ settings: open, agenda: { ...agenda(2), phases: [{ id: 'x', kind: 'write', plannedMs: 1 }] } })).toBe(false)
  })
})

describe('votedIdeas', () => {
  const notes = [
    note('a', 'c1', 2, { author: 'Zoe', createdAt: 40 }),
    note('b', 'c2', 5, { author: 'Adam', createdAt: 30 }),
    note('c', 'c1', 5, { author: null, createdAt: 20 }),
    note('d', 'c2', 0, { author: 'adam2', createdAt: 5 }),
  ]
  const order = ['c1', 'c2']

  it('is null while voting is not over or counts are hidden', () => {
    expect(votedIdeas(view(notes, { settings: settings({ votingClosed: false }) }))).toBeNull()
    expect(votedIdeas(view([note('a', 'c1', null)]))).toBeNull()
  })

  it('sorts by votes by default, ties keep the board order', () => {
    expect(votedIdeas(view(notes))!.map((i) => i.id)).toEqual(['b', 'c', 'a', 'd'])
    expect(votedIdeas(view(notes))!.map((i) => i.rank)).toEqual([1, 1, 3, 4])
  })

  it('sorts by column then votes', () => {
    expect(votedIdeas(view(notes), 'column', order)!.map((i) => i.id)).toEqual(['c', 'a', 'b', 'd'])
    expect(votedIdeas(view(notes), 'column', ['c2', 'c1'])!.map((i) => i.id)).toEqual(['b', 'd', 'c', 'a'])
    // A column missing from the order goes last.
    expect(votedIdeas(view(notes), 'column', ['c2'])!.map((i) => i.id)).toEqual(['b', 'd', 'c', 'a'])
    expect(votedIdeas(view(notes), 'column')!.map((i) => i.id)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('sorts newest first and by author with anonymous last', () => {
    expect(votedIdeas(view(notes), 'newest')!.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(votedIdeas(view(notes), 'author')!.map((i) => i.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('lists a cluster as one idea with its newest note date', () => {
    const grouped = [note('a', 'c1', 1, { groupId: 'g', createdAt: 10 }), note('b', 'c1', 1, { groupId: 'g', createdAt: 99 }), note('c', 'c1', 0, { createdAt: 50 }), note('z', 'c1', 0, { createdAt: 500 })]
    const groups = [{ id: 'g', columnId: 'c1', title: 'Cluster', votes: 3, myVotes: 0, votable: true }]
    const ideas = votedIdeas(view(grouped, { groups }), 'newest')!
    expect(ideas.map((i) => [i.id, i.kind, i.createdAt, i.author])).toEqual([['z', 'note', 500, null], ['g', 'cluster', 99, null], ['c', 'note', 50, null]])
  })

  it('does not mutate or leak: same input, same output', () => {
    const v = view(notes)
    expect(votedIdeas(v, 'author')).toEqual(votedIdeas(v, 'author'))
    expect(notes.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('ownerChoices', () => {
  const peers = [{ name: 'Bob', me: false }, { name: 'Carol', me: false }, { name: null, me: false }, { name: 'Dan', me: false, hidden: true }, { name: 'Alice', me: true }, { name: 'bob', me: false }]
  const actions = [{ owner: 'Erin' }, { owner: 'Bob' }, { owner: '' }, { owner: 'Frank' }] as Snapshot['actions']

  it('lists connected shown names first, anonymous and hidden excluded, no duplicates', () => {
    expect(ownerChoices({ peers, actions: [] }).connected).toEqual(['Bob', 'Carol', 'Alice'])
  })

  it('then the owners already used, without repeating connected ones', () => {
    expect(ownerChoices({ peers, actions }).used).toEqual(['Erin', 'Frank'])
    expect(ownerChoices({ peers, actions }, '', ['Gina', 'erin']).used).toEqual(['Erin', 'Frank', 'Gina'])
  })

  it('keeps the connected section fixed while filtering the rest by the typed text', () => {
    const c = ownerChoices({ peers, actions }, 'fr')
    expect(c.connected).toEqual(['Bob', 'Carol', 'Alice'])
    expect(c.used).toEqual(['Frank'])
    expect(ownerChoices({ peers, actions }, 'ÉR').used).toEqual(['Erin'])
  })
})
