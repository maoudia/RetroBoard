import { describe, expect, it } from 'vitest'
import { LEDGER_VERSION, type VerifiedEvent } from '@retroboard/domain'
import { CHECKPOINT_EVERY, EventLog, SNAPSHOT_MAX_IDS, type SignedEvent, type SignedSnapshot, signEvent, signSnapshot, type SignerPort, snapshotMessage, verifySnapshot, type VerifierPort } from '../src'

// Fake signature scheme: sig = "<key>:" + checksum of the message. Enough to test the plumbing; the crypto is tested in packages/crypto.
const sum = (m: string) => [...m].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const signer = (publicKey: string): SignerPort => ({ publicKey, sign: async (m) => `${publicKey}:${sum(m)}` })
let checks = 0
const verifier: VerifierPort = { verify: async (k, s, m) => { checks++; return s === `${k}:${sum(m)}` } }

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const otherRoom = 'Zz3dEfGhIjKlMnOpQrStUv'
const FAC = 'f'.repeat(42) + 'A'
const ALICE = 'a'.repeat(42) + 'A'
const MALLORY = 'm'.repeat(42) + 'A'
const id = (n: number) => `01J${String(n).padStart(23, '0')}`

/** The first 3,000 events are covered by the checkpoint, the last 4 come after it. */
const CUT = 3_000
const EVENTS = CUT + 4
/** Genesis then chat lines of one author, 250 ms apart (the fold rate limit would ignore a burst). */
async function longLog(): Promise<{ log: EventLog<SignedEvent>; events: SignedEvent[] }> {
  const events: SignedEvent[] = [await signEvent(signer(FAC), roomId, { id: id(1), at: 10, body: { t: 'genesis', roomId, facilitatorKey: FAC } })]
  for (let i = 1; i < EVENTS; i++) events.push(await signEvent(signer(ALICE), roomId, { id: id(i + 1), at: 10 + i * 250, body: { t: 'cmd', cmd: { t: 'chat.post', text: `line ${i}` }, name: null, showName: false } }))
  const log = new EventLog<SignedEvent>(roomId)
  for (const e of events) log.insert(e)
  return { log, events }
}

async function snapshotOf(log: EventLog<SignedEvent>, events: SignedEvent[], key = FAC): Promise<SignedSnapshot> {
  const cp = log.checkpointBefore(Number.MAX_SAFE_INTEGER, 0, 1)!
  return signSnapshot(signer(key), roomId, id(900_000), cp, events[0]!)
}

