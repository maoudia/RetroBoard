import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { buildSnapshot, type Command, countsHidden, emptyLedger, type EventBody, foldAll, foldEvent, MAX_REVEAL_ITEMS, type OpenedBallot, SEALED_VOTER, tallyBallots, type VerifiedEvent, votesUsedBy } from '../src'

const carol = { cid: 'carol-client-id-0003', name: 'Carol', showName: false }
const KEY = 'k'.repeat(43)
/** A well-formed sealed value (the domain checks shape and uniqueness, never content). */
const sealedValue = (n: number) => `S${String(n).padStart(3, '0')}`.padEnd(134, 'x')

function sealedBoard(over: Record<string, unknown> = {}) {
  const h = harness()
  h.run({ t: 'note.add', columnId: h.col(0), text: 'a' })
  h.run({ t: 'note.add', columnId: h.col(0), text: 'b' })
  const [a, b] = Object.values(h.state.notes).sort((x, y) => x.text.localeCompare(y.text)).map((n) => n.id) as [string, string]
  expect(h.run({ t: 'settings.update', sealedBallot: true, ballotKey: KEY, voteLimit: 3, maxVotesPerItem: 2, ...over }).ok).toBe(true)
  return { h, a, b }
}
const snap = (h: ReturnType<typeof harness>, cid = alice.cid) => buildSnapshot(h.state, { cid }, [], h.now)
const open = (cid: string, kind: 'note' | 'cluster', id: string): OpenedBallot => ({ cid, choice: { kind, id } })

describe('sealed ballot mode', () => {
  it('needs a well-formed ballot key and is off by default', () => {
    const h = harness()
    expect(h.state.settings.sealedBallot).toBeUndefined()
    expect(h.run({ t: 'settings.update', sealedBallot: true })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'settings.update', sealedBallot: true, ballotKey: 'short' })).toEqual({ ok: false, error: 'invalid' })
    // A key alone does not switch the mode on.
    expect(h.run({ t: 'settings.update', ballotKey: KEY }).ok).toBe(true)
    expect(h.state.settings.sealedBallot).toBeUndefined()
    expect(h.state.settings.ballotKey).toBeUndefined()
    expect(h.run({ t: 'settings.update', sealedBallot: true, ballotKey: KEY }).ok).toBe(true)
    expect(h.state.settings).toMatchObject({ sealedBallot: true, ballotKey: KEY })
  })

  it('keeps one mode and one key for a round: no change while a vote exists, a reset starts a new round', () => {
    const { h } = sealedBoard()
    h.run({ t: 'vote.seal', sealed: sealedValue(1) })
    expect(h.run({ t: 'settings.update', sealedBallot: false })).toEqual({ ok: false, error: 'not-empty' })
    expect(h.run({ t: 'settings.update', ballotKey: 'z'.repeat(43) })).toEqual({ ok: false, error: 'not-empty' })
    // Saying what is already true is not a change.
    expect(h.run({ t: 'settings.update', sealedBallot: true, ballotKey: KEY }).ok).toBe(true)
    h.run({ t: 'vote.reset' })
    expect(h.state.sealed).toBeUndefined()
    expect(h.run({ t: 'settings.update', ballotKey: 'z'.repeat(43) }).ok).toBe(true)
    expect(h.state.settings.ballotKey).toBe('z'.repeat(43))
    expect(h.run({ t: 'settings.update', sealedBallot: false }).ok).toBe(true)
    expect(h.state.settings).not.toHaveProperty('sealedBallot')
    expect(h.state.settings).not.toHaveProperty('ballotKey')
  })

  it('cannot start after plain votes were cast', () => {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'a' })
    const id = Object.keys(h.state.notes)[0]!
    h.run({ t: 'vote.add', kind: 'note', id })
    expect(h.run({ t: 'settings.update', sealedBallot: true, ballotKey: KEY })).toEqual({ ok: false, error: 'not-empty' })
  })

  it('refuses plain votes, so no choice travels in clear', () => {
    const { h, a } = sealedBoard()
    expect(h.run({ t: 'vote.add', kind: 'note', id: a })).toEqual({ ok: false, error: 'forbidden' })
    expect(h.run({ t: 'vote.toggle', id: a })).toEqual({ ok: false, error: 'forbidden' })
    expect(h.run({ t: 'vote.remove', kind: 'note', id: a })).toEqual({ ok: false, error: 'forbidden' })
    expect(votesUsedBy(h.state, alice.cid)).toBe(0)
  })
})

