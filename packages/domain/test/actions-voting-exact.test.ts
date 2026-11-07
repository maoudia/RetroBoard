import { alice, bob, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { type ActionItem, type Actor, type BoardState, type Command, LIMITS, type Outcome, reduce } from '../src'

const CLEAN = { meta: false, notes: [], groups: [], actions: [], wipe: false }
let n = 0
/** Straight to the reducer, with a fixed clock, so the wire schema cannot refuse first. */
const run = (state: BoardState, command: unknown, actor: Actor = alice, now = 5_000): Outcome => reduce(state, command as Command, actor, { now, newId: () => `id${n++}` })
const ok = (o: Outcome) => { if (!o.ok) throw new Error(o.error); return o }
const actionOf = (id: string, over: Partial<ActionItem> = {}): ActionItem => ({ id, text: id, owner: '', status: 'todo', done: false, history: [{ status: 'todo', at: 1 }], due: null, carriedFrom: null, createdAt: 1, ...over })
const withActions = (state: BoardState, count: number): BoardState => ({ ...state, actions: Object.fromEntries(Array.from({ length: count }, (_, i) => [`a${i}`, actionOf(`a${i}`)])) })

describe('actions, exactly', () => {
  it('adds an action to do, with its owner, its date and where it came from, stamped with the time', () => {
    const h = harness()
    const out = ok(run(h.state, { t: 'action.add', text: 'Fix', owner: 'Ana', due: '2026-12-01' }))
    const [item] = Object.values(out.state.actions)
    expect(item).toEqual({ id: expect.any(String), text: 'Fix', owner: 'Ana', status: 'todo', done: false, history: [{ status: 'todo', at: 5_000 }], due: '2026-12-01', carriedFrom: null, createdAt: 5_000 })
    expect(out.dirty).toEqual({ ...CLEAN, actions: [item!.id] })
    expect(Object.values(ok(run(h.state, { t: 'action.add', text: 'x', owner: '' })).state.actions)[0]!.due).toBeNull()
  })

  it('links an action to a note or a cluster that exists, and refuses one that does not', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
    const note = Object.keys(h.state.notes)[0]!
    expect(Object.values(ok(run(h.state, { t: 'action.add', text: 'x', owner: '', sourceNote: note })).state.actions)[0]).toMatchObject({ sourceNote: note })
    expect(Object.values(ok(run(h.state, { t: 'action.add', text: 'x', owner: '' })).state.actions)[0]).not.toHaveProperty('sourceNote')
    expect(run(h.state, { t: 'action.add', text: 'x', owner: '', sourceNote: 'nope' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('holds as many as the limit and not one more, for one and for a batch', () => {
    const h = harness()
    const nearly = withActions(h.state, LIMITS.maxActions - 1)
    expect(run(nearly, { t: 'action.add', text: 'x', owner: '' }).ok).toBe(true)
    const full = withActions(h.state, LIMITS.maxActions)
    expect(run(full, { t: 'action.add', text: 'x', owner: '' })).toEqual({ ok: false, error: 'limit-reached' })
    const item = { text: 'x', owner: '', status: 'todo' as const }
    expect(run(nearly, { t: 'action.import', items: [item] }).ok).toBe(true)
    expect(run(nearly, { t: 'action.import', items: [item, item] })).toEqual({ ok: false, error: 'limit-reached' })
    expect(run(withActions(h.state, LIMITS.maxActions - 2), { t: 'action.import', items: [item, item] }).ok).toBe(true)
  })

  it('updates only what it is given, clears a date with null, and names the action', () => {
    const base = { ...harness().state, actions: { a1: actionOf('a1', { text: 'old', owner: 'Ana', due: '2026-01-01' }) } }
    const text = ok(run(base, { t: 'action.update', id: 'a1', text: 'new' }))
    expect(text.state.actions.a1).toMatchObject({ text: 'new', owner: 'Ana', due: '2026-01-01' })
    expect(text.dirty).toEqual({ ...CLEAN, actions: ['a1'] })
    expect(ok(run(base, { t: 'action.update', id: 'a1', owner: 'Bo' })).state.actions.a1).toMatchObject({ text: 'old', owner: 'Bo', due: '2026-01-01' })
    expect(ok(run(base, { t: 'action.update', id: 'a1', due: null })).state.actions.a1!.due).toBeNull()
    expect(ok(run(base, { t: 'action.update', id: 'a1', due: '2027-02-02' })).state.actions.a1!.due).toBe('2027-02-02')
    expect(ok(run(base, { t: 'action.update', id: 'a1', text: '', owner: '' })).state.actions.a1).toMatchObject({ text: '', owner: '' })
    expect(run(base, { t: 'action.update', id: 'zzzz' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('moves an action through its statuses, keeping the history, and says nothing changed when it is the same', () => {
    const base = { ...harness().state, actions: { a1: actionOf('a1'), a2: actionOf('a2') } }
    const doing = ok(run(base, { t: 'action.status', id: 'a1', status: 'doing' }, alice, 7_000))
    expect(doing.state.actions.a1).toMatchObject({ status: 'doing', done: false, history: [{ status: 'todo', at: 1 }, { status: 'doing', at: 7_000 }] })
    expect(doing.dirty).toEqual({ ...CLEAN, actions: ['a1'] })
    expect(doing.state.actions.a2).toBe(base.actions.a2)
    const finished = ok(run(doing.state, { t: 'action.status', id: 'a1', status: 'done' }))
    expect(finished.state.actions.a1).toMatchObject({ status: 'done', done: true })
    const again = ok(run(finished.state, { t: 'action.status', id: 'a1', status: 'done' }))
    expect(again.dirty).toEqual(CLEAN)
    expect(again.state).toBe(finished.state)
    expect(run(base, { t: 'action.status', id: 'zzzz', status: 'done' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('toggles an action done and back to do', () => {
    const base = { ...harness().state, actions: { a1: actionOf('a1') } }
    const done = ok(run(base, { t: 'action.toggle', id: 'a1', done: true }))
    expect(done.state.actions.a1).toMatchObject({ status: 'done', done: true })
    expect(ok(run(done.state, { t: 'action.toggle', id: 'a1', done: false })).state.actions.a1).toMatchObject({ status: 'todo', done: false })
  })

  it('imports the actions of a previous retro, each with its status, owner, date and origin, and a time that keeps their order', () => {
    const out = ok(run(harness().state, { t: 'action.import', items: [{ text: 'a', owner: 'Ana', status: 'doing', due: '2026-05-05', from: 'Sprint 41' }, { text: 'b', owner: '', status: 'done' }, { text: 'c', owner: '', status: 'blocked' }] }))
    const items = Object.values(out.state.actions)
    expect(items.map((x) => [x.text, x.owner, x.status, x.done, x.due, x.carriedFrom, x.createdAt])).toEqual([
      ['a', 'Ana', 'doing', false, '2026-05-05', 'Sprint 41', 5_000],
      ['b', '', 'done', true, null, '', 5_001],
      ['c', '', 'blocked', false, null, '', 5_002],
    ])
    expect(items.map((x) => x.history)).toEqual([[{ status: 'doing', at: 5_000 }], [{ status: 'done', at: 5_001 }], [{ status: 'blocked', at: 5_002 }]])
    expect(out.dirty).toEqual({ ...CLEAN, actions: items.map((x) => x.id) })
  })

  it('deletes the one action it is told to, naming it, and keeps the others', () => {
    const base = { ...harness().state, actions: { a1: actionOf('a1'), a2: actionOf('a2') } }
    const out = ok(run(base, { t: 'action.delete', id: 'a1' }))
    expect(Object.keys(out.state.actions)).toEqual(['a2'])
    expect(out.dirty).toEqual({ ...CLEAN, actions: ['a1'] })
    expect(run(base, { t: 'action.delete', id: 'zzzz' })).toEqual({ ok: false, error: 'not-found' })
  })
})

describe('votes, exactly', () => {
  function board(settings: Record<string, unknown> = {}) {
    const h = harness()
    h.run({ t: 'settings.update', voteLimit: 5, maxVotesPerItem: 3, ...settings })
    for (const text of ['a', 'b']) h.run({ t: 'note.add', columnId: h.col(0), text }, alice)
    h.run({ t: 'note.add', columnId: h.col(1), text: 'c' }, alice)
    const id = Object.fromEntries(Object.values(h.state.notes).map((x) => [x.text, x.id])) as Record<'a' | 'b' | 'c', string>
    h.run({ t: 'note.group', id: id.a, ontoId: id.b })
    return { h, id, group: h.state.notes[id.a]!.groupId! }
  }

  it('adds a vote to a note or a cluster, naming what changed, and keeps the earlier voters', () => {
    const { h, id, group } = board()
    const note = ok(run(h.state, { t: 'vote.add', kind: 'note', id: id.c }, alice))
    expect(note.state.notes[id.c]!.voters).toEqual([alice.cid])
    expect(note.dirty).toEqual({ ...CLEAN, notes: [id.c] })
    expect(ok(run(note.state, { t: 'vote.add', kind: 'note', id: id.c }, bob)).state.notes[id.c]!.voters).toEqual([alice.cid, bob.cid])
    const cluster = ok(run(h.state, { t: 'vote.add', kind: 'cluster', id: group }, alice))
    expect(cluster.state.groups[group]!.voters).toEqual([alice.cid])
    expect(cluster.dirty).toEqual({ ...CLEAN, groups: [group] })
  })

  it('refuses a vote when the board is locked or voting is closed, and says why an item cannot be voted on', () => {
    const { h, id } = board()
    expect(run({ ...h.state, settings: { ...h.state.settings, locked: true } }, { t: 'vote.add', kind: 'note', id: id.c })).toEqual({ ok: false, error: 'locked' })
    expect(run({ ...h.state, settings: { ...h.state.settings, votingClosed: true } }, { t: 'vote.add', kind: 'note', id: id.c })).toEqual({ ok: false, error: 'voting-closed' })
    expect(run(h.state, { t: 'vote.add', kind: 'note', id: 'nope' })).toEqual({ ok: false, error: 'not-found' })
    expect(run(h.state, { t: 'vote.add', kind: 'note', id: id.a })).toEqual({ ok: false, error: 'not-votable' })
  })

  it('stops at the budget of a person and at the cap on one item, exactly', () => {
    const { h, id } = board({ voteLimit: 2, maxVotesPerItem: 2 })
    const first = ok(run(h.state, { t: 'vote.add', kind: 'note', id: id.c }, alice))
    const second = ok(run(first.state, { t: 'vote.add', kind: 'note', id: id.c }, alice))
    expect(run(second.state, { t: 'vote.add', kind: 'note', id: id.c }, alice)).toEqual({ ok: false, error: 'vote-limit' })
    const tight = board({ voteLimit: 5, maxVotesPerItem: 1 })
    const one = ok(run(tight.h.state, { t: 'vote.add', kind: 'note', id: tight.id.c }, alice))
    expect(run(one.state, { t: 'vote.add', kind: 'note', id: tight.id.c }, alice)).toEqual({ ok: false, error: 'item-limit' })
    expect(run(one.state, { t: 'vote.add', kind: 'note', id: tight.id.c }, bob).ok).toBe(true)
  })

  it('removes the last of my votes on an item and leaves the others where they are', () => {
    const { h, id, group } = board()
    const state: BoardState = { ...h.state, notes: { ...h.state.notes, [id.c]: { ...h.state.notes[id.c]!, voters: [alice.cid, bob.cid, alice.cid] } }, groups: { ...h.state.groups, [group]: { ...h.state.groups[group]!, voters: [bob.cid, alice.cid, bob.cid] } } }
    const note = ok(run(state, { t: 'vote.remove', kind: 'note', id: id.c }, alice))
    expect(note.state.notes[id.c]!.voters).toEqual([alice.cid, bob.cid])
    expect(note.dirty).toEqual({ ...CLEAN, notes: [id.c] })
    const cluster = ok(run(state, { t: 'vote.remove', kind: 'cluster', id: group }, alice))
    expect(cluster.state.groups[group]!.voters).toEqual([bob.cid, bob.cid])
    expect(cluster.dirty).toEqual({ ...CLEAN, groups: [group] })
  })

  it('removes nothing, and says so, when I have no vote there, and refuses what is not there', () => {
    const { h, id, group } = board()
    for (const [kind, target] of [['note', id.c], ['cluster', group]] as const) {
      const out = ok(run(h.state, { t: 'vote.remove', kind, id: target }, alice))
      expect(out.dirty, kind).toEqual(CLEAN)
      expect(out.state, kind).toBe(h.state)
      expect(run(h.state, { t: 'vote.remove', kind, id: 'nope' }), kind).toEqual({ ok: false, error: 'not-found' })
    }
    expect(run({ ...h.state, settings: { ...h.state.settings, locked: true } }, { t: 'vote.remove', kind: 'note', id: id.c })).toEqual({ ok: false, error: 'locked' })
    expect(run({ ...h.state, settings: { ...h.state.settings, votingClosed: true } }, { t: 'vote.remove', kind: 'note', id: id.c })).toEqual({ ok: false, error: 'voting-closed' })
  })

  it('takes a vote back even when the item cannot be voted on any more', () => {
    const { h, id } = board()
    const voted = ok(run(h.state, { t: 'vote.add', kind: 'note', id: id.c }, alice))
    const closedColumn: BoardState = { ...voted.state, columns: voted.state.columns.map((c, i) => (i === 1 ? { ...c, votable: false } : c)) }
    expect(run(closedColumn, { t: 'vote.add', kind: 'note', id: id.c }, bob)).toEqual({ ok: false, error: 'not-votable' })
    expect(ok(run(closedColumn, { t: 'vote.remove', kind: 'note', id: id.c }, alice)).state.notes[id.c]!.voters).toEqual([])
  })

  it('toggles a vote on a note, on when I have none and off when I have one', () => {
    const { h, id } = board()
    const on = ok(run(h.state, { t: 'vote.toggle', id: id.c }, alice))
    expect(on.state.notes[id.c]!.voters).toEqual([alice.cid])
    expect(ok(run(on.state, { t: 'vote.toggle', id: id.c }, alice)).state.notes[id.c]!.voters).toEqual([])
    expect(run(h.state, { t: 'vote.toggle', id: 'nope' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('closes and reopens voting, each time marking the room as changed', () => {
    const { h } = board()
    const closed = ok(run(h.state, { t: 'vote.close' }))
    expect(closed.state.settings.votingClosed).toBe(true)
    expect(closed.dirty).toEqual({ ...CLEAN, meta: true })
    const reopened = ok(run(closed.state, { t: 'vote.reopen' }))
    expect(reopened.state.settings.votingClosed).toBe(false)
    expect(reopened.dirty).toEqual({ ...CLEAN, meta: true })
  })
})
