import type { AgendaState, Snapshot, SnapshotGroup, SnapshotNote } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { buildRanking, canonicalJson, chatInvite, cloneSpec, connectionState, emailInvite, groupByAuthorPlan, mmss, nameConflict, nameKey, ownerChoices, podium, publishedNotes, ringProgress, votedIdeas, votingState } from '../src'

const note = (id: string, votes: number | null, over: Partial<SnapshotNote> = {}): SnapshotNote => ({
  id, columnId: 'c1', text: `idea ${id}`, color: 0, author: null, groupId: null, votes, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...over,
})
const cluster = (id: string, votes: number | null): SnapshotGroup => ({ id, columnId: 'c1', title: null, votes, myVotes: 0, votable: true })
const MIN = 60_000
const agenda = (current: number, over: Partial<AgendaState> = {}): AgendaState => ({
  phases: [{ id: 'a', kind: 'write', plannedMs: 10 * MIN }, { id: 'b', kind: 'vote', plannedMs: 10 * MIN }, { id: 'c', kind: 'close', plannedMs: 5 * MIN }],
  current, startedAt: 0, pausedAt: null, rules: true, autoPublish: true, ...over,
})

describe('ranking, exactly', () => {
  it('breaks ties by the order of the board, a cluster counting where its first note is', () => {
    const notes = [note('n0', 2), note('n1', 2), note('g1', 2, { groupId: 'g' }), note('n3', 2)]
    const r = buildRanking({ notes, groups: [cluster('g', 2)] })!
    expect(r.map((x) => x.id)).toEqual(['n0', 'n1', 'g', 'n3'])
    expect(r.map((x) => x.rank)).toEqual([1, 1, 1, 1])
    const later = buildRanking({ notes: [note('x', 3), note('y', 3, { groupId: 'g' }), note('z', 3)], groups: [cluster('g', 3)] })!
    expect(later.map((x) => x.id)).toEqual(['x', 'g', 'z'])
  })

  it('keeps ranks 1, 2 and 3 on the podium and drops rank 4', () => {
    const r = buildRanking({ notes: [note('a', 5), note('b', 4), note('c', 3), note('d', 2)], groups: [] })!
    expect(podium(r).map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('names, exactly', () => {
  it('folds accents, case and runs of spaces', () => {
    expect(nameKey('  Éloïse   DUPONT ')).toBe('eloise dupont')
    expect(nameKey(undefined)).toBe('')
    expect(nameKey('á̂')).toBe('a')
  })

  it('finds the earlier person called like me, and never me, nobody unnamed, nor a newcomer', () => {
    const earlier = new Set(['k1'])
    expect(nameConflict([{ name: 'Ann', me: true, key: 'k2' }, { name: 'ann', me: false, key: 'k1' }], earlier)).toBe('ann')
    expect(nameConflict([{ name: 'ann', me: false, key: 'k1' }], earlier)).toBeNull()
    expect(nameConflict([{ name: 'Ann', me: true, key: 'k1' }, { name: 'Bob', me: false, key: 'k3' }], earlier)).toBeNull()
    expect(nameConflict([{ name: 'Ann', me: true, key: 'k1' }], earlier)).toBeNull()
    expect(nameConflict([{ name: '', me: true }, { name: null, me: false, key: 'k1' }], earlier)).toBeNull()
    expect(nameConflict([{ name: ' ', me: true }, { name: '', me: false, key: 'k1' }], earlier)).toBeNull()
    expect(nameConflict([{ name: 'Ann', me: true }, { name: 'Ann', me: false, key: 'late' }], earlier)).toBeNull()
  })
})

describe('canonical JSON, exactly', () => {
  it('sorts the keys whatever the order they were written in, and drops undefined', () => {
    expect(canonicalJson({ c: 1, a: { z: 1, y: undefined, b: [3, undefined] }, b: 'x' })).toBe('{"a":{"b":[3,null],"z":1},"b":"x","c":1}')
    expect(canonicalJson({ b: 1, c: 2, a: 3 })).toBe('{"a":3,"b":1,"c":2}')
    expect(canonicalJson({ a: 1, c: 2, b: 3 })).toBe('{"a":1,"b":3,"c":2}')
    expect(canonicalJson({ c: 1, b: 2, a: 3 })).toBe('{"a":3,"b":2,"c":1}')
  })
})

describe('voting state, exactly', () => {
  const view = (a: AgendaState | null, votingClosed = false) => ({ settings: { votingClosed } as Snapshot['settings'], agenda: a })
  it('is open in the vote phase even when the override is on, and overridden elsewhere', () => {
    expect(votingState(view(agenda(1, { voteOpen: true })))).toBe('open')
    expect(votingState(view(agenda(0, { voteOpen: true })))).toBe('overridden')
    expect(votingState(view(agenda(0)))).toBe('phase-closed')
    expect(votingState(view(null))).toBe('open')
    expect(votingState(view(agenda(1, { voteOpen: true }), true))).toBe('closed')
  })
})

describe('invitations, exactly', () => {
  const t = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ''}`
  it('squeezes every run of blanks in the title to one space, and names an empty title', () => {
    expect(chatInvite({ title: 'a  b\n\tc', url: 'u', passcodeProtected: false }, t).body).toContain('{"title":"a b c"}')
    expect(chatInvite({ title: ' ', url: 'u', passcodeProtected: false }, t).body).toContain('{"title":"invite.untitled"}')
    expect(emailInvite({ title: '   ', url: 'u', passcodeProtected: false }, t).subject).toBe('invite.email.subject{"title":"invite.untitled"}')
    expect(emailInvite({ title: '', url: 'u', passcodeProtected: false }, t).body).toContain('{"title":"invite.untitled"}')
  })
})

describe('durations, exactly', () => {
  it('switches to hours at one hour and to days at one day', () => {
    expect(mmss(3_599_000)).toBe('59:59')
    expect(mmss(3_600_000)).toBe('1h00')
    expect(mmss(86_399_000)).toBe('23h59')
    expect(mmss(86_400_000)).toBe('1d')
  })
})

describe('connection and authors, exactly', () => {
  it('tells a direct link only for a known connection id', () => {
    expect(connectionState({ me: false, direct: ['x'], status: 'open', p2p: true })).toBe('relay')
    expect(connectionState({ me: false, conn: 'x', direct: ['x'], status: 'open', p2p: false })).toBe('direct')
    expect(connectionState({ me: false, conn: 'y', direct: ['x'], status: 'open', p2p: true })).toBe('relay')
  })

  it('groups the same author in any case, but not two different names', () => {
    const notes = [note('a', 0, { author: 'Straße' }), note('b', 0, { author: 'STRASSE' }), note('c', 0, { author: 'Straße' }), note('d', 0, { author: 'strasse' }), note('e', 0, { author: 'Straße' })]
    expect(groupByAuthorPlan({ notes }, 'c1').map((p) => p.noteIds)).toEqual([['a', 'c', 'e'], ['b', 'd']])
  })
})

describe('undoing a publication, exactly', () => {
  it('only takes notes of the same column', () => {
    const notes = [note('a', 0, { mine: true, columnId: 'c2', text: 'x', createdAt: 5 })]
    expect(publishedNotes(notes, [{ columnId: 'c1', text: 'x', color: 0 }], 0)).toEqual([])
    expect(publishedNotes(notes, [{ columnId: 'c2', text: 'y', color: 0 }], 0)).toEqual([])
  })
})

describe('cloning, exactly', () => {
  const snap = (over: object = {}) => ({
    settings: { title: '  Sprint  ', themeId: 'noel' },
    columns: [{ id: 'c1', title: 'A', subtitle: 's', icon: 'smile' }, { id: 'c2', title: 'B', subtitle: '', icon: 'frown', color: 3, votable: false }],
    agenda: null,
    actions: [
      { id: '1', text: 'open', owner: 'x', status: 'open', due: null },
      { id: '2', text: 'doing', owner: 'x', status: 'doing', due: '2027-01-01' },
      { id: '3', text: 'done', owner: 'x', status: 'done', due: null },
      { id: '4', text: 'dropped', owner: 'x', status: 'dropped', due: null },
    ],
    ...over,
  }) as unknown as Snapshot

  it('trims the title, builds exact columns, leaves out the agenda when there is none', () => {
    const c = cloneSpec(snap(), 'board', 'copy')
    expect(c).toStrictEqual({
      kind: 'board', title: 'Sprint - copy', themeId: 'noel',
      columns: [{ title: 'A', subtitle: 's', icon: 'smile' }, { title: 'B', subtitle: '', icon: 'frown', color: 3, votable: false }],
    })
  })

  it('names a copy of an untitled board by the label alone, in both kinds', () => {
    for (const title of [undefined, '', '   ']) {
      const s = snap({ settings: { title, themeId: 'noel' } })
      expect(cloneSpec(s, 'board', 'copy').title).toBe('copy')
      const a = cloneSpec(s, 'actions', 'copy')
      expect(a.title).toBe('copy')
      expect(a.actions!.every((x) => x.from === undefined)).toBe(true)
    }
  })

  it('keeps the actions that are neither done nor dropped, with the board title as their origin', () => {
    const c = cloneSpec(snap(), 'actions', 'copy')
    expect(c.title).toBe('Sprint - copy')
    expect(c.actions).toStrictEqual([
      { text: 'open', owner: 'x', status: 'open', from: 'Sprint' },
      { text: 'doing', owner: 'x', status: 'doing', due: '2027-01-01', from: 'Sprint' },
    ])
  })

  it('rounds the phases to minutes, at least one, and keeps the chain unless it is off', () => {
    const s = snap({ agenda: { phases: [{ id: 'p', kind: 'write', plannedMs: 10_000 }, { id: 'q', kind: 'vote', plannedMs: 150_000 }], rules: false, autoPublish: true, chain: false } })
    expect(cloneSpec(s, 'board', 'c').agenda).toStrictEqual({ phases: [{ kind: 'write', minutes: 1 }, { kind: 'vote', minutes: 3 }], rules: false, autoPublish: true, chain: false })
    const old = snap({ agenda: { phases: [], rules: true, autoPublish: true } })
    expect(cloneSpec(old, 'board', 'c').agenda!.chain).toBe(true)
  })
})

describe('rings, exactly', () => {
  it('has no turns for a phase without a plan, and completes exactly at one turn', () => {
    const none = ringProgress(agenda(0, { phases: [{ id: 'a', kind: 'write', plannedMs: 0 }] }), 5_000)
    expect(none.current).toMatchObject({ turns: 0, fill: 0, over: 0, complete: false })
    const exact = ringProgress(agenda(0), 10 * MIN)
    expect(exact.current).toMatchObject({ turns: 1, fill: 1, over: 0, complete: true })
    expect(ringProgress(agenda(0), 10 * MIN - 1).current).toMatchObject({ complete: false, over: 0 })
    const over = ringProgress(agenda(0), 15 * MIN)
    expect(over.current).toMatchObject({ turns: 1.5, fill: 1, over: 0.5, complete: true })
    expect(ringProgress(agenda(0), 40 * MIN).current).toMatchObject({ over: 1 })
    expect(ringProgress(agenda(0), -5).current).toMatchObject({ turns: 0 })
  })

  it('shows the phase after the running one as next, and the first one before the start', () => {
    expect(ringProgress(agenda(0), 0).next).toMatchObject({ phaseId: 'b' })
    expect(ringProgress(agenda(1), 0).next).toMatchObject({ phaseId: 'c' })
    expect(ringProgress(agenda(2), 0).next).toBeNull()
    expect(ringProgress(agenda(-1), 0).next).toMatchObject({ phaseId: 'a', turns: 0 })
    expect(ringProgress(agenda(-1, { phases: [] }), 0).next).toBeNull()
  })

  it('has ended once past the last phase, and not on the last one', () => {
    expect(ringProgress(agenda(3), 0).ended).toBe(true)
    expect(ringProgress(agenda(2), 0).ended).toBe(false)
    expect(ringProgress(agenda(-1), 0).ended).toBe(false)
  })
})

describe('voted ideas and owners, exactly', () => {
  const settings = { secretVoting: false, votingClosed: true } as Snapshot['settings']
  const view = (notes: SnapshotNote[]) => ({ settings, agenda: null, notes, groups: [] })

  it('sorts by author ignoring case and accents, anonymous last, equals keeping their rank', () => {
    const ideas = votedIdeas(view([note('1', 9, { author: 'A' }), note('2', 8, { author: 'á' }), note('3', 7, { author: 'a' }), note('4', 6, { author: 'b' }), note('5', 5), note('6', 4)]), 'author')!
    expect(ideas.map((i) => i.id)).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it('offers the first column of the order when none is given', () => {
    const ideas = votedIdeas(view([note('1', 9, { columnId: 'x' }), note('2', 8, { columnId: 'c1' })]), 'column', ['c1'])!
    expect(ideas.map((i) => i.id)).toEqual(['2', '1'])
  })

  it('filters owners without caring about case, accents or blanks, and trims what it offers', () => {
    const peers = [{ name: ' Émile ', hidden: false }, { name: 'emile', hidden: false }, { name: 'Zoé', hidden: true }, { name: null, hidden: false }] as unknown as Snapshot['peers']
    const actions = [{ owner: '  Bob  ' }, { owner: 'bob' }, { owner: 'Élodie' }, { owner: 'Carl' }, { owner: undefined }] as unknown as Snapshot['actions']
    const s = { peers, actions }
    expect(ownerChoices(s)).toEqual({ connected: ['Émile'], used: ['Bob', 'Élodie', 'Carl'] })
    expect(ownerChoices(s, 'ELO').used).toEqual(['Élodie'])
    expect(ownerChoices({ peers: [], actions: [{ owner: 'Straße' }] as never }, 'ss').used).toEqual([])
    expect(ownerChoices(s, ' bo ').used).toEqual(['Bob'])
    expect(ownerChoices(s, 'EMIL', ['émile', 'Emilia']).used).toEqual(['Emilia'])
  })
})
