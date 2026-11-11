/**
 * Test harness for the board transport (change reliable-board-sync).
 *
 * Runs several real `EncryptedRelayTransport` instances (real WebCrypto, real signatures, real
 * fold) against:
 * - FakeRelay: the relay room behaviour (welcome, hist, peers, fresh-only fan-out, sig routing,
 *   presence), memory only, with eviction, deploys (restart: every socket closed, memory gone) and
 *   per-socket drops. It applies the real budgets (frame size, frame rate, buffer) of the relay;
 * - FakeRtc: WebRTC data channels in memory, where chosen pairs of participants cannot link;
 * - a memory replica store.
 * Time is driven by `World.run(ms)` on vitest fake timers (setTimeout, setInterval, Date).
 */
import { type EventBody, type ReplicaRecord, type ReplicaStorePort, signEvent } from '@retroboard/application'
import { deriveContentKey, fromBase64Url, randomKey, seal, toBase64Url, utf8 } from '@retroboard/crypto'
import { type Command, type KeyRing, LIMITS, type Snapshot } from '@retroboard/domain'
import { type Budgets, checkFrame, type Envelope, EnvelopeBuffer, envelopeAad, PROTOCOL_VERSION, type RelayFrame } from '@retroboard/protocol'
import { vi } from 'vitest'
import { createSessionAgreement, createSessionSigner, ed25519Verifier, signerFor } from '../app/adapters/signing'
import type { SessionAgreement } from '../app/transport/room-move'
import { type EncryptedDeps, EncryptedRelayTransport } from '../app/transport/encrypted'
import type { ConnectionStatus } from '../app/transport/types'

const realSetTimeout = globalThis.setTimeout
const realTick = (ms = 1) => new Promise<void>((resolve) => realSetTimeout(resolve, ms))

const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')

// ---------------------------------------------------------------- relay

export class FakeRelay {
  private buffer = new EnvelopeBuffer()
  readonly sockets = new Map<string, FakeSocket>()
  /** Counters for budget assertions. */
  stats = { pubFrames: 0, pubEnvs: 0, freshEnvs: 0, fanOut: 0, accepts: 0 }
  /** Every ephemeral envelope fanned out (presence, hand-offs), for tests that look at what the relay carries. */
  ephs: Envelope[] = []
  /** Close codes the relay sent, in order: 1008 rate limit, 1009 frame too large, 1001 deploy. */
  closes: number[] = []
  /** When true, new connections are refused (relay unreachable). */
  down = false
  /**
   * Connection ids. Ascending by default (join order), so the order of the mesh, the bridge and the
   * seeder is the same on every run; the real relay uses random ids, set `random` to try those.
   */
  random = false
  private seq = 0
  private connId(): string { return this.random ? hex(12) : `c${String(++this.seq).padStart(11, '0')}` }

  get buffered() { return this.buffer.size }

  /** The Durable Object was evicted: memory is gone, sockets are closed. */
  evict(): void {
    this.buffer = new EnvelopeBuffer()
    for (const s of [...this.sockets.values()]) { this.closes.push(1001); s.serverClose() }
  }

  /**
   * A deploy: the Durable Object restarts, so memory is gone and every socket is closed, and
   * connections are refused until `reopen()`.
   */
  deploy(): void {
    this.down = true
    this.evict()
  }

  /** The new version answers: clients can connect again (to an empty room). */
  reopen(): void { this.down = false }

  /** Sends a relay frame to one connection only (an event another version produced, for instance). */
  deliver(conn: string, frame: RelayFrame): void { this.sockets.get(conn)?.toClient(frame) }

  /**
   * Durable Object hibernation: the instance is evicted from memory but the WebSockets stay
   * attached. The buffer is gone, nobody is told.
   */
  forget(): void { this.buffer = new EnvelopeBuffer() }

