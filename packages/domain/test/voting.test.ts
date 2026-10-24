import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { buildSnapshot, clusterVoters, LIMITS, votesUsedBy } from '../src'

function board() {
  const h = harness()
  h.run({ t: 'note.add', columnId: h.col(0), text: 'a' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'b' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'c' })
  const [a, b, c] = Object.values(h.state.notes).sort((x, y) => x.text.localeCompare(y.text)).map((n) => n.id) as [string, string, string]
  return { h, a, b, c }
}
const snap = (h: ReturnType<typeof harness>, cid = alice.cid) => buildSnapshot(h.state, { cid }, [], h.now)

describe('vote policy', () => {
  it('spends a per-person budget across notes and clusters, with undo', () => {
    const { h, a, b } = board()
    h.run({ t: 'settings.update', voteLimit: 2 })
    expect(h.run({ t: 'vote.add', kind: 'note', id: a }).ok).toBe(true)
    expect(h.run({ t: 'vote.add', kind: 'note', id: b }).ok).toBe(true)
    expect(h.run({ t: 'vote.add', kind: 'note', id: a })).toEqual({ ok: false, error: 'vote-limit' })
    expect(snap(h).votesLeft).toBe(0)
    expect(h.run({ t: 'vote.remove', kind: 'note', id: b }).ok).toBe(true)
    expect(snap(h).votesLeft).toBe(1)
    // Removing a vote you do not have is a no-op, not an error.
    expect(h.run({ t: 'vote.remove', kind: 'note', id: b }).ok).toBe(true)
    expect(votesUsedBy(h.state, alice.cid)).toBe(1)
  })

  it('caps votes per item and shows how many of mine are on it', () => {
    const { h, a } = board()
    h.run({ t: 'settings.update', voteLimit: 5, maxVotesPerItem: 2 })
    h.run({ t: 'vote.add', kind: 'note', id: a })
    h.run({ t: 'vote.add', kind: 'note', id: a })
    expect(h.run({ t: 'vote.add', kind: 'note', id: a })).toEqual({ ok: false, error: 'item-limit' })
    h.run({ t: 'vote.add', kind: 'note', id: a }, bob)
    const note = snap(h).notes.find((n) => n.id === a)!
    expect([note.votes, note.myVotes, note.voted]).toEqual([3, 2, true])
    expect(snap(h, bob.cid).notes.find((n) => n.id === a)!.myVotes).toBe(1)
  })

  it('keeps the per-item cap within the per-person budget and the budget within limits', () => {
    const { h } = board()
    h.run({ t: 'settings.update', voteLimit: 3, maxVotesPerItem: 10 })
    expect(h.state.settings.maxVotesPerItem).toBe(3)
    h.run({ t: 'settings.update', voteLimit: 1 })
    expect(h.state.settings.maxVotesPerItem).toBe(1)
    expect(h.run({ t: 'settings.update', voteLimit: LIMITS.maxVotes + 1 })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'settings.update', voteLimit: 20 }).ok).toBe(true)
  })

  it('rejects unknown items and votes while locked', () => {
    const { h, a } = board()
    expect(h.run({ t: 'vote.add', kind: 'note', id: 'ghost-note' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'vote.add', kind: 'cluster', id: 'ghost-group' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'vote.remove', kind: 'cluster', id: 'ghost-group' })).toEqual({ ok: false, error: 'not-found' })
    h.run({ t: 'settings.update', locked: true })
    expect(h.run({ t: 'vote.add', kind: 'note', id: a })).toEqual({ ok: false, error: 'locked' })
  })

  it('vote.toggle keeps working for v1 clients', () => {
    const { h, a } = board()
    h.run({ t: 'vote.toggle', id: a })
    expect(snap(h).notes.find((n) => n.id === a)!.votes).toBe(1)
    h.run({ t: 'vote.toggle', id: a })
    expect(snap(h).notes.find((n) => n.id === a)!.votes).toBe(0)
  })
})

