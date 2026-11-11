import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { type Actor, type BoardState, type Command, reduce, revealIsPlausible, SEALED_RE, tallyBallots } from '../src'

const KEY = 'k'.repeat(43)
const sealedValue = (n: number) => `S${String(n).padStart(3, '0')}`.padEnd(134, 'x')
/** The reducer without the protocol in front: what a replica runs on an event that passed the signature. */
const direct = (s: BoardState, cmd: Command, who: Actor = alice) => reduce(s, cmd, who, { now: 1, newId: () => 'unused-id-0001' })

function board(over: Record<string, unknown> = {}) {
  const h = harness()
  h.run({ t: 'note.add', columnId: h.col(0), text: 'a' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'b' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'c' })
  const [a, b, c] = Object.values(h.state.notes).sort((x, y) => x.text.localeCompare(y.text)).map((n) => n.id) as [string, string, string]
  h.run({ t: 'settings.update', sealedBallot: true, ballotKey: KEY, voteLimit: 3, maxVotesPerItem: 2, ...over })
  return { h, a, b, c }
}

describe('the shape of a sealed ballot', () => {
  it('is 120 to 400 url-safe characters, all of them', () => {
    expect(SEALED_RE.test('x'.repeat(134))).toBe(true)
    expect(SEALED_RE.test('A-_9'.repeat(30))).toBe(true)
    expect(SEALED_RE.test('x'.repeat(119))).toBe(false)
    expect(SEALED_RE.test('x'.repeat(401))).toBe(false)
    expect(SEALED_RE.test(` ${'x'.repeat(133)}`)).toBe(false)
    expect(SEALED_RE.test(`${'x'.repeat(133)} `)).toBe(false)
    expect(SEALED_RE.test(`${'x'.repeat(60)}!${'x'.repeat(73)}`)).toBe(false)
  })
})

describe('what a sealed vote changes', () => {
  it('marks the settings of the board, and nothing else, as changed when a ballot is cast or withdrawn', () => {
    const { h } = board()
    const cast = direct(h.state, { t: 'vote.seal', sealed: sealedValue(1) })
    expect(cast).toMatchObject({ ok: true, dirty: { meta: true, notes: [], groups: [], actions: [], wipe: false } })
    const state = (cast as { state: BoardState }).state
    expect(direct(state, { t: 'vote.unseal', sealed: sealedValue(1) })).toMatchObject({ ok: true, dirty: { meta: true }, state: { sealed: [] } })
  })

  it('changes nothing when there is nothing of mine to withdraw', () => {
    const { h } = board()
    // No ballot at all, then a ballot of someone else, then a value nobody cast.
    expect(direct(h.state, { t: 'vote.unseal', sealed: sealedValue(1) })).toMatchObject({ ok: true, state: h.state, dirty: { meta: false } })
    h.run({ t: 'vote.seal', sealed: sealedValue(1) })
    h.run({ t: 'vote.seal', sealed: sealedValue(2) }, bob)
    expect(direct(h.state, { t: 'vote.unseal', sealed: sealedValue(1) }, bob)).toMatchObject({ ok: true, state: h.state, dirty: { meta: false } })
    expect(direct(h.state, { t: 'vote.unseal', sealed: sealedValue(9) })).toMatchObject({ ok: true, state: h.state, dirty: { meta: false } })
  })

  it('withdraws only the ballot named, whatever else the voter cast', () => {
    const { h } = board()
    for (const n of [1, 2, 3]) h.run({ t: 'vote.seal', sealed: sealedValue(n) })
    h.run({ t: 'vote.seal', sealed: sealedValue(4) }, bob)
    expect(direct(h.state, { t: 'vote.unseal', sealed: sealedValue(2) })).toMatchObject({
      state: { sealed: [{ cid: alice.cid, sealed: sealedValue(1) }, { cid: alice.cid, sealed: sealedValue(3) }, { cid: bob.cid, sealed: sealedValue(4) }] },
    })
  })

  it('refuses a ballot once the reveal is in, even if voting was opened again by an agenda', () => {
    const { h, a } = board()
    h.run({ t: 'vote.seal', sealed: sealedValue(1) })
    h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 1 }] })
    const reopened: BoardState = { ...h.state, settings: { ...h.state.settings, votingClosed: false } }
    expect(direct(reopened, { t: 'vote.seal', sealed: sealedValue(2) })).toEqual({ ok: false, error: 'voting-closed' })
  })

  it('cannot start once a cluster holds a vote either', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'a' })
    h.run({ t: 'note.add', columnId: h.col(0), text: 'b' })
    const [a, b] = Object.keys(h.state.notes)
    h.run({ t: 'note.group', id: a!, ontoId: b! })
    const cluster = Object.keys(h.state.groups)[0]!
    // A cluster nobody voted for is no obstacle.
    expect(h.run({ t: 'settings.update', sealedBallot: true, ballotKey: KEY }).ok).toBe(true)
    expect(h.run({ t: 'settings.update', sealedBallot: false }).ok).toBe(true)
    expect(h.run({ t: 'vote.add', kind: 'cluster', id: cluster }).ok).toBe(true)
    // The only vote is on a cluster: the mode still cannot start.
    expect(h.run({ t: 'settings.update', sealedBallot: true, ballotKey: KEY })).toEqual({ ok: false, error: 'not-empty' })
  })

  it('checks the key itself, not only that there is one (a replica does not trust the protocol layer)', () => {
    const h = harness()
    expect(direct(h.state, { t: 'settings.update', sealedBallot: true, ballotKey: 'short' } as Command)).toEqual({ ok: false, error: 'invalid' })
    expect(direct(h.state, { t: 'settings.update', sealedBallot: true } as Command)).toEqual({ ok: false, error: 'invalid' })
  })
})

