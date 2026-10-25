/**
 * Test harness for the board transport (change reliable-board-sync).
 *
 * Runs several real `EncryptedRelayTransport` instances (real WebCrypto, real signatures, real
 * fold) against:
 * - FakeRelay: the relay room behaviour (welcome, hist, peers, fresh-only fan-out, sig routing,
 *   presence), memory only, with eviction and per-socket drops;
 * - FakeRtc: WebRTC data channels in memory, where chosen pairs of participants cannot link;
 * - a memory replica store.
 * Time is driven by `World.run(ms)` on vitest fake timers (setTimeout, setInterval, Date).
 */
import type { ReplicaRecord, ReplicaStorePort } from '@retroboard/application'
import { deriveContentKey, fromBase64Url, randomKey, toBase64Url } from '@retroboard/crypto'
import type { Command, Snapshot } from '@retroboard/domain'
import { parseClientFrame, type Envelope, type RelayFrame } from '@retroboard/protocol'
import { vi } from 'vitest'
import { createSessionSigner, ed25519Verifier, signerFor } from '../app/adapters/signing'
import { type EncryptedDeps, EncryptedRelayTransport } from '../app/transport/encrypted'
import type { ConnectionStatus } from '../app/transport/types'

const realSetTimeout = globalThis.setTimeout
const realTick = (ms = 1) => new Promise<void>((resolve) => realSetTimeout(resolve, ms))

const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')

// ---------------------------------------------------------------- relay

/** Same budget logic as apps/relay/src/relay-core.ts EnvelopeBuffer (fresh ids only, arrival order). */
class Buffer {
  private readonly byId = new Map<string, Envelope>()
  add(envs: readonly Envelope[]): Envelope[] {
    const fresh: Envelope[] = []
    for (const e of envs) if (!this.byId.has(e.id)) { this.byId.set(e.id, e); fresh.push(e) }
    return fresh
  }
  pages(size = 100): Envelope[][] {
    const all = [...this.byId.values()]
    const out: Envelope[][] = []
    for (let i = 0; i < all.length; i += size) out.push(all.slice(i, i + size))
    return out
  }
  get size() { return this.byId.size }
}

export class FakeRelay {
  private buffer = new Buffer()
  readonly sockets = new Map<string, FakeSocket>()
  /** Counters for budget assertions. */
  stats = { pubFrames: 0, pubEnvs: 0, freshEnvs: 0, fanOut: 0 }
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
    this.buffer = new Buffer()
    for (const s of [...this.sockets.values()]) s.serverClose()
  }

  /**
   * Durable Object hibernation: the instance is evicted from memory but the WebSockets stay
   * attached. The buffer is gone, nobody is told.
   */
  forget(): void { this.buffer = new Buffer() }

  /** A client socket opened. */
  accept(socket: FakeSocket): void {
    if (this.down) { realSetTimeout(() => socket.serverClose(), 0); return }
    const conn = this.connId()
    socket.conn = conn
    this.sockets.set(conn, socket)
    socket.toClient({ t: 'welcome', conn, peers: this.conns() })
    const pages = this.buffer.pages()
    if (!pages.length) socket.toClient({ t: 'hist', envs: [], done: true })
    pages.forEach((envs, i) => socket.toClient({ t: 'hist', envs, done: i === pages.length - 1 }))
    this.broadcastPeers()
  }

  closed(socket: FakeSocket): void {
    if (socket.conn && this.sockets.get(socket.conn) === socket) this.sockets.delete(socket.conn)
    this.broadcastPeers()
  }

  fromClient(socket: FakeSocket, text: string): void {
    if (text === 'ping') return
    const frame = parseClientFrame(JSON.parse(text))
    if (!frame) return
    if (frame.t === 'pub') {
      this.stats.pubFrames++
      this.stats.pubEnvs += frame.envs.length
      const fresh = this.buffer.add(frame.envs)
      this.stats.freshEnvs += fresh.length
      if (fresh.length) this.fanOut({ t: 'env', envs: fresh }, socket)
    } else if (frame.t === 'eph') {
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

  constructor() {
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
    const deps: Promise<EncryptedDeps> = (async () => ({
      contentKey: await deriveContentKey(fromBase64Url(this.roomKey)!, this.roomId),
      session: await createSessionSigner({ get: () => seed.value, set: (v) => { seed.value = v } }),
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
      { roomId: this.roomId, roomKey: this.roomKey, ...(opts.facilitator ? { facilitatorSecret: this.facilitatorSecret } : {}) },
      {
        onSnapshot: (s) => { peer.snapshot = s },
        onError: (code) => { peer.errors.push(code) },
        onStatus: (s) => { peer.status = s },
        onAccessDenied: () => { peer.accessDenied = true },
        onReplica: (state) => { peer.replicaState = state },
        onCursor: (_c, name) => { peer.cursors.push(String(name)) },
        onFocus: (_f, name) => { peer.focus.push(String(name)) },
        onLinks: (state) => { peer.links = state },
      },
      deps,
    )
    peer.transport.connect({ cid: hex(16), name, showName: true })
    return peer
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