describe('votes on clusters', () => {
  it('a cluster is voted as one idea; its notes are not votable separately; it keeps earlier note votes', () => {
    const { h, a, b, c } = board()
    h.run({ t: 'settings.update', voteLimit: 5 })
    h.run({ t: 'vote.add', kind: 'note', id: a }, bob)
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId!
    expect(h.run({ t: 'vote.add', kind: 'note', id: a })).toEqual({ ok: false, error: 'not-votable' })
    expect(h.run({ t: 'vote.add', kind: 'cluster', id: gid }).ok).toBe(true)
    const s = snap(h)
    const g = s.groups.find((x) => x.id === gid)!
    expect([g.votes, g.myVotes, g.votable]).toEqual([2, 1, true])
    expect(s.notes.filter((n) => n.groupId === gid).every((n) => !n.votable)).toBe(true)
    expect(s.notes.find((n) => n.id === c)!.votable).toBe(true)
    expect(clusterVoters(h.state, gid)).toHaveLength(2)
    expect(clusterVoters(h.state, 'ghost')).toEqual([])
  })

  it('honours the votable setting: notes only, clusters only', () => {
    const { h, a, b, c } = board()
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId!
    h.run({ t: 'settings.update', votable: 'notes' })
    expect(h.run({ t: 'vote.add', kind: 'cluster', id: gid })).toEqual({ ok: false, error: 'not-votable' })
    expect(h.run({ t: 'vote.add', kind: 'note', id: a }).ok).toBe(true)
    h.run({ t: 'settings.update', votable: 'clusters' })
    expect(h.run({ t: 'vote.add', kind: 'note', id: c })).toEqual({ ok: false, error: 'not-votable' })
    expect(h.run({ t: 'vote.add', kind: 'cluster', id: gid }).ok).toBe(true)
  })

  it('never exposes voter ids in snapshots', () => {
    const { h, a, b } = board()
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'vote.add', kind: 'cluster', id: h.state.notes[a]!.groupId! }, bob)
    expect(JSON.stringify(snap(h))).not.toContain(bob.cid)
  })
})

describe('hidden counts and closing', () => {
  it('hides counts until the facilitator closes voting, then reveals them to everyone at once', () => {
    const { h, a } = board()
    h.run({ t: 'settings.update', secretVoting: true })
    h.run({ t: 'vote.add', kind: 'note', id: a }, bob)
    const during = snap(h)
    expect(during.notes.find((n) => n.id === a)!.votes).toBeNull()
    expect(snap(h, bob.cid).notes.find((n) => n.id === a)!.myVotes).toBe(1)
    expect(h.run({ t: 'vote.close' }).ok).toBe(true)
    expect(snap(h).notes.find((n) => n.id === a)!.votes).toBe(1)
    expect(snap(h, bob.cid).notes.find((n) => n.id === a)!.votes).toBe(1)
  })

  it('refuses votes and undos once closed, until reopened', () => {
    const { h, a } = board()
    h.run({ t: 'vote.add', kind: 'note', id: a })
    h.run({ t: 'vote.close' })
    expect(h.run({ t: 'vote.add', kind: 'note', id: a })).toEqual({ ok: false, error: 'voting-closed' })
    expect(h.run({ t: 'vote.remove', kind: 'note', id: a })).toEqual({ ok: false, error: 'voting-closed' })
    h.run({ t: 'vote.reopen' })
    expect(h.run({ t: 'vote.remove', kind: 'note', id: a }).ok).toBe(true)
  })
})

describe('merging clusters', () => {
  it('moves notes and votes into the target, which keeps its title; same column only', () => {
    const { h, a, b, c } = board()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'd' })
    const d = Object.values(h.state.notes).find((n) => n.text === 'd')!.id
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.group', id: c, ontoId: d })
    const g1 = h.state.notes[a]!.groupId!
    const g2 = h.state.notes[c]!.groupId!
    h.run({ t: 'group.rename', id: g2, title: 'Target' })
    h.run({ t: 'vote.add', kind: 'cluster', id: g1 })
    expect(h.run({ t: 'group.merge', id: g1, ontoId: g2 }).ok).toBe(true)
    expect(h.state.groups[g1]).toBeUndefined()
    expect(Object.values(h.state.notes).filter((n) => n.groupId === g2)).toHaveLength(4)
    expect([h.state.groups[g2]!.title, h.state.groups[g2]!.voters]).toEqual(['Target', [alice.cid]])
    expect(h.run({ t: 'group.merge', id: g2, ontoId: g2 }).ok).toBe(true)
    expect(h.run({ t: 'group.merge', id: 'ghost-gr', ontoId: g2 })).toEqual({ ok: false, error: 'not-found' })
  })

  it('refuses clusters of different columns and locked boards', () => {
    const { h, a, b } = board()
    h.run({ t: 'note.add', columnId: h.col(1), text: 'x' })
    h.run({ t: 'note.add', columnId: h.col(1), text: 'y' })
    const [x, y] = Object.values(h.state.notes).filter((n) => n.columnId === h.col(1)).map((n) => n.id) as [string, string]
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.group', id: x, ontoId: y })
    expect(h.run({ t: 'group.merge', id: h.state.notes[a]!.groupId!, ontoId: h.state.notes[x]!.groupId! })).toEqual({ ok: false, error: 'same-column-required' })
    h.run({ t: 'settings.update', locked: true })
    expect(h.run({ t: 'group.merge', id: h.state.notes[a]!.groupId!, ontoId: h.state.notes[x]!.groupId! })).toEqual({ ok: false, error: 'locked' })
  })
})