describe('casting and withdrawing', () => {
  it('records who cast how many ballots, and nothing else about the choice', () => {
    const { h } = sealedBoard()
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(1) }).ok).toBe(true)
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(2) }, bob).ok).toBe(true)
    expect(h.state.sealed).toEqual([{ cid: alice.cid, sealed: sealedValue(1) }, { cid: bob.cid, sealed: sealedValue(2) }])
    expect(votesUsedBy(h.state, alice.cid)).toBe(1)
    expect(snap(h).votesLeft).toBe(2)
  })

  it('enforces the per-person budget from public data, for every voter alike', () => {
    const { h } = sealedBoard()
    for (const n of [1, 2, 3]) expect(h.run({ t: 'vote.seal', sealed: sealedValue(n) }).ok).toBe(true)
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(4) })).toEqual({ ok: false, error: 'vote-limit' })
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(5) }, bob).ok).toBe(true)
    expect(snap(h).votesLeft).toBe(0)
    expect(snap(h, bob.cid).votesLeft).toBe(2)
  })

  it('refuses a copied ballot, a malformed one, and any ballot outside the mode', () => {
    const { h } = sealedBoard()
    h.run({ t: 'vote.seal', sealed: sealedValue(1) })
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(1) }, bob)).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(1) })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'vote.seal', sealed: 'short' })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'vote.seal', sealed: `${'x'.repeat(133)} ` })).toEqual({ ok: false, error: 'invalid' })
    const plain = harness()
    expect(plain.run({ t: 'vote.seal', sealed: sealedValue(1) })).toEqual({ ok: false, error: 'invalid' })
    expect(plain.run({ t: 'vote.unseal', sealed: sealedValue(1) })).toEqual({ ok: false, error: 'invalid' })
  })

  it('refuses ballots when locked or closed, and after the reveal', () => {
    const { h } = sealedBoard()
    h.run({ t: 'settings.update', locked: true })
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(1) })).toEqual({ ok: false, error: 'locked' })
    h.run({ t: 'settings.update', locked: false })
    h.run({ t: 'vote.close' })
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(1) })).toEqual({ ok: false, error: 'voting-closed' })
    expect(h.run({ t: 'vote.unseal', sealed: sealedValue(1) })).toEqual({ ok: false, error: 'voting-closed' })
    h.run({ t: 'vote.reopen' })
    h.run({ t: 'vote.reveal', counts: [] })
    h.run({ t: 'vote.reopen' })
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(1) })).toEqual({ ok: false, error: 'voting-closed' })
  })

  it('lets a voter withdraw their own ballot and nobody else\'s', () => {
    const { h } = sealedBoard()
    h.run({ t: 'vote.seal', sealed: sealedValue(1) })
    h.run({ t: 'vote.seal', sealed: sealedValue(2) }, bob)
    // Bob cannot withdraw Alice's ballot, even knowing its value; withdrawing something that is not there changes nothing.
    expect(h.run({ t: 'vote.unseal', sealed: sealedValue(1) }, bob).ok).toBe(true)
    expect(h.run({ t: 'vote.unseal', sealed: sealedValue(9) }).ok).toBe(true)
    expect(h.state.sealed).toHaveLength(2)
    expect(h.run({ t: 'vote.unseal', sealed: sealedValue(1) }).ok).toBe(true)
    expect(h.state.sealed).toEqual([{ cid: bob.cid, sealed: sealedValue(2) }])
    expect(snap(h).votesLeft).toBe(3)
  })
})

describe('what a participant replica shows', () => {
  it('hides counts until the reveal, even after voting is closed, and never carries a ballot', () => {
    const { h, a } = sealedBoard()
    h.run({ t: 'vote.seal', sealed: sealedValue(1) })
    h.run({ t: 'vote.close' })
    const closed = snap(h, bob.cid)
    expect(closed.notes.every((n) => n.votes === null)).toBe(true)
    expect(JSON.stringify(closed)).not.toContain(sealedValue(1))
    expect(countsHidden(h.state.settings)).toBe(true)
    h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 1 }] })
    expect(countsHidden(h.state.settings)).toBe(false)
    expect(snap(h, bob.cid).notes.find((n) => n.id === a)!.votes).toBe(1)
  })
})