  /** A client socket opened. */
  accept(socket: FakeSocket): void {
    if (this.down) { realSetTimeout(() => socket.serverClose(), 0); return }
    const conn = this.connId()
    socket.conn = conn
    this.stats.accepts++
    this.sockets.set(conn, socket)
    socket.toClient({ t: 'welcome', conn, peers: this.conns() })
    for (const frame of this.buffer.history()) socket.toClient(frame)
    this.broadcastPeers()
  }

  closed(socket: FakeSocket): void {
    if (socket.conn && this.sockets.get(socket.conn) === socket) this.sockets.delete(socket.conn)
    this.broadcastPeers()
  }

  fromClient(socket: FakeSocket, text: string): void {
    if (text === 'ping') return
    // Same checks as the Durable Object: a frame that is too large or over the rate budget closes the socket.
    const checked = checkFrame(socket.budget, text, Date.now(), LIMITS.rateWindowMs)
    if (checked.verdict === 'close') { this.closes.push(checked.code); socket.serverClose(); return }
    const frame = checked.verdict === 'ok' ? checked.frame : null
    if (!frame) return
    if (frame.t === 'pub') {
      this.stats.pubFrames++
      this.stats.pubEnvs += frame.envs.length
      const fresh = this.buffer.add(frame.envs)
      this.stats.freshEnvs += fresh.length
      if (fresh.length) this.fanOut({ t: 'env', envs: fresh }, socket)
    } else if (frame.t === 'eph') {
      this.ephs.push(frame.env)
      this.fanOut({ t: 'eph', env: frame.env }, socket)
    } else {
      const to = this.sockets.get(frame.to)
      if (to && socket.conn) to.toClient({ t: 'sig', from: socket.conn, env: frame.env })
    }
  }

  private conns(): string[] { return [...this.sockets.keys()].sort() }
  private broadcastPeers(): void {
    const peers = this.conns()
    for (const s of this.sockets.values()) s.toClient({ t: 'peers', peers })
  }
  private fanOut(frame: RelayFrame, from: FakeSocket): void {
    for (const s of this.sockets.values()) if (s !== from) { this.stats.fanOut++; s.toClient(frame) }
  }
}

/** Browser WebSocket double bound to a relay. Messages are delivered on a timer tick, like a network. */
export class FakeSocket {
  readyState = 0
  conn: string | null = null
  /** Frame rate window of this socket, as the relay keeps it in the socket attachment. */
  readonly budget: Budgets = { windowStart: Date.now(), count: 0 }
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(readonly relay: FakeRelay, private readonly net: { online: boolean }) {
    setTimeout(() => {
      if (!this.net.online || this.relay.down) { this.readyState = 3; this.onclose?.(); return }
      this.readyState = 1
      this.onopen?.()
      this.relay.accept(this)
    }, 5)
  }
  send(text: string): void {
    if (this.readyState !== 1) return
    setTimeout(() => { if (this.readyState === 1) this.relay.fromClient(this, text) }, 5)
  }
  toClient(frame: RelayFrame): void {
    const text = JSON.stringify(frame)
    setTimeout(() => { if (this.readyState === 1) this.onmessage?.({ data: text }) }, 5)
  }
  /** Client closes. */
  close(): void {
    if (this.readyState === 3) return
    this.readyState = 3
    this.relay.closed(this)
  }
  /** Server or network closes. */
  serverClose(): void {
    if (this.readyState === 3) return
    this.readyState = 3
    this.relay.closed(this)
    setTimeout(() => this.onclose?.(), 0)
  }
}

// ---------------------------------------------------------------- webrtc

type Listener = () => void

class FakeChannel {
  readyState: 'connecting' | 'open' | 'closed' = 'connecting'
  bufferedAmount = 0
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  peer: FakeChannel | null = null
  constructor(readonly label: string) {}
  open(): void { if (this.readyState === 'connecting') { this.readyState = 'open'; this.onopen?.() } }
  send(text: string): void {
    if (this.readyState !== 'open') throw new Error('not open')
    const to = this.peer
    setTimeout(() => { if (to && to.readyState === 'open') to.onmessage?.({ data: text }) }, 2)
  }
  close(): void {
    if (this.readyState === 'closed') return
    this.readyState = 'closed'
    const p = this.peer
    setTimeout(() => { if (p && p.readyState !== 'closed') { p.readyState = 'closed'; p.onclose?.() } }, 2)
  }
}

