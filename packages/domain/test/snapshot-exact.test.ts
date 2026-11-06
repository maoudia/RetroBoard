import { alice, bob, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { type AgendaState, type BoardState, buildSnapshot } from '../src'

const snap = (state: BoardState, viewer = alice, now = 1_000, names: Record<string, string> = {}) => buildSnapshot(state, { cid: viewer.cid }, [], now, names)

function board() {
  const h = harness()
  const add = (text: string, actor = alice, col = 0) => { h.run({ t: 'note.add', columnId: h.col(col), text }, actor); return Object.values(h.state.notes).find((n) => n.text === text)!.id }
  return { h, add }
}

describe('what a viewer sees, exactly', () => {
  it('says what it is, when, and what the board settings are', () => {
    const { h } = board()
    expect(snap(h.state, alice, 4_242)).toMatchObject({ t: 'snapshot', now: 4_242, settings: h.state.settings, peers: [], votesLeft: h.state.settings.voteLimit })
  })

  describe('hidden columns', () => {
    const phases = [{ id: 'a', kind: 'write', plannedMs: 60_000 }, { id: 'b', kind: 'close', plannedMs: 60_000 }] as AgendaState['phases']
    const agenda = (current: number): AgendaState => ({ phases, current, startedAt: 0, pausedAt: null, rules: true, autoPublish: true })

    it('come back when the agenda reaches the closing phase or is over, and only then', () => {
      const { h } = board()
      h.run({ t: 'column.hide', id: h.col(1) })
      const columns = (a: AgendaState | null) => snap({ ...h.state, agenda: a }).columns
      const hidden = (a: AgendaState | null) => columns(a).filter((c) => 'hidden' in c).map((c) => c.id)
      expect(hidden(null)).toEqual([h.col(1)])
      expect(hidden(agenda(-1))).toEqual([h.col(1)])
      expect(hidden(agenda(0))).toEqual([h.col(1)])
      expect(hidden(agenda(1))).toEqual([])
      expect(hidden(agenda(2))).toEqual([])
      expect(columns(agenda(1))).toHaveLength(h.state.columns.length)
      const closeFirst: AgendaState = { ...agenda(0), phases: [{ id: 'c', kind: 'close', plannedMs: 60_000 }] as AgendaState['phases'] }
      expect(hidden(closeFirst)).toEqual([])
      expect(hidden({ ...closeFirst, current: -1 })).toEqual([h.col(1)])
    })
  })

  describe('notes', () => {
    it('come in the order they were written, by id when written together', () => {
      const { h, add } = board()
      const a = add('a'); const b = add('b'); const c = add('c')
      const reordered: BoardState = { ...h.state, notes: { [c]: { ...h.state.notes[c]!, createdAt: 10 }, [b]: { ...h.state.notes[b]!, createdAt: 20 }, [a]: { ...h.state.notes[a]!, createdAt: 20 } } }
      expect(snap(reordered).notes.map((n) => n.text)).toEqual(['c', 'a', 'b'])
    })

    it('show the author of a named note under the name the facilitator gave, never unmasking an anonymous one, and who wrote it', () => {
      const { h, add } = board()
      const named = add('named', alice)
      const anon = add('anon', bob)
      const names = { [alice.cid]: 'Alicia', [bob.cid]: 'Bobby' }
      const seen = snap(h.state, alice, 1_000, names).notes
      const by = (id: string) => seen.find((n) => n.id === id)!
      expect(by(named)).toMatchObject({ author: 'Alicia', mine: true })
      expect(by(anon)).toMatchObject({ author: null, mine: false })
      expect(snap(h.state, bob).notes.find((n) => n.id === named)).toMatchObject({ author: 'Alice', mine: false })
    })

    it('carry their votes, mine, whether I voted, and whether they can be voted on, and hide the counts while voting is secret', () => {
      const { h, add } = board()
      h.run({ t: 'settings.update', voteLimit: 5, maxVotesPerItem: 3 })
      const a = add('a'); const b = add('b', alice, 1)
      h.run({ t: 'column.update', id: h.col(1), votable: false })
      for (const actor of [alice, alice, bob]) h.run({ t: 'vote.add', kind: 'note', id: a }, actor)
      const mine = snap(h.state, alice)
      expect(mine.notes.find((n) => n.id === a)).toMatchObject({ votes: 3, voted: true, myVotes: 2, votable: true })
      expect(mine.notes.find((n) => n.id === b)).toMatchObject({ votes: 0, voted: false, myVotes: 0, votable: false })
      expect(snap(h.state, bob).notes.find((n) => n.id === a)).toMatchObject({ voted: true, myVotes: 1 })
      expect(mine.votesLeft).toBe(3)
      const secret = snap({ ...h.state, settings: { ...h.state.settings, secretVoting: true, votingClosed: false } })
      expect(secret.notes.every((n) => n.votes === null)).toBe(true)
      const closed = snap({ ...h.state, settings: { ...h.state.settings, secretVoting: true, votingClosed: true } })
      expect(closed.notes.find((n) => n.id === a)!.votes).toBe(3)
    })

    it('say when they are frozen, pinned or edited, and only then', () => {
      const { h, add } = board()
      const plain = add('plain'); const frozen = add('frozen'); const pinned = add('pinned'); const edited = add('edited')
      h.run({ t: 'note.freeze', id: frozen })
      h.run({ t: 'note.pin', id: pinned })
      h.run({ t: 'note.edit', id: edited, text: 'edited!' }, alice)
      const notes = snap(h.state).notes
      const by = (id: string) => notes.find((n) => n.id === id)!
      expect('frozen' in by(plain) || 'pinned' in by(plain) || 'edited' in by(plain)).toBe(false)
      expect(by(frozen)).toMatchObject({ frozen: true })
      expect(by(pinned)).toMatchObject({ pinned: h.state.notes[pinned]!.pinned })
      expect(by(edited)).toMatchObject({ edited: true, text: 'edited!' })
    })
  })

  describe('clusters', () => {
    function clustered() {
      const { h, add } = board()
      const a = add('a'); const b = add('b')
      h.run({ t: 'note.group', id: a, ontoId: b })
      return { h, group: h.state.notes[a]!.groupId!, a, b }
    }

    it('count the votes of their notes, mine on the cluster itself, and can be voted on only when the setting and the column allow it', () => {
      const { h, group, a } = clustered()
      h.run({ t: 'vote.add', kind: 'cluster', id: group }, alice)
      const g = snap(h.state, alice).groups.find((x) => x.id === group)!
      expect(g).toMatchObject({ id: group, columnId: h.col(0), title: null, votes: 1, myVotes: 1, votable: true })
      expect(snap(h.state, bob).groups[0]).toMatchObject({ myVotes: 0 })
      expect(snap({ ...h.state, settings: { ...h.state.settings, votable: 'notes' } }).groups[0]!.votable).toBe(false)
      h.run({ t: 'column.update', id: h.col(0), votable: false })
      expect(snap(h.state).groups[0]!.votable).toBe(false)
      expect(snap(h.state).notes.find((n) => n.id === a)!.votable).toBe(false)
    })

    it('say when they are frozen or pinned, and only then', () => {
      const { h, group } = clustered()
      expect('frozen' in snap(h.state).groups[0]! || 'pinned' in snap(h.state).groups[0]!).toBe(false)
      h.run({ t: 'note.freeze', id: group })
      h.run({ t: 'note.pin', id: group })
      expect(snap(h.state).groups[0]).toMatchObject({ frozen: true, pinned: h.state.groups[group]!.pinned })
    })
  })

  it('shows an expired timer as stopped at zero, at the moment it ends and not a millisecond before', () => {
    const { h } = board()
    const timer = { running: true, endsAt: 5_000, remaining: 99, length: 60_000 }
    expect(snap({ ...h.state, timer }, alice, 4_999).timer).toEqual(timer)
    expect(snap({ ...h.state, timer }, alice, 5_000).timer).toEqual({ running: false, endsAt: 0, remaining: 0, length: 60_000 })
    expect(snap({ ...h.state, timer: { ...timer, running: false } }, alice, 9_000).timer).toEqual({ ...timer, running: false })
  })

  it('lists the actions in the order they were created', () => {
    const { h } = board()
    for (const text of ['one', 'two', 'three']) h.run({ t: 'action.add', text, owner: '' })
    const [one, two, three] = Object.values(h.state.actions)
    const reordered: BoardState = { ...h.state, actions: { [three!.id]: { ...three!, createdAt: 1 }, [two!.id]: { ...two!, createdAt: 3 }, [one!.id]: { ...one!, createdAt: 2 } } }
    expect(snap(reordered).actions.map((a) => a.text)).toEqual(['three', 'one', 'two'])
  })

  it('carries the reveal countdown and the open column when there are some, and nothing when there are none', () => {
    const { h } = board()
    expect(snap(h.state)).toMatchObject({ reveal: null, turn: null, presenting: null })
    const set: BoardState = { ...h.state, reveal: { endsAt: 7_000 }, turn: h.col(1) }
    expect(snap(set)).toMatchObject({ reveal: { endsAt: 7_000 }, turn: h.col(1) })
  })

  it('says who is presenting, and whether it is me', () => {
    const { h } = board()
    h.run({ t: 'presenter.set', on: true }, alice)
    expect(snap(h.state, alice).presenting).toEqual({ name: 'Alice', mine: true, at: h.now })
    expect(snap(h.state, bob).presenting).toEqual({ name: 'Alice', mine: false, at: h.now })
  })

  it('lists the chat without who wrote it, and which lines are mine', () => {
    const { h } = board()
    h.run({ t: 'chat.post', text: 'hi' }, alice)
    const [line] = snap(h.state, bob).chat!
    expect(line).toEqual({ id: expect.any(String), name: 'Alice', mine: false, at: h.now, text: 'hi' })
    expect(snap(h.state, alice).chat![0]!.mine).toBe(true)
  })
})
