import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { buildSnapshot } from '@retroboard/domain'
import { parseCommand, ROOM_ID_RE } from '@retroboard/protocol'

describe('snapshot privacy', () => {
  const build = () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'x' }, alice)
    const id = Object.keys(h.state.notes)[0]!
    h.run({ t: 'vote.toggle', id }, bob)
    return { h, id }
  }

  it('never exposes client ids', () => {
    const { h } = build()
    const json = JSON.stringify(buildSnapshot(h.state, bob, [], h.now))
    expect(json).not.toContain(alice.cid)
    expect(json).not.toContain(bob.cid)
    expect(json).not.toContain('ownerCid')
    expect(json).not.toContain('voters')
  })

  it('personalises mine / voted / votesLeft', () => {
    const { h } = build()
    const a = buildSnapshot(h.state, alice, [], h.now)
    const b = buildSnapshot(h.state, bob, [], h.now)
    expect(a.notes[0]).toMatchObject({ mine: true, voted: false, votes: 1 })
    expect(b.notes[0]).toMatchObject({ mine: false, voted: true, votes: 1 })
    expect(a.votesLeft).toBe(3)
    expect(b.votesLeft).toBe(2)
  })

  it('hides counts while secret voting is on, but keeps your own vote', () => {
    const { h } = build()
    h.run({ t: 'settings.update', secretVoting: true })
    const b = buildSnapshot(h.state, bob, [], h.now)
    expect(b.notes[0]).toMatchObject({ votes: null, voted: true })
  })

  it('reports an expired timer as stopped', () => {
    const h = harness()
    h.run({ t: 'timer.start' })
    h.tick(301_000)
    expect(buildSnapshot(h.state, alice, [], h.now).timer).toMatchObject({ running: false, remaining: 0 })
  })
})

describe('schemas', () => {
  it('trims and accepts valid commands', () => {
    expect(parseCommand({ t: 'note.add', columnId: 'abcd1234', text: '  hi  ' })).toMatchObject({ text: 'hi' })
  })

  it.each([
    [{ t: 'note.add', columnId: 'abcd1234', text: '   ' }],
    [{ t: 'note.add', columnId: 'abcd1234', text: 'a'.repeat(281) }],
    [{ t: 'note.add', columnId: '../etc', text: 'x' }],
    [{ t: 'note.add', columnId: 'abcd1234', text: 'x', color: 99 }],
    [{ t: 'column.add', title: 'x', icon: 'not-an-icon' }],
    [{ t: 'timer.reset', minutes: 7 }],
    [{ t: 'settings.update', voteLimit: 0 }],
    [{ t: 'nope' }],
    ['string'],
    [null],
  ])('rejects %j', (raw) => {
    expect(parseCommand(raw)).toBeNull()
  })

  it('validates room ids', () => {
    expect(ROOM_ID_RE.test('a'.repeat(22))).toBe(true)
    expect(ROOM_ID_RE.test('short')).toBe(false)
    expect(ROOM_ID_RE.test('a/b' + 'c'.repeat(30))).toBe(false)
  })
})
