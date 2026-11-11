/**
 * Sealed ballot, end to end on the replicated ledger (change voting-v2-and-ranking, task 1.3): real Ed25519 signatures,
 * real X25519 sealing, the real fold. What a participant can learn from the log, and what a tampered reveal does.
 */
import { describe, expect, it } from 'vitest'
import { type SignedEvent, sealedReveal, type SignerPort, signEvent, verifyEvent } from '@retroboard/application'
import { type Command, emptyLedger, type EventBody, foldEvent, type Ledger } from '@retroboard/domain'
import { ballotKeyPair, type BallotChoice, fromBase64Url, type KeyPair, openBallot, randomKey, sealBallot, toBase64Url } from '@retroboard/crypto'
import { ballotKeysFor, createSessionSigner, ed25519Verifier, type SeedStore, signerFor } from '../app/adapters/signing'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const memory = (): SeedStore => { let v: string | null = null; return { get: () => v, set: (x) => { v = x } } }

/** One board: the log every participant holds, folded as each replica would. */
async function room() {
  const secret = toBase64Url(randomKey().slice(0, 16))
  const fac = (await signerFor(secret))!
  const ballotKeys = (await ballotKeysFor(secret))!
  let ledger = emptyLedger(roomId)
  const log: SignedEvent[] = []
  let n = 0
  const send = async (who: SignerPort, body: EventBody) => {
    const e = await signEvent(who, roomId, { id: `01J${String(++n).padStart(23, '0')}`, at: 1_000 + n * 100, body })
    return receive(e)
  }
  const receive = async (e: SignedEvent) => {
    const verified = await verifyEvent(ed25519Verifier, roomId, e)
    if (!verified) return { ok: false as const, reason: 'bad-signature' }
    const out = foldEvent(ledger, verified)
    if (out.ok) { ledger = out.ledger; log.push(e) }
    return out.ok ? { ok: true as const } : { ok: false as const, reason: out.reason }
  }
  const cmd = (who: SignerPort, c: Command) => send(who, { t: 'cmd', cmd: c, name: null, showName: false })
  await send(fac, { t: 'genesis', roomId, facilitatorKey: fac.publicKey })
  await cmd(fac, { t: 'settings.update', sealedBallot: true, ballotKey: toBase64Url(ballotKeys.publicKey), voteLimit: 3, maxVotesPerItem: 2 })
  const column = ledger.board.columns[0]!.id
  const participant = () => createSessionSigner(memory())
  /** A participant writes an idea and returns its id. */
  const idea = async (who: SignerPort, text: string) => {
    const before = new Set(Object.keys(ledger.board.notes))
    await cmd(who, { t: 'note.add', columnId: column, text })
    return Object.keys(ledger.board.notes).find((id) => !before.has(id))!
  }
  const vote = async (who: SignerPort, choice: BallotChoice) => cmd(who, { t: 'vote.seal', sealed: await sealBallot(ballotKeys.publicKey, { room: roomId, voter: who.publicKey }, choice) })
  const tally = (keys: KeyPair) => sealedReveal(ledger.board, (voter, sealed) => openBallot(keys, { room: roomId, voter }, sealed))
  return { fac, secret, ballotKeys, send, cmd, receive, participant, idea, vote, tally, log, get ledger(): Ledger { return ledger } }
}