describe('what a reveal changes', () => {
  function mixed() {
    const { h, a, b, c } = board({ voteLimit: 4 })
    h.run({ t: 'note.group', id: b, ontoId: c })
    const cluster = Object.keys(h.state.groups)[0]!
    for (const n of [1, 2, 3]) h.run({ t: 'vote.seal', sealed: sealedValue(n) })
    h.run({ t: 'vote.seal', sealed: sealedValue(4) }, bob)
    return { h, a, cluster }
  }

  it('lists the notes and the clusters it touched, each under its own kind', () => {
    const { h, a, cluster } = mixed()
    expect(direct(h.state, { t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 2 }, { kind: 'cluster', id: cluster, votes: 2 }] })).toMatchObject({
      ok: true,
      dirty: { meta: true, notes: [a], groups: [cluster] },
    })
  })

  it('keeps every note when only clusters were voted, and every cluster when only notes were', () => {
    const { h, a, cluster } = mixed()
    const onlyNote = direct(h.state, { t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 2 }] }) as { state: BoardState; dirty: unknown }
    expect(Object.keys(onlyNote.state.groups)).toEqual([cluster])
    expect(onlyNote.state.notes[a]!.voters).toHaveLength(2)
    expect(onlyNote).toMatchObject({ dirty: { notes: [a], groups: [] } })
    const onlyCluster = direct(h.state, { t: 'vote.reveal', counts: [{ kind: 'cluster', id: cluster, votes: 2 }] }) as { state: BoardState; dirty: unknown }
    expect(Object.keys(onlyCluster.state.notes)).toEqual(Object.keys(h.state.notes))
    expect(onlyCluster.state.groups[cluster]!.voters).toHaveLength(2)
    expect(onlyCluster).toMatchObject({ dirty: { notes: [], groups: [cluster] } })
  })
})

describe('what a reveal can be, judged by public data', () => {
  // maxVotesPerItem 1: Alice's two ballots can give an item one vote each, Bob's one ballot one, so an item has at most 2.
  function spread() {
    const { h, a, b } = board({ maxVotesPerItem: 1 })
    h.run({ t: 'vote.seal', sealed: sealedValue(1) })
    h.run({ t: 'vote.seal', sealed: sealedValue(2) })
    h.run({ t: 'vote.seal', sealed: sealedValue(3) }, bob)
    return { s: h.state, a, b }
  }

  it('bounds an item by what each voter could put on it, even when the total fits', () => {
    const { s, a } = spread()
    expect(revealIsPlausible(s, [{ kind: 'note', id: a, votes: 2 }])).toBe(true)
    expect(revealIsPlausible(s, [{ kind: 'note', id: a, votes: 3 }])).toBe(false)
  })

  it('takes the smaller of the item cap and the ballots a voter cast', () => {
    const { h, a } = board({ maxVotesPerItem: 3 })
    h.run({ t: 'vote.seal', sealed: sealedValue(1) })
    h.run({ t: 'vote.seal', sealed: sealedValue(2) })
    h.run({ t: 'vote.seal', sealed: sealedValue(3) }, bob)
    // Alice could give 2 (two ballots, cap 3), Bob 1: 3 at most. With max instead of min it would be 6.
    expect(revealIsPlausible(h.state, [{ kind: 'note', id: a, votes: 3 }])).toBe(true)
    const lone = board({ maxVotesPerItem: 3, voteLimit: 5 })
    for (const n of [1, 2, 3, 4]) lone.h.run({ t: 'vote.seal', sealed: sealedValue(n) })
    expect(revealIsPlausible(lone.h.state, [{ kind: 'note', id: lone.a, votes: 4 }])).toBe(false)
  })

  it('refuses an item with no vote, a fraction, or twice the same item', () => {
    const { s, a } = spread()
    expect(revealIsPlausible(s, [{ kind: 'note', id: a, votes: 0 }])).toBe(false)
    expect(revealIsPlausible(s, [{ kind: 'note', id: a, votes: 1.5 }])).toBe(false)
    expect(revealIsPlausible(s, [{ kind: 'note', id: a, votes: 1 }, { kind: 'note', id: a, votes: 1 }])).toBe(false)
    expect(revealIsPlausible(s, [{ kind: 'note', id: a, votes: 1 }, { kind: 'cluster', id: a, votes: 1 }])).toBe(true)
  })
})

describe('the order of a tally', () => {
  const s = (() => {
    const { h } = board()
    return h.state
  })()
  const ids = Object.keys(s.notes)
  const opened = (kind: 'note' | 'cluster', id: string) => ({ cid: alice.cid, choice: { kind, id } }) as const

  it('is by kind then id whatever the order the ballots came in', () => {
    const wanted = [{ kind: 'note', id: [...ids].sort()[0]! }, { kind: 'note', id: [...ids].sort()[1]! }, { kind: 'note', id: [...ids].sort()[2]! }]
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
    for (const p of perms) {
      const sorted = [...ids].sort()
      const out = tallyBallots({ ...s, settings: { ...s.settings, voteLimit: 9 } }, p.map((i) => opened('note', sorted[i]!)))
      expect(out.map(({ kind, id }) => ({ kind, id }))).toEqual(wanted)
    }
  })
})