export class FakeRtcNet {
  private id = 0
  readonly pcs = new Map<string, FakePc>()
  /** Pairs of participant names that cannot open a direct link (NAT, carrier, firewall). */
  readonly blocked = new Set<string>()
  static pair(a: string, b: string) { return [a, b].sort().join('|') }
  block(a: string, b: string) { this.blocked.add(FakeRtcNet.pair(a, b)) }
  unblock(a: string, b: string) { this.blocked.delete(FakeRtcNet.pair(a, b)) }
  /** All links of this participant fail (WebRTC missing or blocked). */
  blockAll(name: string, others: string[]) { for (const o of others) this.block(name, o) }
  next() { return `pc${++this.id}` }
  /** The constructor a participant passes as `RTC`. */
  rtcFor(owner: string): typeof RTCPeerConnection {
    const bind = (n: FakeRtcNet) => class extends FakePc { constructor() { super(n, owner) } }
    return bind(this) as unknown as typeof RTCPeerConnection
  }
}

class FakePc {
  readonly id: string
  iceGatheringState = 'complete'
  signalingState = 'stable'
  connectionState = 'new'
  localDescription: { type: string; sdp: string } | null = null
  onconnectionstatechange: (() => void) | null = null
  ondatachannel: ((e: { channel: FakeChannel }) => void) | null = null
  private readonly channels: FakeChannel[] = []
  private remote: FakePc | null = null
  private offered = false
  constructor(private readonly net: FakeRtcNet, readonly owner: string) {
    this.id = net.next()
    net.pcs.set(this.id, this)
  }
  addEventListener(_t: string, _l: Listener) { /* gathering is always complete */ }
  removeEventListener(_t: string, _l: Listener) { /* idem */ }
  createDataChannel(label: string): FakeChannel { const ch = new FakeChannel(label); this.channels.push(ch); return ch }
  async createOffer() { this.offered = true; return { type: 'offer', sdp: JSON.stringify({ pc: this.id }) } }
  async createAnswer() { return { type: 'answer', sdp: JSON.stringify({ pc: this.id }) } }
  async setLocalDescription(d: { type: string; sdp: string }) { this.localDescription = d; if (d.type === 'offer') this.signalingState = 'have-local-offer' }
  async setRemoteDescription(d: { type: string; sdp: string }) {
    const target = this.net.pcs.get((JSON.parse(d.sdp) as { pc: string }).pc) ?? null
    this.remote = target
    if (d.type === 'answer') {
      this.signalingState = 'stable'
      this.connect()
    } else {
      this.signalingState = 'have-remote-offer'
    }
  }
  private connect(): void {
    const remote = this.remote
    if (!remote || !this.offered) return
    if (this.net.blocked.has(FakeRtcNet.pair(this.owner, remote.owner))) return // never opens: the mesh times out
    // The answerer gets the matching channels, then everything opens.
    const theirs = this.channels.map((c) => {
      const t = new FakeChannel(c.label)
      c.peer = t; t.peer = c
      return t
    })
    setTimeout(() => {
      for (const t of theirs) remote.ondatachannel?.({ channel: t })
      setTimeout(() => { for (const c of this.channels) c.open(); for (const t of theirs) t.open() }, 3)
    }, 3)
  }
  close(): void {
    this.connectionState = 'closed'
    this.net.pcs.delete(this.id)
    for (const c of this.channels) c.close()
  }
}

// ---------------------------------------------------------------- replica