describe('a participant cannot attribute a vote', () => {
  it('holds only ciphertext: neither the log nor the folded state names the item a ballot is for', async () => {
    const r = await room()
    const [alice, bob] = [await r.participant(), await r.participant()]
    const x = await r.idea(alice, 'x')
    const y = await r.idea(bob, 'y')
    await r.vote(alice, { kind: 'note', id: y })
    await r.vote(bob, { kind: 'note', id: x })
    const ballots = r.log.filter((e) => e.body.t === 'cmd' && e.body.cmd.t === 'vote.seal')
    expect(ballots).toHaveLength(2)
    for (const e of ballots) for (const id of [x, y]) expect(JSON.stringify(e)).not.toContain(id)
    expect(JSON.stringify(r.ledger.board.sealed)).not.toContain(x)
    expect(r.ledger.board.sealed!.map((b) => b.cid)).toEqual([alice.publicKey, bob.publicKey])
    expect(Object.values(r.ledger.board.notes).every((note) => note.voters.length === 0)).toBe(true)
  })

  it('cannot open anyone\'s ballot with a key of their own, whatever they know of the room', async () => {
    const r = await room()
    const [alice, mallory] = [await r.participant(), await r.participant()]
    const x = await r.idea(alice, 'x')
    await r.vote(alice, { kind: 'note', id: x })
    const [ballot] = r.ledger.board.sealed!
    const attempts: KeyPair[] = [await ballotKeyPair(randomKey()), await ballotKeyPair(fromBase64Url(toBase64Url(randomKey()))!)]
    for (const keys of attempts) {
      // Mallory knows the room, the voter (public in the log) and the ballot ciphertext.
      expect(await openBallot(keys, { room: roomId, voter: ballot!.cid }, ballot!.sealed)).toBeNull()
    }
    expect((await r.tally(attempts[0]!)).counts).toEqual([])
    // The ballot key holder opens it: the mode works.
    expect((await r.tally(r.ballotKeys)).counts).toEqual([{ kind: 'note', id: x, votes: 1 }])
    expect(mallory.publicKey).not.toBe(alice.publicKey)
  })

  it('gains nothing from copying a ballot: the replica refuses it, and it would not open for the copier', async () => {
    const r = await room()
    const [alice, mallory] = [await r.participant(), await r.participant()]
    const x = await r.idea(alice, 'x')
    await r.vote(alice, { kind: 'note', id: x })
    const copied = r.ledger.board.sealed![0]!.sealed
    expect(await r.cmd(mallory, { t: 'vote.seal', sealed: copied })).toEqual({ ok: false, reason: 'invalid' })
    // Even if a replica accepted it, the ballot is bound to Alice: under Mallory's key it does not open.
    expect(await openBallot(r.ballotKeys, { room: roomId, voter: mallory.publicKey }, copied)).toBeNull()
    expect(await openBallot(r.ballotKeys, { room: roomId, voter: alice.publicKey }, copied)).toEqual({ kind: 'note', id: x })
  })

  it('reveals the same thing whoever voted for what: swapping the voters changes nothing public', async () => {
    const elections = []
    for (const swap of [false, true]) {
      const r = await room()
      const [alice, bob] = [await r.participant(), await r.participant()]
      const x = await r.idea(alice, 'x')
      const y = await r.idea(bob, 'y')
      await r.vote(alice, { kind: 'note', id: swap ? y : x })
      await r.vote(bob, { kind: 'note', id: swap ? x : y })
      await r.vote(bob, { kind: 'note', id: x })
      const reveal = await r.tally(r.ballotKeys)
      await r.cmd(r.fac, reveal)
      elections.push({ reveal, voters: [alice.publicKey, bob.publicKey], x, y, board: r.ledger.board })
    }
    const [straight, swapped] = elections as [typeof elections[number], typeof elections[number]]
    // Straight: x gets alice + bob, y gets bob. Swapped: y gets alice, x gets bob twice.
    expect(straight.reveal.counts.map((c) => c.votes).sort()).toEqual([1, 2])
    expect(swapped.reveal.counts.map((c) => c.votes).sort()).toEqual([1, 2])
    for (const e of elections) {
      expect(JSON.stringify(e.reveal)).not.toContain(e.voters[0])
      expect(JSON.stringify(e.reveal)).not.toContain(e.voters[1])
      const voters = new Set(Object.values(e.board.notes).flatMap((note) => note.voters))
      expect([...voters]).toEqual(['~sealed'])
    }
  })
})

