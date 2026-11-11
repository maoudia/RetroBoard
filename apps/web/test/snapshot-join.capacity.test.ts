import { type EventBody, type SignedSnapshot, type SignerPort, signEvent, snapshotMessage } from '@retroboard/application'
import { deriveContentKey, fromBase64Url, open, randomKey, seal, toBase64Url, utf8 } from '@retroboard/crypto'
import { envelopeAad, PROTOCOL_VERSION, SNAP_CHUNK_CHARS } from '@retroboard/protocol'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { signerFor } from '../app/adapters/signing'
import { createBoardAs, MemoryReplica, type Peer, World } from './sync-harness'

let world: World
afterEach(() => world?.dispose())

const EVENTS = 3_000
const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')
const lastLine = (p: Peer) => p.snapshot?.chat?.at(-1)?.text

/**
 * A facilitator whose device holds a board of 3,000 chat events, an hour old, and who reopens it: it signs a snapshot once
 * it has folded them (ADR-0037). Returns the world, the facilitator and the clock of the first filler event.
 */
async function longBoard(relayHistory = false): Promise<{ alice: Peer; from: number }> {
  world = new World()
  // With a complete mesh no board event crosses the relay (ADR-0024): a joiner then gets the history from a peer only.
  world.relay.refusePub = !relayHistory
  const replica = new MemoryReplica()
  const seed = { value: null }
  const first = await world.join('alice', { facilitator: true, replica, seed })
  await createBoardAs(world, first)
  first.note('before the history')
  await world.run(500)
  first.close()
  const from = Date.now() + 1_000
  const last = await world.fillChat(replica, EVENTS, from)
  vi.setSystemTime(last + 3_600_000)
  const alice = await world.join('alice', { facilitator: true, replica, seed })
  expect(await world.until(() => lastLine(alice) === `line ${EVENTS - 1}`, 60_000)).toBe(true)
  // The snapshot is signed shortly after the board settles.
  await world.run(3_000)
  return { alice, from }
}

/** Frames of the snapshot Alice sends to whoever asks (recorded on its data channels). */
function recordSnapshotFrames(): string[] {
  const frames: string[] = []
  world.rtc.tap = (owner, text) => { if (owner === 'alice' && text.startsWith('{"t":"snap"')) frames.push(text); return [text] }
  return frames
}

/** A participant with the link rewrites Alice's snapshot: `edit` changes it (the signature then no longer matches unless `signer` signs it again). */
async function forge(frames: string[], edit: (s: SignedSnapshot) => SignedSnapshot, signer?: SignerPort): Promise<string[]> {
  const key = await deriveContentKey(fromBase64Url(world.roomKey)!, world.roomId)
  const parsed = frames.map((f) => JSON.parse(f) as { sid: string; hlc: number; part: string })
  const head = { v: PROTOCOL_VERSION, room: world.roomId, id: parsed[0]!.sid, hlc: parsed[0]!.hlc } as const
  const plain = await open(key, fromBase64Url(parsed.map((p) => p.part).join(''))!, utf8(envelopeAad(head)))
  let snap = edit(JSON.parse(new TextDecoder().decode(plain!)) as SignedSnapshot)
  if (signer) {
    const { sig: _old, ...rest } = snap
    snap = { ...rest, sig: await signer.sign(snapshotMessage(rest)) }
  }
  const ct = toBase64Url(await seal(key, utf8(JSON.stringify(snap)), utf8(envelopeAad(head))))
  const n = Math.ceil(ct.length / SNAP_CHUNK_CHARS)
  return Array.from({ length: n }, (_, i) => JSON.stringify({ t: 'snap', sid: head.id, hlc: head.hlc, i, n, part: ct.slice(i * SNAP_CHUNK_CHARS, (i + 1) * SNAP_CHUNK_CHARS) }))
}

/** Alice answers a joiner with `replacement` instead of her snapshot (the frames of the chunks after the first are swallowed). */
function serve(replacement: string[]): void {
  world.rtc.tap = (owner, text) => {
    if (owner !== 'alice' || !text.startsWith('{"t":"snap"')) return [text]
    return (JSON.parse(text) as { i: number }).i === 0 ? replacement : []
  }
}