export class MemoryReplica implements ReplicaStorePort {
  readonly rows = new Map<string, Map<string, string>>()
  /** Writes accepted so far; `failWrites` simulates a quota or a closed database. */
  appended = 0
  failWrites = false
  async load(roomId: string): Promise<ReplicaRecord[]> {
    return [...(this.rows.get(roomId)?.entries() ?? [])].map(([id, data]) => ({ id, data }))
  }
  async append(roomId: string, records: readonly ReplicaRecord[]): Promise<void> {
    if (this.failWrites) throw new Error('quota')
    const room = this.rows.get(roomId) ?? new Map<string, string>()
    for (const r of records) { room.set(r.id, r.data); this.appended++ }
    this.rows.set(roomId, room)
  }
  async purge(): Promise<number> { return 0 }
  async delete(roomId: string): Promise<void> { this.rows.delete(roomId) }
  count(roomId: string): number { return this.rows.get(roomId)?.size ?? 0 }
}

// ---------------------------------------------------------------- world

export interface PeerOptions {
  /** Holds the facilitator link. */
  facilitator?: boolean
  /** Shares a replica with an earlier "tab" of the same browser. */
  replica?: MemoryReplica
  /** false: WebRTC unavailable in this browser. */
  p2p?: boolean
  /** Session signing seed shared by tabs that reload (same tab). */
  seed?: { value: string | null }
  /** Single-creator rule (ADR-0024): this tab created the board. Defaults to true for the facilitator. */
  creator?: boolean
  /** This device's clock is off by this many ms. */
  clockSkewMs?: number
}

export class Peer {
  snapshot: Snapshot | null = null
  status: ConnectionStatus = 'closed'
  errors: string[] = []
  accessDenied = false
  /** Last state reported by the transport for local saving. */
  replicaState: 'ok' | 'failing' = 'ok'
  /** Cursors and focus frames received from others (peer to peer only). */
  cursors: string[] = []
  focus: string[] = []
  links: { p2p: boolean; peers: number } | null = null
  /** The new link the facilitator sent this participant (change facilitator-moderation). */
  moved: { hash: string; ring: KeyRing } | null = null
  agreement!: SessionAgreement
  /** Kinds of the notices the page would show (resets, phase changes, newer version). */
  notices: string[] = []
  transport!: EncryptedRelayTransport
  readonly net = { online: true }

  constructor(readonly name: string, readonly world: World, readonly opts: PeerOptions, readonly replica: MemoryReplica) {}

  get notes(): string[] { return (this.snapshot?.notes ?? []).map((n) => n.text).sort() }
  /** Columns of the board once it was set up (an empty room has placeholder columns until `board.init`). */
  get columnIds(): string[] { return this.snapshot?.settings.initialized ? (this.snapshot.columns ?? []).map((c) => c.id) : [] }

  /** Sends a command through the transport. Returns what the transport answered. */
  send(cmd: Command): boolean { return this.transport.send(cmd) }

  /** Publishes a note in the first column. */
  note(text: string): boolean {
    const columnId = this.columnIds[0]
    if (!columnId) return false
    return this.send({ t: 'note.addMany', items: [{ columnId, text }] })
  }

  setOnline(online: boolean): void {
    this.net.online = online
    if (!online) for (const s of this.world.socketsOf(this)) s.serverClose()
  }

  /** Browser tab closed: nothing else is delivered. */
  close(): void { this.transport.close() }
}

export class World {
  readonly relay = new FakeRelay()
  readonly rtc = new FakeRtcNet()
  readonly peers: Peer[] = []
  private readonly sockets = new Map<Peer, FakeSocket[]>()
  roomId = hex(11) + 'AbCdEfGhIjK'.slice(0, 11)
  roomKey = toBase64Url(randomKey(32))
  facilitatorSecret = toBase64Url(randomKey(32))
  /** Signing room of a board that moved here (ADR-0033). */
  signRoomId: string | undefined