describe('snapshot of a board of 3,000 events', () => {
  it('a joiner starts from it, folds the events after the cut and reaches the state of the full log', async () => {
    const { log, events } = await longLog()
    const snap = await snapshotOf(log, events)
    expect(snap.ids).toHaveLength(CUT)
    expect(CUT % CHECKPOINT_EVERY).toBe(0)

    checks = 0
    const verdict = await verifySnapshot(verifier, roomId, snap)
    if (!verdict.ok) throw new Error(verdict.reason)
    // The genesis and the snapshot: two signature checks instead of 3,000.
    expect(checks).toBe(2)

    const joiner = new EventLog<SignedEvent>(roomId, verdict.base)
    for (const e of events.slice(snap.ids.length)) joiner.insert(e)
    expect(joiner.ledger).toEqual(log.ledger)
    expect(joiner.size).toBe(EVENTS)
    expect(joiner.all()).toHaveLength(EVENTS - snap.ids.length)
    expect(joiner.has(events[10]!.id)).toBe(true)
    expect(joiner.knownIds().sort()).toEqual(events.map((e) => e.id).sort())

    // Later events fold like on the full log.
    const next: VerifiedEvent = { id: id(EVENTS + 5), at: 10 + EVENTS * 250, author: ALICE, body: { t: 'cmd', cmd: { t: 'chat.post', text: 'after' }, name: null, showName: false } }
    log.insert(next as SignedEvent)
    joiner.insert(next as SignedEvent)
    expect(joiner.ledger).toEqual(log.ledger)
  })

  it('only cuts where the log holds a checkpoint, old enough and with enough new events', async () => {
    const { log } = await longLog()
    expect(log.checkpointBefore(Number.MAX_SAFE_INTEGER, 0, 1_000)?.ids).toHaveLength(CUT)
    // 3,000 events are 1,000 or more beyond a snapshot of 2,000, but not beyond one of 2,200.
    expect(log.checkpointBefore(Number.MAX_SAFE_INTEGER, 2_000, 1_000)).not.toBeNull()
    expect(log.checkpointBefore(Number.MAX_SAFE_INTEGER, 2_200, 1_000)).toBeNull()
    // Nothing newer than maxAt goes into the cut.
    const early = log.checkpointBefore(10 + 1_000 * 250, 0, 1)!
    expect(early.ids).toHaveLength(1_000)
    expect(early.cut.at).toBeLessThanOrEqual(10 + 1_000 * 250)
    expect(log.checkpointBefore(5, 0, 1)).toBeNull()
  })

  it('a log that starts from a snapshot signs none, nor does an empty one', async () => {
    const { log, events } = await longLog()
    const verdict = await verifySnapshot(verifier, roomId, await snapshotOf(log, events))
    if (!verdict.ok) throw new Error(verdict.reason)
    expect(new EventLog<SignedEvent>(roomId, verdict.base).checkpointBefore(Number.MAX_SAFE_INTEGER, 0, 1)).toBeNull()
    expect(new EventLog<SignedEvent>(roomId).checkpointBefore(Number.MAX_SAFE_INTEGER, 0, 1)).toBeNull()
  })

  it('nothing is cut without a genesis, with a base however long the tail, or before a first checkpoint', async () => {
    const chat = (n: number) => signEvent(signer(ALICE), roomId, { id: id(n), at: 10 + n * 250, body: { t: 'cmd', cmd: { t: 'chat.post', text: `l${n}` }, name: null, showName: false } })
    const noGenesis = new EventLog<SignedEvent>(roomId)
    for (let n = 1; n <= 250; n++) noGenesis.insert(await chat(n))
    expect(noGenesis.checkpointBefore(Number.MAX_SAFE_INTEGER, 0, 1)).toBeNull()

    const { log, events } = await longLog()
    const verdict = await verifySnapshot(verifier, roomId, await snapshotOf(log, events))
    if (!verdict.ok) throw new Error(verdict.reason)
    const joiner = new EventLog<SignedEvent>(roomId, verdict.base)
    for (let n = EVENTS + 10; n < EVENTS + 400; n++) joiner.insert(await chat(n))
    expect(joiner.all().length).toBeGreaterThan(CHECKPOINT_EVERY)
    expect(joiner.checkpointBefore(Number.MAX_SAFE_INTEGER, 0, 1)).toBeNull()

    const short = new EventLog<SignedEvent>(roomId)
    for (const e of events.slice(0, 150)) short.insert(e)
    expect(short.checkpointBefore(Number.MAX_SAFE_INTEGER, 0, 0)).toBeNull()
  })
})

