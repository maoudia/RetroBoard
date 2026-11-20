import { alice, bob, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { buildSnapshot } from '../src'

// Change fix-votes-after-format-change: counted, shown and votable agree after a format change.
// start-stop-continue votes on Start; went-well does not vote on its first column.
function board() {
  const h = harness()
  h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio' })
  const add = (text: string, col = 0) => { h.run({ t: 'note.add', columnId: h.col(col), text }); return Object.values(h.state.notes).find((n) => n.text === text)!.id }
  const snap = (viewer = alice) => buildSnapshot(h.state, { cid: viewer.cid }, [], 1_000)
  return { h, add, snap }
}

describe('votes after a format change into a column that does not vote', () => {
  it('the note is shown, refused and ranked alike: no count, no vote, not counted against the limit', () => {
    const { h, add, snap } = board()
    const id = add('idea')
    h.run({ t: 'vote.add', kind: 'note', id })
    h.run({ t: 'vote.add', kind: 'note', id }, bob)
    expect(snap().notes[0]!.votes).toBe(2)
    h.run({ t: 'template.apply', templateId: 'went-well', mode: 'migrate' })
    const s = snap()
    expect(s.notes[0]).toMatchObject({ id, votable: false, votes: 0, myVotes: 0 })
    expect(s.votesLeft).toBe(h.state.settings.voteLimit)
    expect(h.run({ t: 'vote.add', kind: 'note', id })).toEqual({ ok: false, error: 'not-votable' })
  })

  it('the votes come back with the idea when the column votes again', () => {
    const { h, add, snap } = board()
    const id = add('idea')
    h.run({ t: 'vote.add', kind: 'note', id })
    h.run({ t: 'template.apply', templateId: 'went-well', mode: 'migrate' })
    h.run({ t: 'column.update', id: h.col(0), votable: true })
    expect(snap().notes[0]).toMatchObject({ votable: true, votes: 1, myVotes: 1 })
    expect(snap().votesLeft).toBe(h.state.settings.voteLimit - 1)
  })

  it('a cluster in a column that does not vote shows no count, and neither do its notes', () => {
    const { h, add, snap } = board()
    const a = add('a')
    const b = add('b')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId!
    h.run({ t: 'vote.add', kind: 'cluster', id: gid })
    h.run({ t: 'template.apply', templateId: 'went-well', mode: 'migrate' })
    const s = snap()
    expect(s.groups[0]).toMatchObject({ id: gid, votable: false, votes: 0 })
    expect(s.notes.map((n) => n.votes)).toEqual([0, 0])
    expect(s.votesLeft).toBe(h.state.settings.voteLimit)
  })

  it('a column edit that turns voting off, and a move into such a column, follow the same rule', () => {
    const { h, add, snap } = board()
    const id = add('idea')
    h.run({ t: 'vote.add', kind: 'note', id })
    h.run({ t: 'column.update', id: h.col(0), votable: false })
    expect(snap().notes[0]).toMatchObject({ votable: false, votes: 0 })
    h.run({ t: 'column.update', id: h.col(0), votable: true })
    h.run({ t: 'note.move', id, columnId: h.col(2) })
    expect(snap().notes[0]).toMatchObject({ votable: false, votes: 0 })
    expect(snap().votesLeft).toBe(h.state.settings.voteLimit)
  })

  it('a sealed or secret count stays hidden for every idea', () => {
    const { h, add, snap } = board()
    add('idea')
    h.run({ t: 'settings.update', secretVoting: true })
    h.run({ t: 'template.apply', templateId: 'went-well', mode: 'migrate' })
    expect(snap().notes[0]!.votes).toBeNull()
  })
})