describe('tally', () => {
  it('counts per item and carries no voter', () => {
    const { h, a, b } = sealedBoard()
    const counts = tallyBallots(h.state, [open(alice.cid, 'note', a), open(bob.cid, 'note', a), open(carol.cid, 'note', b)])
    expect(counts).toEqual([{ kind: 'note', id: a, votes: 2 }, { kind: 'note', id: b, votes: 1 }].sort((x, y) => (x.id < y.id ? -1 : 1)))
    expect(JSON.stringify(counts)).not.toMatch(/client-id/)
  })

  it('drops what a ballot cannot be: unopened, unknown, unvotable, over the per-item cap or the budget', () => {
    const { h, a, b } = sealedBoard()
    expect(tallyBallots(h.state, [{ cid: alice.cid, choice: null }, open(alice.cid, 'note', 'ghost-id'), open(alice.cid, 'cluster', a)])).toEqual([])
    // maxVotesPerItem 2, voteLimit 3: a, a, (a refused), b, then the budget is spent.
    const over = tallyBallots(h.state, [open(alice.cid, 'note', a), open(alice.cid, 'note', a), open(alice.cid, 'note', a), open(alice.cid, 'note', b), open(alice.cid, 'note', b)])
    expect(over).toEqual([{ kind: 'note', id: a, votes: 2 }, { kind: 'note', id: b, votes: 1 }].sort((x, y) => (x.id < y.id ? -1 : 1)))
    // The cap and the budget are per voter: Bob still has all of his.
    expect(tallyBallots(h.state, [...Array(3).fill(open(alice.cid, 'note', a)), open(bob.cid, 'note', a)])).toEqual([{ kind: 'note', id: a, votes: 3 }])
  })

  it('orders items by kind then id, whatever the order of the ballots', () => {
    const { h } = sealedBoard()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'c' })
    const [n1, n2, n3] = Object.values(h.state.notes).sort((x, y) => x.text.localeCompare(y.text)).map((n) => n.id) as [string, string, string]
    h.run({ t: 'note.group', id: n1, ontoId: n2 })
    const g = Object.keys(h.state.groups)[0]!
    const expected = [{ kind: 'cluster', id: g, votes: 1 }, { kind: 'note', id: n3, votes: 1 }]
    expect(tallyBallots(h.state, [open(alice.cid, 'note', n3), open(bob.cid, 'cluster', g)])).toEqual(expected)
    expect(tallyBallots(h.state, [open(bob.cid, 'cluster', g), open(alice.cid, 'note', n3)])).toEqual(expected)
  })
})

describe('reveal', () => {
  function voted() {
    const { h, a, b } = sealedBoard()
    for (const [n, who] of [[1, alice], [2, alice], [3, bob], [4, carol]] as const) h.run({ t: 'vote.seal', sealed: sealedValue(n) }, who)
    return { h, a, b }
  }

  it('turns the counts into anonymous votes, closes voting and works with ranking unchanged', () => {
    const { h, a, b } = voted()
    const out = h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 3 }, { kind: 'note', id: b, votes: 1 }] })
    expect(out.ok).toBe(true)
    expect(h.state.notes[a]!.voters).toEqual([SEALED_VOTER, SEALED_VOTER, SEALED_VOTER])
    expect(h.state.settings).toMatchObject({ votingClosed: true, sealedRevealed: true })
    const view = snap(h, bob.cid)
    expect(view.notes.find((n) => n.id === a)).toMatchObject({ votes: 3, voted: false, myVotes: 0 })
  })

  it('applies to clusters as well', () => {
    const { h, a, b } = voted()
    h.run({ t: 'settings.update', votable: 'both' })
    h.run({ t: 'note.group', id: a, ontoId: b })
    const g = Object.keys(h.state.groups)[0]!
    expect(h.run({ t: 'vote.reveal', counts: [{ kind: 'cluster', id: g, votes: 2 }] }).ok).toBe(true)
    expect(h.state.groups[g]!.voters).toEqual([SEALED_VOTER, SEALED_VOTER])
  })

  it.each([
    ['more votes than ballots', (a: string) => [{ kind: 'note' as const, id: a, votes: 3 }, { kind: 'note' as const, id: 'ghost-note', votes: 2 }]],
    ['more on one item than the voters could give', (a: string) => [{ kind: 'note' as const, id: a, votes: 5 }]],
    ['the same item twice', (a: string) => [{ kind: 'note' as const, id: a, votes: 1 }, { kind: 'note' as const, id: a, votes: 1 }]],
    ['an item that does not exist', () => [{ kind: 'note' as const, id: 'ghost-note', votes: 1 }]],
  ])('ignores a reveal with %s', (_, make) => {
    const { h, a } = voted()
    const before = h.state
    expect(h.run({ t: 'vote.reveal', counts: make(a) }).ok).toBe(false)
    expect(h.state).toBe(before)
  })

  it('bounds one item by what each voter could put on it', () => {
    const { h, a } = voted()
    // Three voters, per-item cap 2, but only Alice cast two ballots: at most 2 + 1 + 1.
    expect(h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 4 }] }).ok).toBe(true)
    const again = voted()
    expect(again.h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: again.a, votes: 5 }] }).ok).toBe(false)
  })

  it('refuses an item that cannot be voted', () => {
    const { h, a } = voted()
    h.run({ t: 'settings.update', votable: 'clusters' })
    expect(h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 1 }] })).toEqual({ ok: false, error: 'not-votable' })
    expect(h.state.settings.sealedRevealed).toBeUndefined()
  })

  it('happens once, only in the mode, and the result is final', () => {
    const { h, a } = voted()
    expect(h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 1 }] }).ok).toBe(true)
    expect(h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 2 }] })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'vote.reopen' })).toEqual({ ok: false, error: 'forbidden' })
    expect(h.state.notes[a]!.voters).toHaveLength(1)
    const plain = harness()
    expect(plain.run({ t: 'vote.reveal', counts: [] })).toEqual({ ok: false, error: 'invalid' })
  })

  it('refuses a reveal larger than the message budget', () => {
    const { h } = voted()
    const counts = Array.from({ length: MAX_REVEAL_ITEMS + 1 }, (_, i) => ({ kind: 'note' as const, id: `note${String(i).padStart(4, '0')}`, votes: 1 }))
    expect(h.run({ t: 'vote.reveal', counts })).toEqual({ ok: false, error: 'invalid' })
  })

  it.each(['vote.reset', 'board.reset'] as const)('starts a new round with %s: ballots and reveal are gone, the mode and key stay', (t) => {
    const { h, a } = voted()
    h.run({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 1 }] })
    expect(h.run({ t }).ok).toBe(true)
    expect(h.state.sealed).toBeUndefined()
    expect(h.state.settings).toMatchObject({ sealedBallot: true, ballotKey: KEY })
    expect(h.state.settings.sealedRevealed).toBeUndefined()
    // board.reset leaves voting as it was (closed); the facilitator reopens it, which the reveal no longer forbids.
    expect(h.run({ t: 'vote.reopen' }).ok).toBe(true)
    expect(h.run({ t: 'vote.seal', sealed: sealedValue(1) }).ok).toBe(true)
  })
})