describe('a snapshot that does not hold is refused, the event log is what is left', () => {
  const refusal = async (edit: (s: SignedSnapshot) => SignedSnapshot, resign?: string, room = roomId) => {
    const { log, events } = await longLog()
    const snap = edit(await snapshotOf(log, events))
    let candidate = snap
    if (resign) {
      const { sig: _old, ...rest } = snap
      candidate = { ...rest, sig: await signer(resign).sign(snapshotMessage(rest)) }
    }
    const verdict = await verifySnapshot(verifier, room, candidate)
    return verdict.ok ? 'accepted' : verdict.reason
  }

  it('accepts the genuine one', async () => {
    expect(await refusal((s) => s)).toBe('accepted')
  })

  it('refuses a tampered ledger, cut or id list (the signature no longer matches)', async () => {
    expect(await refusal((s) => ({ ...s, ledger: { ...s.ledger, names: { [ALICE]: 'forged' } } }))).toBe('signature')
    expect(await refusal((s) => ({ ...s, cut: { ...s.cut, at: s.cut.at + 1 } }))).toBe('signature')
    expect(await refusal((s) => ({ ...s, ids: s.ids.slice(1) }))).toBe('signature')
    expect(await refusal((s) => ({ ...s, ids: [...s.ids, id(999_999)] }))).toBe('signature')
  })

  it('refuses a snapshot signed by anyone but the key of the genesis, even with a valid signature of their own', async () => {
    expect(await refusal((s) => ({ ...s, author: MALLORY }), MALLORY)).toBe('signer')
    expect(await refusal((s) => ({ ...s, author: ALICE, ledger: { ...s.ledger, lead: ALICE, facilitators: [FAC, ALICE] } }), ALICE)).toBe('signer')
  })

  it('refuses a genesis that is not signed by the key it announces, or another room', async () => {
    const { log, events } = await longLog()
    const snap = await snapshotOf(log, events)
    const forgedGenesis = { ...snap, genesis: { ...snap.genesis, at: snap.genesis.at + 1 } }
    expect((await verifySnapshot(verifier, roomId, forgedGenesis))).toEqual({ ok: false, reason: 'genesis' })
    const notGenesis = { ...snap, genesis: events[1]! }
    expect((await verifySnapshot(verifier, roomId, notGenesis))).toEqual({ ok: false, reason: 'genesis' })
    expect(await refusal((s) => s, undefined, otherRoom)).toBe('room')
  })

  it('refuses rules of another version, a wrong room inside, and inconsistent ids', async () => {
    expect(await refusal((s) => ({ ...s, fold: LEDGER_VERSION + 1 }), FAC)).toBe('version')
    expect(await refusal((s) => ({ ...s, ledger: { ...s.ledger, roomId: otherRoom } }), FAC)).toBe('room')
    expect(await refusal((s) => ({ ...s, ids: [...s.ids, s.ids[5]!] }), FAC)).toBe('ids')
    expect(await refusal((s) => ({ ...s, ids: s.ids.filter((i) => i !== s.genesis.id) }), FAC)).toBe('ids')
    expect(await refusal((s) => ({ ...s, ids: s.ids.slice(0, 5) }), FAC)).toBe('ids')
    expect(await refusal((s) => ({ ...s, ledger: { ...s.ledger, applied: s.ids.length + 1 } }), FAC)).toBe('ledger')
  })
})


describe('each check of a snapshot stands on its own', () => {
  const resigned = async (edit: (s: SignedSnapshot) => SignedSnapshot, key = FAC) => {
    const { log, events } = await longLog()
    const { sig: _old, ...rest } = edit(await snapshotOf(log, events))
    const verdict = await verifySnapshot(verifier, roomId, { ...rest, sig: await signer(key).sign(snapshotMessage(rest)) })
    return verdict.ok ? 'accepted' : verdict.reason
  }

  it('the snapshot version, the room it says and the room of its ledger', async () => {
    expect(await resigned((s) => ({ ...s, v: 2 as never }))).toBe('version')
    expect(await resigned((s) => ({ ...s, room: otherRoom }))).toBe('room')
    expect(await resigned((s) => ({ ...s, ledger: { ...s.ledger, roomId: otherRoom } }))).toBe('room')
  })

  it('a genesis for another room, or signed by someone other than the key it announces', async () => {
    const other = await signEvent(signer(FAC), roomId, { id: id(1), at: 10, body: { t: 'genesis', roomId: otherRoom, facilitatorKey: FAC } })
    expect(await resigned((s) => ({ ...s, genesis: other }))).toBe('genesis')
    const notBySelf = await signEvent(signer(ALICE), roomId, { id: id(1), at: 10, body: { t: 'genesis', roomId, facilitatorKey: FAC } })
    expect(await resigned((s) => ({ ...s, genesis: notBySelf }))).toBe('genesis')
  })

  it('a first event that is not a genesis, even one dressed like it', async () => {
    const dressed = await signEvent(signer(FAC), roomId, { id: id(1), at: 10, body: { t: 'role.claim', key: FAC, roomId, facilitatorKey: FAC } as never })
    expect(await resigned((s) => ({ ...s, genesis: dressed }))).toBe('genesis')
  })

  it('the key of the ledger, and a key that is not a key', async () => {
    expect(await resigned((s) => ({ ...s, ledger: { ...s.ledger, facilitatorKey: ALICE } }))).toBe('signer')
    const odd = 'short'
    const genesis = await signEvent(signer(odd), roomId, { id: id(1), at: 10, body: { t: 'genesis', roomId, facilitatorKey: odd } })
    expect(await resigned((s) => ({ ...s, author: odd, genesis, ledger: { ...s.ledger, facilitatorKey: odd } }), odd)).toBe('signer')
  })

  it('as many covered ids as a board file allows, not one more', async () => {
    const fill = (n: number) => (s: SignedSnapshot) => ({ ...s, ids: [...s.ids, ...Array.from({ length: n - s.ids.length }, (_, i) => `${'0'.repeat(20)}${String(i).padStart(6, '0')}`)] })
    expect(await resigned(fill(SNAPSHOT_MAX_IDS))).toBe('accepted')
    expect(await resigned(fill(SNAPSHOT_MAX_IDS + 1))).toBe('ids')
  })

  it('a ledger that applied exactly as many events as the snapshot covers is consistent', async () => {
    expect(await resigned((s) => ({ ...s, ledger: { ...s.ledger, applied: s.ids.length } }))).toBe('accepted')
  })
})