const boardsMatch = (a: Peer, b: Peer) => JSON.stringify([a.notes, a.snapshot?.chat?.map((m) => m.text)]) === JSON.stringify([b.notes, b.snapshot?.chat?.map((m) => m.text)])

describe('snapshot-based join of a board of 3,000 events', { timeout: 300_000 }, () => {
  it('a late joiner starts from the facilitator snapshot and verifies a handful of signatures', async () => {
    const { alice } = await longBoard()
    expect(alice.verifies).toBeGreaterThanOrEqual(EVENTS)
    const bob = await world.join('bob')
    expect(await world.until(() => lastLine(bob) === `line ${EVENTS - 1}`, 30_000)).toBe(true)
    expect(boardsMatch(alice, bob)).toBe(true)
    expect(bob.notes).toContain('before the history')
    // The genesis, the snapshot and the events after its cut: not one signature per event.
    expect(bob.verifies).toBeLessThan(60)
    // And it takes part: a note of Bob reaches Alice, one of Alice reaches Bob.
    bob.note('from the joiner')
    expect(await world.until(() => alice.notes.includes('from the joiner'))).toBe(true)
    alice.note('from the facilitator')
    expect(await world.until(() => bob.notes.includes('from the facilitator'))).toBe(true)
  })

  it('a joiner holding only the tail the relay kept (no genesis) still starts from the snapshot', async () => {
    const { alice } = await longBoard(true)
    const bob = await world.join('bob')
    expect(await world.until(() => lastLine(bob) === `line ${EVENTS - 1}`, 30_000)).toBe(true)
    expect(await world.until(() => bob.notes.includes('before the history'), 30_000)).toBe(true)
    await world.run(3_000)
    expect(boardsMatch(alice, bob)).toBe(true)
    // The relay keeps at most 2,000 envelopes; the rest of the history is not verified one by one.
    expect(bob.verifies).toBeLessThan(2_400)
  })

  it('a tampered snapshot is rejected and the joiner falls back to the event log', async () => {
    const { alice } = await longBoard()
    const frames = recordSnapshotFrames()
    const spy = await world.join('spy')
    expect(await world.until(() => lastLine(spy) === `line ${EVENTS - 1}`, 30_000)).toBe(true)
    expect(spy.verifies).toBeLessThan(60)
    spy.close()
    expect(frames.length).toBeGreaterThan(0)
    // The ledger is rewritten, the signature kept.
    serve(await forge(frames, (s) => ({ ...s, ledger: { ...s.ledger, board: { ...s.ledger.board, settings: { ...s.ledger.board.settings, title: 'hijacked' } } } })))
    const bob = await world.join('bob')
    expect(await world.until(() => boardsMatch(alice, bob), 60_000)).toBe(true)
    expect(bob.snapshot?.settings.title).not.toBe('hijacked')
    expect(bob.verifies).toBeGreaterThanOrEqual(EVENTS)
  })

  it('a snapshot signed by a participant instead of the genesis facilitator key is rejected', async () => {
    const { alice } = await longBoard()
    const frames = recordSnapshotFrames()
    const spy = await world.join('spy')
    expect(await world.until(() => lastLine(spy) === `line ${EVENTS - 1}`, 30_000)).toBe(true)
    spy.close()
    const attacker = await signerFor(toBase64Url(randomKey(32)))
    serve(await forge(frames, (s) => ({ ...s, author: attacker!.publicKey, ledger: { ...s.ledger, lead: attacker!.publicKey } }), attacker!))
    const bob = await world.join('bob')
    expect(await world.until(() => boardsMatch(alice, bob), 60_000)).toBe(true)
    expect(bob.verifies).toBeGreaterThanOrEqual(EVENTS)
  })

  it('a snapshot of another room is rejected', async () => {
    const { alice } = await longBoard()
    const frames = recordSnapshotFrames()
    const spy = await world.join('spy')
    expect(await world.until(() => lastLine(spy) === `line ${EVENTS - 1}`, 30_000)).toBe(true)
    spy.close()
    serve(await forge(frames, (s) => ({ ...s, room: `${s.room.slice(0, -1)}${s.room.endsWith('A') ? 'B' : 'A'}` })))
    const bob = await world.join('bob')
    expect(await world.until(() => boardsMatch(alice, bob), 60_000)).toBe(true)
    expect(bob.verifies).toBeGreaterThanOrEqual(EVENTS)
  })

  it('a participant who knows the board drops a snapshot rooted in another genesis key', async () => {
    await longBoard()
    const frames = recordSnapshotFrames()
    const bob = await world.join('bob')
    expect(await world.until(() => lastLine(bob) === `line ${EVENTS - 1}`, 30_000)).toBe(true)
    expect(frames.length).toBeGreaterThan(0)
    // An attacker with the link builds a consistent snapshot of its own board: its own genesis, its own key.
    const attacker = await signerFor(toBase64Url(randomKey(32)))
    const genesis = await signEvent(attacker!, world.roomId, { id: hex(26), at: 1, body: { t: 'genesis', roomId: world.roomId, facilitatorKey: attacker!.publicKey } })
    const own = await forge(frames, (s) => ({ ...s, author: attacker!.publicKey, genesis, cut: { ...s.cut, at: s.cut.at + 1_000 }, ids: [genesis.id, hex(26), ...s.ids.filter((i) => i !== s.genesis.id)], ledger: { ...s.ledger, facilitatorKey: attacker!.publicKey, lead: attacker!.publicKey, facilitators: [attacker!.publicKey] } }), attacker!)
    const first = JSON.parse(own[0]!) as { sid: string; hlc: number }
    const env = { v: PROTOCOL_VERSION, room: world.roomId, id: first.sid, hlc: first.hlc, ct: own.map((f) => (JSON.parse(f) as { part: string }).part).join('') }
    const inner = bob.transport as unknown as { onSnapshot(conn: string, env: unknown): Promise<void>; latest: { snap: { author: string } } | null }
    const before = inner.latest?.snap.author
    expect(before).toBeTruthy()
    await inner.onSnapshot('c00000000099', env)
    expect(inner.latest?.snap.author).toBe(before)
    expect(inner.latest?.snap.author).not.toBe(attacker!.publicKey)
  })

  it('an event written offline before the cut is not lost: the joiner converges on the full log', async () => {
    const { alice, from } = await longBoard()
    const bob = await world.join('bob')
    expect(await world.until(() => lastLine(bob) === `line ${EVENTS - 1}`, 30_000)).toBe(true)
    expect(bob.verifies).toBeLessThan(60)
    // An offline writer's note, clocked long before the cut, reaches both through the relay.
    const key = await deriveContentKey(fromBase64Url(world.roomKey)!, world.roomId)
    let seed: string | null = null
    const { createSessionSigner } = await import('../app/adapters/signing')
    const writer = await createSessionSigner({ get: () => seed, set: (v) => { seed = v } })
    const body: EventBody = { t: 'cmd', cmd: { t: 'note.add', columnId: alice.columnIds[0]!, text: 'written offline' }, name: null, showName: true }
    const event = await signEvent(writer, world.roomId, { id: hex(26), at: from + 5_000, body })
    const head = { v: PROTOCOL_VERSION, room: world.roomId, id: event.id, hlc: event.at } as const
    const env = { ...head, ct: toBase64Url(await seal(key, utf8(JSON.stringify(event)), utf8(envelopeAad(head)))) }
    for (const conn of world.relay.sockets.keys()) world.relay.deliver(conn, { t: 'env', envs: [env] })
    expect(await world.until(() => alice.notes.includes('written offline') && bob.notes.includes('written offline'), 30_000)).toBe(true)
    await world.run(5_000)
    expect(boardsMatch(alice, bob)).toBe(true)
    expect((bob.transport as unknown as { log: { base: unknown } }).log.base).toBeNull()
  })

  it('a joiner that reloads offline reopens the board from the snapshot it stored', async () => {
    await longBoard()
    const replica = new MemoryReplica()
    const seed = { value: null }
    const bob = await world.join('bob', { replica, seed })
    expect(await world.until(() => lastLine(bob) === `line ${EVENTS - 1}`, 30_000)).toBe(true)
    await world.run(1_000)
    expect([...replica.rows.get(world.roomId)!.keys()].some((id) => id.startsWith('snap:'))).toBe(true)
    bob.close()
    world.relay.down = true
    const again = await world.join('bob', { replica, seed, p2p: false })
    expect(await world.until(() => lastLine(again) === `line ${EVENTS - 1}`, 10_000)).toBe(true)
    expect(again.notes).toContain('before the history')
    expect(again.verifies).toBeLessThan(60)
  })
})