describe('in the replicated ledger', () => {
  const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
  const key = (c: string) => c.repeat(42) + 'A'
  const FAC = key('f'); const ALICE = key('a'); const BOB = key('b')
  let seq = 0
  const ev = (author: string, body: EventBody): VerifiedEvent => ({ id: `01J${String(++seq).padStart(23, '0')}`, at: 1_000 + seq * 100, author, body })
  const cmd = (author: string, c: Command) => ev(author, { t: 'cmd', cmd: c, name: null, showName: false })
  const noteId = (l: ReturnType<typeof emptyLedger>) => Object.keys(l.board.notes)[0]!

  function round(openFacilitation = false) {
    const events = [
      ev(FAC, { t: 'genesis', roomId, facilitatorKey: FAC }),
      cmd(FAC, { t: 'settings.update', openFacilitation, sealedBallot: true, ballotKey: KEY, voteLimit: 3 }),
      cmd(ALICE, { t: 'note.add', columnId: emptyLedger(roomId).board.columns[0]!.id, text: 'idea' }),
      cmd(ALICE, { t: 'vote.seal', sealed: sealedValue(1) }),
      cmd(BOB, { t: 'vote.seal', sealed: sealedValue(2) }),
    ]
    return foldAll(emptyLedger(roomId), events)
  }

  it('lets the facilitator reveal and nobody else, even when everyone facilitates', () => {
    for (const open of [false, true]) {
      const l = round(open)
      expect(l.board.sealed).toHaveLength(2)
      const reveal: Command = { t: 'vote.reveal', counts: [{ kind: 'note', id: noteId(l), votes: 2 }] }
      for (const who of [ALICE, BOB]) expect(foldEvent(l, cmd(who, reveal))).toMatchObject({ ok: false, reason: 'not-facilitator' })
      const revealed = foldEvent(l, cmd(FAC, reveal))
      expect(revealed.ok).toBe(true)
      expect(revealed.ledger.board.settings.sealedRevealed).toBe(true)
    }
  })

  it('lets only the facilitator turn the mode on or choose its key, even when everyone facilitates', () => {
    const l = foldAll(emptyLedger(roomId), [ev(FAC, { t: 'genesis', roomId, facilitatorKey: FAC }), cmd(FAC, { t: 'settings.update', openFacilitation: true })])
    for (const patch of [{ sealedBallot: true, ballotKey: KEY }, { ballotKey: KEY }, { sealedBallot: false }]) {
      expect(foldEvent(l, cmd(ALICE, { t: 'settings.update', ...patch }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    }
    expect(foldEvent(l, cmd(FAC, { t: 'settings.update', sealedBallot: true, ballotKey: KEY })).ok).toBe(true)
  })

  it('ignores a reveal that fails the public checks, identically for every replica', () => {
    const l = round()
    const forged = cmd(FAC, { t: 'vote.reveal', counts: [{ kind: 'note', id: noteId(l), votes: 9 }] })
    expect(foldEvent(l, forged)).toMatchObject({ ok: false, reason: 'invalid' })
    expect(foldAll(l, [forged]).board).toEqual(l.board)
  })
})