describe('the reveal', () => {
  async function voted() {
    const r = await room()
    const [alice, bob, carol] = [await r.participant(), await r.participant(), await r.participant()]
    const x = await r.idea(alice, 'x')
    const y = await r.idea(bob, 'y')
    await r.vote(alice, { kind: 'note', id: x })
    await r.vote(bob, { kind: 'note', id: x })
    await r.vote(carol, { kind: 'note', id: y })
    await r.vote(carol, { kind: 'note', id: 'ghost-note' })
    return { r, alice, bob, carol, x, y }
  }

  it('is the facilitator\'s tally, signed, and every replica applies it', async () => {
    const { r, x, y } = await voted()
    const reveal = await r.tally(r.ballotKeys)
    expect(reveal.counts).toEqual([{ kind: 'note', id: x, votes: 2 }, { kind: 'note', id: y, votes: 1 }].sort((a, b) => (a.id < b.id ? -1 : 1)))
    expect(await r.cmd(r.fac, reveal)).toEqual({ ok: true })
    expect(r.ledger.board.notes[x]!.voters).toHaveLength(2)
    expect(r.ledger.board.settings).toMatchObject({ sealedRevealed: true, votingClosed: true })
  })

  it('is rejected when a byte of it changed after signing', async () => {
    const { r, x } = await voted()
    const reveal = await r.tally(r.ballotKeys)
    const signed = await signEvent(r.fac, roomId, { id: '01JREVEAL0000000000000000', at: 9_000, body: { t: 'cmd', cmd: reveal, name: null, showName: false } })
    expect(await verifyEvent(ed25519Verifier, roomId, signed)).not.toBeNull()
    const inflated = { ...reveal, counts: reveal.counts.map((c) => (c.id === x ? { ...c, votes: c.votes + 1 } : c)) }
    const moved = { ...reveal, counts: reveal.counts.map((c, i) => (i === 0 ? { ...c, id: reveal.counts[1]!.id } : c)) }
    for (const cmd of [inflated, moved, { ...reveal, counts: reveal.counts.slice(1) }]) {
      const tampered: SignedEvent = { ...signed, body: { t: 'cmd', cmd, name: null, showName: false } }
      expect(await r.receive(tampered)).toEqual({ ok: false, reason: 'bad-signature' })
    }
    expect(await r.receive({ ...signed, at: signed.at + 1 })).toEqual({ ok: false, reason: 'bad-signature' })
    expect(r.ledger.board.settings.sealedRevealed).toBeUndefined()
    // Signed for another room, it does not verify either.
    expect(await verifyEvent(ed25519Verifier, 'Zz3dEfGhIjKlMnOpQrStUv', signed)).toBeNull()
  })

  it('is rejected when signed by a participant, with a valid signature or under the facilitator\'s name', async () => {
    const { r, alice, x } = await voted()
    const reveal = await r.tally(r.ballotKeys)
    expect(await r.cmd(alice, reveal)).toEqual({ ok: false, reason: 'not-facilitator' })
    const forged = await signEvent(alice, roomId, { id: '01JFORGED00000000000000000', at: 9_000, body: { t: 'cmd', cmd: reveal, name: null, showName: false } })
    expect(await r.receive({ ...forged, author: r.fac.publicKey })).toEqual({ ok: false, reason: 'bad-signature' })
    expect(r.ledger.board.notes[x]!.voters).toHaveLength(0)
  })

  it('is rejected, even from the facilitator, when it claims more than the ballots allow', async () => {
    const { r, x, y } = await voted()
    expect(await r.cmd(r.fac, { t: 'vote.reveal', counts: [{ kind: 'note', id: x, votes: 7 }] })).toEqual({ ok: false, reason: 'invalid' })
    expect(await r.cmd(r.fac, { t: 'vote.reveal', counts: [{ kind: 'note', id: x, votes: 2 }, { kind: 'note', id: y, votes: 3 }] })).toEqual({ ok: false, reason: 'invalid' })
    expect(r.ledger.board.settings.sealedRevealed).toBeUndefined()
  })

  it('cannot be replayed or followed by another: it happens once', async () => {
    const { r, x } = await voted()
    const reveal = await r.tally(r.ballotKeys)
    const signed = await signEvent(r.fac, roomId, { id: '01JREVEAL0000000000000000', at: 9_000, body: { t: 'cmd', cmd: reveal, name: null, showName: false } })
    expect(await r.receive(signed)).toEqual({ ok: true })
    expect(await r.receive(signed)).toEqual({ ok: false, reason: 'invalid' })
    expect(await r.cmd(r.fac, { t: 'vote.reveal', counts: [{ kind: 'note', id: x, votes: 1 }] })).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('the facilitator leaves before the reveal', () => {
  it('keeps the ballots, and the link holder tallies from another device', async () => {
    const r = await room()
    const [alice, bob] = [await r.participant(), await r.participant()]
    const x = await r.idea(alice, 'x')
    await r.vote(alice, { kind: 'note', id: x })
    await r.vote(bob, { kind: 'note', id: x })
    // Hand-over to Bob, who has no link: he leads, but cannot read the ballots.
    await r.send(r.fac, { t: 'role.handover', key: bob.publicKey })
    expect(r.ledger.lead).toBe(bob.publicKey)
    expect(r.ledger.board.sealed).toHaveLength(2)
    expect((await r.tally(await ballotKeyPair(randomKey()))).counts).toEqual([])
    // The link opened on a new device derives the same key and reads them.
    const otherDevice = (await ballotKeysFor(r.secret))!
    expect(otherDevice).toEqual(r.ballotKeys)
    const reveal = await r.tally(otherDevice)
    expect(reveal.counts).toEqual([{ kind: 'note', id: x, votes: 2 }])
    expect(await r.cmd(r.fac, reveal)).toEqual({ ok: true })
  })

  it('lets a lead without the link start a new round with its own key', async () => {
    const r = await room()
    const [alice, bob] = [await r.participant(), await r.participant()]
    const x = await r.idea(alice, 'x')
    await r.vote(alice, { kind: 'note', id: x })
    await r.send(r.fac, { t: 'role.handover', key: bob.publicKey })
    const own = await ballotKeyPair(randomKey())
    // The old ballots are sealed to a key nobody here holds: the key cannot change until the round is reset.
    expect(await r.cmd(bob, { t: 'settings.update', ballotKey: toBase64Url(own.publicKey) })).toEqual({ ok: false, reason: 'not-empty' })
    expect(await r.cmd(bob, { t: 'vote.reset' })).toEqual({ ok: true })
    expect(await r.cmd(bob, { t: 'settings.update', ballotKey: toBase64Url(own.publicKey) })).toEqual({ ok: true })
    await r.cmd(alice, { t: 'vote.seal', sealed: await sealBallot(own.publicKey, { room: roomId, voter: alice.publicKey }, { kind: 'note', id: x }) })
    expect((await r.tally(own)).counts).toEqual([{ kind: 'note', id: x, votes: 1 }])
    expect((await r.tally(r.ballotKeys)).counts).toEqual([])
  })
})