  /** `ring`: the room is the one a board moved to; its keys and signing room are used as they are. */
  constructor(ring?: KeyRing) {
    if (ring) { this.roomId = ring.roomId; this.roomKey = ring.roomKey; this.signRoomId = ring.signRoomId; if (ring.facilitatorSecret) this.facilitatorSecret = ring.facilitatorSecret }
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))
  }

  dispose(): void {
    for (const p of this.peers) { try { p.close() } catch { /* already closed */ } }
    vi.useRealTimers()
  }

  socketsOf(p: Peer): FakeSocket[] { return this.sockets.get(p) ?? [] }

  /** Adds a participant and starts connecting. */
  async join(name: string, opts: PeerOptions = {}): Promise<Peer> {
    const replica = opts.replica ?? new MemoryReplica()
    const peer = new Peer(name, this, opts, replica)
    this.peers.push(peer)
    const seed = opts.seed ?? { value: null }
    const WS = class extends FakeSocket {
      constructor() {
        super(peer.world.relay, peer.net)
        const list = peer.world.sockets.get(peer) ?? []
        list.push(this)
        peer.world.sockets.set(peer, list)
      }
    } as unknown as typeof WebSocket
    const seedStore = { get: () => seed.value, set: (v: string) => { seed.value = v } }
    const deps: Promise<EncryptedDeps> = (async () => ({
      contentKey: await deriveContentKey(fromBase64Url(this.roomKey)!, this.roomId),
      session: await createSessionSigner(seedStore),
      agreement: peer.agreement = await createSessionAgreement(seedStore),
      contentKeyFor: (next: KeyRing) => deriveContentKey(fromBase64Url(next.roomKey)!, next.roomId),
      facilitator: opts.facilitator ? await signerFor(this.facilitatorSecret) : null,
      verifier: ed25519Verifier,
      replica,
      WS,
      RTC: this.rtc.rtcFor(name),
      p2p: opts.p2p ?? true,
      now: () => Date.now() + (opts.clockSkewMs ?? 0),
      iceServers: [],
      creator: opts.creator ?? opts.facilitator === true,
    }))() as Promise<EncryptedDeps>
    peer.transport = new EncryptedRelayTransport(
      `ws://fake/ws2?room=${this.roomId}`,
      { roomId: this.roomId, roomKey: this.roomKey, ...(opts.facilitator ? { facilitatorSecret: this.facilitatorSecret } : {}), ...(this.signRoomId ? { signRoomId: this.signRoomId } : {}) },
      {
        onSnapshot: (s) => { peer.snapshot = s },
        onError: (code) => { peer.errors.push(code) },
        onStatus: (s) => { peer.status = s },
        onAccessDenied: () => { peer.accessDenied = true },
        onReplica: (state) => { peer.replicaState = state },
        onCursor: (_c, name) => { peer.cursors.push(String(name)) },
        onFocus: (_f, name) => { peer.focus.push(String(name)) },
        onLinks: (state) => { peer.links = state },
        onNotice: (n) => { peer.notices.push(n.kind) },
        onMoved: (m) => { peer.moved = m },
      },
      deps,
    )
    peer.transport.connect({ cid: hex(16), name, showName: true })
    return peer
  }

  /**
   * An event another version of the application produced: correctly sealed and signed by a
   * participant, carrying a command this version does not know. Delivered through the relay to
   * every connected tab, as the author's own links and the relay would.
   */
  async publishFromNewerVersion(): Promise<void> {
    const key = await deriveContentKey(fromBase64Url(this.roomKey)!, this.roomId)
    let seed: string | null = null
    const author = await createSessionSigner({ get: () => seed, set: (v) => { seed = v } })
    const body = { t: 'cmd', cmd: { t: 'future.command', value: 1 }, name: null, showName: false } as unknown as EventBody
    const event = await signEvent(author, this.roomId, { id: hex(26), at: Date.now(), body })
    const head = { v: PROTOCOL_VERSION, room: this.roomId, id: event.id, hlc: event.at } as const
    const env: Envelope = { ...head, ct: toBase64Url(await seal(key, utf8(JSON.stringify(event)), utf8(envelopeAad(head)))) }
    for (const conn of this.relay.sockets.keys()) this.relay.deliver(conn, { t: 'env', envs: [env] })
  }

  /**
   * Writes `count` events of another participant into a device's replica, as if the board had been
   * used for a while: `small` envelopes are a chat line, `bulky` ones carry four 450 character notes
   * (about 3 KB once sealed). Every event is a valid command, signed and sealed.
   */
  async fillReplica(replica: MemoryReplica, count: number, size: 'small' | 'bulky', columnId: string): Promise<void> {
    const key = await deriveContentKey(fromBase64Url(this.roomKey)!, this.roomId)
    let seed: string | null = null
    const author = await createSessionSigner({ get: () => seed, set: (v) => { seed = v } })
    const at = Date.now()
    const records: { id: string; data: string }[] = []
    for (let from = 0; from < count; from += 200) {
      records.push(...await Promise.all(Array.from({ length: Math.min(200, count - from) }, async (_, k) => {
        const i = from + k
        const cmd: Command = size === 'small'
          ? { t: 'chat.post', text: `m${i}` }
          : { t: 'note.addMany', items: Array.from({ length: 4 }, (_, j) => ({ columnId, text: `${i}-${j}`.padEnd(450, 'x') })) }
        const event = await signEvent(author, this.roomId, { id: hex(26), at, body: { t: 'cmd', cmd, name: null, showName: false } })
        const head = { v: PROTOCOL_VERSION, room: this.roomId, id: event.id, hlc: event.at } as const
        const env: Envelope = { ...head, ct: toBase64Url(await seal(key, utf8(JSON.stringify(event)), utf8(envelopeAad(head)))) }
        return { id: env.id, data: JSON.stringify(env) }
      })))
    }
    await replica.append(this.roomId, records)
  }

  /** Advances simulated time, letting WebCrypto (real threads) finish between steps. */
  async run(ms: number, step = 25): Promise<void> {
    for (let t = 0; t < ms; t += step) {
      await vi.advanceTimersByTimeAsync(step)
      await realTick(3)
    }
    await realTick(2)
  }

  /** Runs until `done()` or `maxMs` of simulated time. Returns whether it became true. */
  async until(done: () => boolean, maxMs = 15_000): Promise<boolean> {
    for (let t = 0; t < maxMs; t += 25) {
      if (done()) return true
      await this.run(25, 25)
    }
    return done()
  }

  /** The board id set of every peer is the same. */
  converged(peers: readonly Peer[] = this.peers): boolean {
    const keys = peers.map((p) => JSON.stringify([p.snapshot?.columns.map((c) => c.id), p.notes]))
    return keys.every((k) => k === keys[0]) && peers.every((p) => p.snapshot !== null)
  }
}

/** The facilitator creates the board (genesis + template) and publishes nothing else. */
export async function createBoardAs(world: World, peer: Peer): Promise<void> {
  const ok = await world.until(() => peer.status === 'open')
  if (!ok) throw new Error(`${peer.name} never opened (status ${peer.status})`)
  peer.send({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', locale: 'en', openFacilitation: true })
  await world.until(() => peer.columnIds.length > 0)
}

/**
 * A participant whose device holds a board of `count` events (`size` as in `fillReplica`) opens it while the relay
 * is empty, as after a deploy: the relay can only get the board from this participant.
 */
export async function holderOfBoardOf(count: number, size: 'small' | 'bulky'): Promise<{ world: World; alice: Peer; held: number }> {
  const world = new World()
  const replica = new MemoryReplica()
  const seed = { value: null }
  const first = await world.join('alice', { facilitator: true, replica, seed })
  await createBoardAs(world, first)
  first.close()
  await world.fillReplica(replica, count, size, first.columnIds[0]!)
  const held = replica.count(world.roomId)
  const alice = await world.join('alice', { facilitator: true, replica, seed })
  return { world, alice, held }
}