describe('events before the cut that the snapshot does not cover', () => {
  it('are never folded onto it: they are set aside for the owner to rebuild the full log', async () => {
    const { log, events } = await longLog()
    const verdict = await verifySnapshot(verifier, roomId, await snapshotOf(log, events))
    if (!verdict.ok) throw new Error(verdict.reason)
    const joiner = new EventLog<SignedEvent>(roomId, verdict.base)
    const before = joiner.ledger
    const late = await signEvent(signer(MALLORY), roomId, { id: id(777_777), at: 10 + 100 * 250 + 1, body: { t: 'cmd', cmd: { t: 'chat.post', text: 'offline' }, name: null, showName: false } })
    expect(joiner.insert(late)).toBe(false)
    expect(joiner.insert(late)).toBe(false)
    expect(joiner.horizonMisses).toEqual([late])
    expect(joiner.has(late.id)).toBe(false)
    expect(joiner.ledger).toBe(before)
    // The full log takes it in its place in the order, which the snapshot-based one cannot.
    expect(log.insert(late)).toBe(true)
    expect(log.size).toBe(EVENTS + 1)
  })

  it('two different late events are both set aside, and an event at the cut sorts by id', async () => {
    const { log, events } = await longLog()
    const verdict = await verifySnapshot(verifier, roomId, await snapshotOf(log, events))
    if (!verdict.ok) throw new Error(verdict.reason)
    const joiner = new EventLog<SignedEvent>(roomId, verdict.base)
    const chat = (eventId: string, at: number) => signEvent(signer(MALLORY), roomId, { id: eventId, at, body: { t: 'cmd', cmd: { t: 'chat.post', text: eventId }, name: null, showName: false } })
    const a = await chat(id(777_001), 20)
    const b = await chat(id(777_002), 30)
    joiner.insert(a); joiner.insert(b)
    expect(joiner.horizonMisses.map((e) => e.id)).toEqual([a.id, b.id])
    // At the very clock of the cut: before it in the order when its id is smaller, after it when it is larger.
    const { cut } = verdict.base
    const smaller = await chat(`01I${'0'.repeat(23)}`, cut.at)
    const larger = await chat(`01K${'0'.repeat(23)}`, cut.at)
    expect(joiner.insert(smaller)).toBe(false)
    expect(joiner.horizonMisses).toContain(smaller)
    expect(joiner.insert(larger)).toBe(true)
    // After the cut in time, whatever its id.
    const later = await chat(`01I${'0'.repeat(22)}1`, cut.at + 1)
    expect(joiner.insert(later)).toBe(true)
    expect(joiner.horizonMisses).not.toContain(later)
    expect(joiner.horizonMisses).not.toContain(larger)
    expect(joiner.all()).toContain(larger)
  })

  it('an event covered by the snapshot is a duplicate, not a miss', async () => {
    const { log, events } = await longLog()
    const verdict = await verifySnapshot(verifier, roomId, await snapshotOf(log, events))
    if (!verdict.ok) throw new Error(verdict.reason)
    const joiner = new EventLog<SignedEvent>(roomId, verdict.base)
    expect(joiner.insert(events[100]!)).toBe(false)
    expect(joiner.horizonMisses).toEqual([])
  })
})
