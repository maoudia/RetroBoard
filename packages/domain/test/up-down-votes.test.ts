import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { buildSnapshot } from '../src'

function board(style: 'updown' | 'dots' = 'updown') {
  const h = harness()
  h.run({ t: 'note.add', columnId: h.col(0), text: 'a' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'b' })
  if (style === 'updown') h.run({ t: 'settings.update', voteStyle: 'updown' })
  const [a, b] = Object.values(h.state.notes).sort((x, y) => x.text.localeCompare(y.text)).map((n) => n.id) as [string, string]
  return { h, a, b }
}
const note = (h: ReturnType<typeof harness>, id: string, cid = alice.cid) => buildSnapshot(h.state, { cid }, [], h.now).notes.find((n) => n.id === id)!

describe('up and down votes', () => {
  it('uses dots by default and refuses up and down commands', () => {
    const { h, a } = board('dots')
    expect(h.state.settings.voteStyle).toBeUndefined()
    expect(h.run({ t: 'vote.up', kind: 'note', id: a })).toEqual({ ok: false, error: 'forbidden' })
    expect(note(h, a).ups).toBeUndefined()
  })

  it('refuses dot commands in the up and down style', () => {
    const { h, a } = board()
    expect(h.run({ t: 'vote.add', kind: 'note', id: a })).toEqual({ ok: false, error: 'forbidden' })
    expect(h.run({ t: 'vote.remove', kind: 'note', id: a })).toEqual({ ok: false, error: 'forbidden' })
  })

  it('counts ups minus downs, one choice per participant and idea, with no budget', () => {
    const { h, a, b } = board()
    h.run({ t: 'settings.update', voteLimit: 1 })
    h.run({ t: 'vote.up', kind: 'note', id: a })
    h.run({ t: 'vote.up', kind: 'note', id: b })
    h.run({ t: 'vote.up', kind: 'note', id: a }, bob)
    h.run({ t: 'vote.up', kind: 'note', id: a })
    expect(note(h, a)).toMatchObject({ votes: 2, ups: 2, downs: 0, myChoice: 'up' })
    expect(note(h, b)).toMatchObject({ votes: 1, myChoice: 'up' })
  })

  it('change of mind: an up then a down counts only the down', () => {
    const { h, a } = board()
    h.run({ t: 'vote.up', kind: 'note', id: a }, bob)
    expect(note(h, a, bob.cid).votes).toBe(1)
    h.run({ t: 'vote.down', kind: 'note', id: a }, bob)
    expect(note(h, a, bob.cid)).toMatchObject({ votes: -1, ups: 0, downs: 1, myChoice: 'down' })
    h.run({ t: 'vote.clear', kind: 'note', id: a }, bob)
    expect(note(h, a, bob.cid)).toMatchObject({ votes: 0, downs: 0, myChoice: null })
  })

  it('hides counts until voting closes but always shows my own choice', () => {
    const { h, a } = board()
    h.run({ t: 'settings.update', secretVoting: true })
    h.run({ t: 'vote.down', kind: 'note', id: a })
    expect(note(h, a)).toMatchObject({ votes: null, ups: null, downs: null, myChoice: 'down' })
    expect(note(h, a, bob.cid)).toMatchObject({ votes: null, myChoice: null })
    h.run({ t: 'vote.close' })
    expect(note(h, a, bob.cid)).toMatchObject({ votes: -1, downs: 1 })
    expect(h.run({ t: 'vote.up', kind: 'note', id: a })).toEqual({ ok: false, error: 'voting-closed' })
  })

  it('ignores unknown items and clears nothing silently', () => {
    const { h } = board()
    expect(h.run({ t: 'vote.up', kind: 'note', id: 'nope' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.run({ t: 'vote.clear', kind: 'note', id: 'nope' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('counts cluster choices with the choices on its notes, and keeps one choice per person on merge', () => {
    const { h, a, b } = board()
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = Object.keys(h.state.groups)[0]!
    h.run({ t: 'vote.down', kind: 'cluster', id: gid })
    const g = () => buildSnapshot(h.state, { cid: alice.cid }, [], h.now).groups.find((x) => x.id === gid)!
    expect(g()).toMatchObject({ votes: -1, downs: 1, myChoice: 'down' })
  })

  it('locks the style once a vote exists; a reset unlocks it', () => {
    const { h, a } = board()
    h.run({ t: 'vote.up', kind: 'note', id: a })
    expect(h.run({ t: 'settings.update', voteStyle: 'dots' })).toEqual({ ok: false, error: 'not-empty' })
    expect(h.run({ t: 'settings.update', voteStyle: 'updown' }).ok).toBe(true)
    h.run({ t: 'vote.reset' })
    expect(note(h, a)).toMatchObject({ votes: 0 })
    expect(h.run({ t: 'settings.update', voteStyle: 'dots' }).ok).toBe(true)
    expect(h.state.settings.voteStyle).toBeUndefined()
  })

  it('locks the style on a down vote alone and the reset clears downs', () => {
    const { h, a } = board()
    h.run({ t: 'vote.down', kind: 'note', id: a })
    expect(h.run({ t: 'settings.update', voteStyle: 'dots' })).toEqual({ ok: false, error: 'not-empty' })
    h.run({ t: 'vote.reset' })
    expect(h.state.notes[a]!.downVoters).toBeUndefined()
  })

  it('is exclusive with the sealed ballot', () => {
    const { h } = board()
    expect(h.run({ t: 'settings.update', sealedBallot: true, ballotKey: 'A'.repeat(43) })).toEqual({ ok: false, error: 'invalid' })
  })

  it('is chosen at creation by board.init', () => {
    const h = harness()
    expect(h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'clean', voteStyle: 'updown' }).ok).toBe(true)
    expect(h.state.settings.voteStyle).toBe('updown')
  })
})
