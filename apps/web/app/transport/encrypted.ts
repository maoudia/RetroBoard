/**
 * Protocol v2 transport: end-to-end encrypted board, peer to peer.
 *
 * Board events and cursors travel on a WebRTC mesh between the participants (mesh.ts). The relay
 * keeps the strict minimum: who is in the room, the encrypted WebRTC offer and answer, presence,
 * and a fallback for participants who cannot open any direct link (they publish through the
 * relay, and one peer of the mesh, the bridge, forwards the board to and from them).
 *
 * Inbound: open (AES-GCM, AAD binds room/id/hlc) -> parse -> verify signature -> fold.
 * Outbound: build event -> preview fold (local rule check) -> sign -> seal -> publish.
 * Every peer runs the same fold, so all replicas converge without a server reducer.
 */
import { EventLog, type OwnCursor, type OwnFocus, type ReplicaStorePort, type SignedEvent, type SignerPort, signEvent, type VerifierPort, verifyEvent } from '@retroboard/application'
import { deriveFileKey, fromBase64Url, fromUtf8, open, seal, toBase64Url, utf8 } from '@retroboard/crypto'
import { buildSnapshot, canSteer, type Command, type ErrorCode, type EventBody, type IgnoreReason, isPrivileged, type KeyRing, type Peer, type Role, roleOf, type RoleBody } from '@retroboard/domain'
import { bridgeOf, chunks, HybridClock, isFullMesh, SeenSet } from '@retroboard/sync'
import { BOARD_FILE_FORMAT, type BoardFile, boardFileAad, type Envelope, envelopeAad, HAVE_CHUNK, PEER_ENV_CHUNK, PROTOCOL_VERSION, parseBoardFile, parseEnvelope, parseEnvelopes, parseLive, parsePeerFrame, parseRelayFrame, parseSignal, parseSignedEvent, type Live, type PeerFrame, type Presence, type RelayFrame, type Signal } from '@retroboard/protocol'
import type { BoardTransport, Identity, TransportHandlers } from './types'
import { ulid } from './ulid'
import { backoffDelay } from './backoff'
import { PeerMesh } from './mesh'

/** Retry delay when the board is at its participant cap. */
export const FULL_RETRY_MS = 15_000
/** Others are in the room but no direct link opened by then: use the relay fallback. */
export const P2P_WAIT_MS = 8_000

export interface EncryptedDeps {
  contentKey: Uint8Array
  session: SignerPort
  /** Present for the facilitator: signs genesis and privileged events. */
  facilitator: SignerPort | null
  verifier: VerifierPort
  /** Local encrypted replica: the board opens from it before (or without) the relay. */
  replica?: ReplicaStorePort
  WS?: typeof WebSocket
  now?: () => number
  /** Peer-to-peer mesh. false: relay only (setting "hide my IP from other participants"). */
  p2p?: boolean
  iceServers?: RTCIceServer[]
  RTC?: typeof RTCPeerConnection
}

const toError = (reason: IgnoreReason): ErrorCode =>
  reason === 'rate-limited' ? 'limit-reached'
    : reason === 'hidden' || reason === 'closed' ? 'forbidden'
    : reason === 'not-facilitator' || reason === 'no-genesis' || reason === 'bad-genesis' || reason === 'duplicate-genesis' ? 'forbidden' : reason

export function buildWs2Url(base: string, roomId: string, loc: Pick<Location, 'protocol' | 'host'>): string {
  const origin = base || `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}`
  return `${origin.replace(/\/$/, '')}/ws2?room=${encodeURIComponent(roomId)}`
}

export class EncryptedRelayTransport implements BoardTransport {
  private ws: WebSocket | null = null
  private identity: Identity | null = null
  private readonly log: EventLog<SignedEvent>
  private conn: string | null = null
  private conns: string[] = []
  private readonly presence = new Map<string, Presence>()
  private full = false
  private synced = false
  private mesh: PeerMesh | null = null
  /** No direct link: my board events go through the relay (fallback). */
  private relayOnly = false
  private p2pTimer: ReturnType<typeof setTimeout> | undefined
  /** Sealed envelopes by event id: served to peers without sealing again. */
  private readonly sealed = new Map<string, Envelope>()
  /** Peers that finished the initial sync with me, and the `have` lists being received. */
  private readonly peerSynced = new Set<string>()
  private readonly peerHave = new Map<string, Set<string>>()
  private readonly seenLive = new SeenSet(4_000)
  private histDone = false
  /** Envelopes received from anyone, for the wrong-passcode check. */
  private received = 0
  /** Presence and signalling from the others that did not / did open with my key (wrong passcode). */
  private liveFailed = 0
  private liveOpened = 0
  private wasBridge = false
  private queue: Promise<void> = Promise.resolve()
  private attempts = 0
  private closed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private hlc = new HybridClock()
  private deps!: EncryptedDeps
  private WS: typeof WebSocket = WebSocket
  private now: () => number = Date.now

  /** `deps` is a promise: key derivation and signer set-up are async (WebCrypto). */
  constructor(
    private readonly url: string,
    private readonly ring: KeyRing,
    private readonly handlers: TransportHandlers,
    private readonly depsReady: Promise<EncryptedDeps>,
  ) {
    this.log = new EventLog(ring.roomId)
  }

  connect(identity: Identity): void {
    this.identity = identity
    this.closed = false
    this.handlers.onStatus('connecting')
    void this.depsReady.then((deps) => {
      this.deps = deps
      this.WS = deps.WS ?? WebSocket
      this.now = deps.now ?? Date.now
      this.hlc = new HybridClock(this.now)
      this.enqueue(async () => {
        await this.loadReplica()
        if (!this.closed) this.open()
      })
    }, () => this.handlers.onError('invalid'))
  }

  private get reachable(): boolean {
    return this.ws?.readyState === 1 || (this.mesh?.linked.length ?? 0) > 0
  }

  send(command: Command): boolean {
    if (!this.reachable || !this.synced || !this.identity) return false
    const body: EventBody = { t: 'cmd', cmd: command, name: this.identity.name || null, showName: this.identity.showName }
    this.enqueue(() => this.publishLocal(body))
    return true
  }

  sendRole(change: RoleBody['t'], key: string): boolean {
    if (!this.reachable || !this.synced) return false
    this.enqueue(() => this.publishLocal({ t: change, key }))
    return true
  }

  updateIdentity(identity: Identity): void {
    this.identity = identity
    this.enqueue(() => this.announce())
    this.emit()
  }

  close(): void {
    this.closed = true
    // Writes still batched are dropped: the page may be deleting this replica right now.
    clearTimeout(this.replicaTimer)
    this.replicaTimer = undefined
    this.pendingReplica = []
    clearTimeout(this.reconnectTimer)
    clearTimeout(this.p2pTimer)
    clearInterval(this.heartbeat)
    this.mesh?.close()
    this.mesh = null
    this.ws?.close(1000)
    this.ws = null
    this.handlers.onStatus('closed')
  }

  async exportBoardFile(): Promise<string | null> {
    if (!this.deps || this.log.size === 0) return null
    const envs = await Promise.all(this.log.all().map((e) => this.sealEvent(e)))
    const key = await deriveFileKey(this.deps.contentKey, this.ring.roomId)
    const ct = await seal(key, utf8(JSON.stringify(envs)), utf8(boardFileAad(this.ring.roomId)))
    const file: BoardFile = { format: BOARD_FILE_FORMAT, room: this.ring.roomId, ct: toBase64Url(ct) }
    return JSON.stringify(file)
  }

  /**
   * Restores a board file into this room: events are verified like any other, folded, kept in
   * the local replica and re-published so the relay and the other participants get them back.
   */
  importBoardFile(text: string): Promise<number | null> {
    return new Promise((resolve) => this.enqueue(async () => {
      let raw: unknown
      try { raw = JSON.parse(text) } catch { return resolve(null) }
      const file = parseBoardFile(raw)
      if (!this.deps || !file || file.room !== this.ring.roomId) return resolve(null)
      const key = await deriveFileKey(this.deps.contentKey, this.ring.roomId)
      const ct = fromBase64Url(file.ct)
      const pt = ct && await open(key, ct, utf8(boardFileAad(file.room)))
      if (!pt) return resolve(null)
      let inner: unknown
      try { inner = JSON.parse(fromUtf8(pt)) } catch { return resolve(null) }
      const envs = parseEnvelopes(inner)
      if (!envs) return resolve(null)
      const added = await this.ingest(envs)
      if (added.length) {
        this.publish(added)
        this.emit()
      }
      resolve(added.length)
    }))
  }

  /** Signing key used as the actor of this session's content (notes, votes). */
  get actorKey(): string { return this.deps.session.publicKey }

  private enqueue(job: () => Promise<void>): void {
    this.queue = this.queue.then(job).catch(() => { /* a failed job must not block the next ones */ })
  }

  private clock(): number {
    return this.hlc.tick()
  }

  private async publishLocal(body: EventBody): Promise<void> {
    const signer = isPrivileged(body) && this.deps.facilitator ? this.deps.facilitator : this.deps.session
    const draft = { id: ulid(), at: this.clock(), body }
    const verdict = this.log.preview({ ...draft, author: signer.publicKey })
    if (!verdict.ok) {
      this.handlers.onError(toError(verdict.reason))
      this.emit()
      return
    }
    const event = await signEvent(signer, this.ring.roomId, draft)
    this.log.insert(event)
    this.emit()
    const env = await this.sealEvent(event)
    this.sealed.set(env.id, env)
    this.remember([env])
    this.publish([env])
  }

  private async sealEvent(e: SignedEvent): Promise<Envelope> {
    const head = { v: PROTOCOL_VERSION, room: this.ring.roomId, id: e.id, hlc: e.at } as const
    const ct = await seal(this.deps.contentKey, utf8(JSON.stringify(e)), utf8(envelopeAad(head)))
    return { ...head, ct: toBase64Url(ct) }
  }

  private async openEnvelope(env: Envelope): Promise<unknown> {
    if (env.room !== this.ring.roomId) return null
    const ct = fromBase64Url(env.ct)
    const pt = ct && await open(this.deps.contentKey, ct, utf8(envelopeAad(env)))
    if (!pt) return null
    try { return JSON.parse(fromUtf8(pt)) as unknown } catch { return null }
  }

  /** Set once the board is destroyed: the local copy is deleted and nothing is stored again. */
  private forgotten = false
  private forgetReplica(): void {
    if (this.forgotten) return
    this.forgotten = true
    clearTimeout(this.replicaTimer)
    this.replicaTimer = undefined
    this.pendingReplica = []
    void this.deps.replica?.delete(this.ring.roomId).catch(() => { /* best effort */ })
  }

  private pendingReplica: Envelope[] = []
  private replicaTimer: ReturnType<typeof setTimeout> | undefined

  /** Envelopes are already ciphertext: the replica stores them as they are, in small batches. */
  private remember(envs: readonly Envelope[]): void {
    const replica = this.deps.replica
    if (!replica || envs.length === 0 || this.forgotten) return
    if (this.log.ledger.board.settings.destroyed) { this.forgetReplica(); return }
    this.pendingReplica.push(...envs)
    if (this.replicaTimer) return
    this.replicaTimer = setTimeout(() => {
      this.replicaTimer = undefined
      const batch = this.pendingReplica.splice(0)
      void replica.append(this.ring.roomId, batch.map((e) => ({ id: e.id, data: JSON.stringify(e) }))).catch(() => { /* best effort */ })
    }, 250)
  }

  private async loadReplica(): Promise<void> {
    const replica = this.deps.replica
    if (!replica) return
    let envs: Envelope[]
    try {
      envs = (await replica.load(this.ring.roomId)).flatMap((r) => {
        const env = parseEnvelope((() => { try { return JSON.parse(r.data) as unknown } catch { return null } })())
        return env ? [env] : []
      })
    } catch { return }
    // Already stored: ingest without re-remembering.
    if ((await this.ingest(envs, false)).length) this.emit()
  }

  /** Decrypts, validates and verifies inbound events. Anything invalid is dropped silently. Returns the new ones. */
  private async ingest(envs: readonly Envelope[], remember = true): Promise<Envelope[]> {
    const added: Envelope[] = []
    for (const env of envs) {
      if (this.log.has(env.id)) continue
      const event = parseSignedEvent(await this.openEnvelope(env))
      // The envelope header must agree with the signed content (no relabelled replays).
      if (!event || event.id !== env.id || event.at !== env.hlc) continue
      const verified = await verifyEvent(this.deps.verifier, this.ring.roomId, event)
      if (verified && this.log.insert(event)) {
        this.noticeIfLive(event)
        this.hlc.receive(event.at)
        this.sealed.set(env.id, env)
        added.push(env)
        if (remember) this.remember([env])
      }
    }
    return added
  }

  /** Tells the page about a reset or phase step made by someone else just now (history replays stay silent). */
  private noticeIfLive(event: SignedEvent): void {
    const body = event.body
    if (body.t !== 'cmd' || !this.handlers.onNotice || Date.now() - event.at > 30_000) return
    const by = body.showName ? body.name : null
    const c = body.cmd
    const board = this.log.ledger.board
    if (c.t === 'board.reset') this.handlers.onNotice({ kind: 'reset.board', by })
    else if (c.t === 'vote.reset') this.handlers.onNotice({ kind: 'reset.votes', by })
    else if (c.t === 'timer.reset' && c.agendaClock) this.handlers.onNotice({ kind: 'reset.clock', by })
    else if (c.t === 'agenda.prev') this.handlers.onNotice({ kind: 'phase.prev', by })
    else if (c.t === 'column.reset') this.handlers.onNotice({ kind: 'reset.column', by, column: c.id ? (board.columns.find((x) => x.id === c.id)?.title) : undefined })
  }

  /** Relay `pub` (fallback path), in frames of at most 100 envelopes. */
  private push(envs: readonly Envelope[]): void {
    for (const part of chunks(envs, 100)) if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ t: 'pub', envs: part }))
  }

  private relayOnlyPeers(): Set<string> {
    const set = new Set([...this.presence.values()].filter((p) => p.relayOnly && this.conns.includes(p.conn)).map((p) => p.conn))
    if (this.relayOnly && this.conn) set.add(this.conn)
    return set
  }

  private get isBridge(): boolean {
    return !!this.conn && !this.relayOnly && bridgeOf(this.conns, this.relayOnlyPeers()) === this.conn
  }

  /**
   * New envelopes go to the mesh. Through the relay only when I am relay-only, or when I bridge
   * relay-only participants. `from`: the peer they came from (not sent back to it).
   */
  private publish(envs: readonly Envelope[], from?: string): void {
    if (!envs.length) return
    if (this.mesh) for (const part of chunks(envs, PEER_ENV_CHUNK)) this.mesh.broadcastReliable(JSON.stringify({ t: 'env', envs: part } satisfies PeerFrame), from)
    if (this.relayOnly || this.isBridge) this.push(envs)
  }

  private async sealedAll(): Promise<Envelope[]> {
    return Promise.all(this.log.all().map(async (e) => {
      const known = this.sealed.get(e.id)
      if (known) return known
      const env = await this.sealEvent(e)
      this.sealed.set(e.id, env)
      return env
    }))
  }

  private async republishAll(): Promise<void> {
    this.push(await this.sealedAll())
  }

  /** Becoming the bridge, or a new relay-only participant: hand them the whole board once. */
  private async checkBridge(): Promise<void> {
    const bridge = this.isBridge
    if (bridge && !this.wasBridge) await this.republishAll()
    this.wasBridge = bridge
  }

  private async announce(): Promise<void> {
    if (!this.conn || !this.identity) return
    const p: Presence = {
      t: 'presence', conn: this.conn, name: this.identity.name || null, showName: this.identity.showName, key: this.deps.session.publicKey,
      ...(this.deps.facilitator ? { fkey: this.deps.facilitator.publicKey } : {}), ...(this.relayOnly ? { relayOnly: true } : {}),
    }
    await this.sendEph(p)
  }

  private async sealLive(live: Live | Signal): Promise<Envelope> {
    const head = { v: PROTOCOL_VERSION, room: this.ring.roomId, id: ulid(), hlc: this.now() } as const
    const ct = await seal(this.deps.contentKey, utf8(JSON.stringify(live)), utf8(envelopeAad(head)))
    return { ...head, ct: toBase64Url(ct) }
  }

  /** Presence goes through the relay (fanned out, never buffered, never in the log or the replica). */
  private async sendEph(live: Live): Promise<void> {
    if (this.ws?.readyState !== 1) return
    const env = await this.sealLive(live)
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ t: 'eph', env }))
  }

  /** Cursors and focus go peer to peer only: relay-only participants do not share them. */
  private async sendPeerLive(live: Live): Promise<void> {
    if (!this.mesh?.linked.length) return
    const env = await this.sealLive(live)
    this.seenLive.add(env.id)
    this.mesh?.broadcastLive(JSON.stringify({ t: 'eph', env, hop: 0 } satisfies PeerFrame))
  }

  sendCursor(cursor: OwnCursor): void {
    if (this.conn && this.synced) void this.sendPeerLive({ t: 'cursor', conn: this.conn, ...cursor }).catch(() => {})
  }

  sendFocus(focus: OwnFocus): void {
    if (this.conn && this.synced) void this.sendPeerLive({ t: 'focus', conn: this.conn, ...focus }).catch(() => {})
  }

  private async sendSignal(to: string, kind: 'offer' | 'answer', sdp: string): Promise<void> {
    if (!this.conn || this.ws?.readyState !== 1) return
    const env = await this.sealLive({ t: 'sig', from: this.conn, to, kind, sdp })
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ t: 'sig', to, env }))
  }

  private onLive(live: Live): void {
    if (!this.conns.includes(live.conn) || live.conn === this.conn) return
    if (live.t === 'presence') { this.presence.set(live.conn, live); this.emit(); void this.checkBridge(); return }
    const name = this.liveName(live.conn)
    if (name === undefined) return
    if (live.t === 'cursor') this.handlers.onCursor?.({ conn: live.conn, anchor: live.anchor, x: live.x, y: live.y, drag: live.drag }, name)
    else this.handlers.onFocus?.({ conn: live.conn, column: live.column, note: live.note, typing: live.typing }, name)
  }

  // ----- Mesh -----

  private startMesh(): void {
    this.mesh?.close()
    this.mesh = null
    this.peerSynced.clear()
    this.peerHave.clear()
    clearTimeout(this.p2pTimer)
    const canP2p = this.deps.p2p !== false && typeof (this.deps.RTC ?? globalThis.RTCPeerConnection) === 'function'
    if (!canP2p || !this.conn) { this.setRelayOnly(true); return }
    this.setRelayOnly(false)
    this.mesh = new PeerMesh({
      me: this.conn,
      iceServers: this.deps.iceServers ?? [],
      RTC: this.deps.RTC,
      signal: (to, kind, sdp) => this.enqueue(() => this.sendSignal(to, kind, sdp)),
      onOpen: (c) => this.enqueue(() => this.onPeerOpen(c)),
      onClose: (c) => { this.peerSynced.delete(c); this.peerHave.delete(c) },
      onReliable: (c, data) => this.onPeerData(c, data),
      onLive: (c, data) => this.onPeerData(c, data),
    })
    this.mesh.update(this.conns)
    this.armP2pTimer()
  }

  /** Others are here and no link opened in time: fall back to the relay (and keep trying links). */
  private armP2pTimer(): void {
    clearTimeout(this.p2pTimer)
    this.p2pTimer = setTimeout(() => this.enqueue(async () => {
      if (this.closed || !this.mesh || this.mesh.linked.length > 0) return
      if (this.conns.some((c) => c !== this.conn)) { this.setRelayOnly(true); await this.announce(); await this.maybeSynced() }
    }), P2P_WAIT_MS)
  }

  private setRelayOnly(on: boolean): void {
    if (this.relayOnly === on) return
    this.relayOnly = on
    this.handlers.onLinks?.({ p2p: !on, peers: this.mesh?.linked.length ?? 0 })
  }

  private async onPeerOpen(conn: string): Promise<void> {
    if (this.relayOnly && this.mesh) {
      // A direct link after all: back to peer to peer.
      this.setRelayOnly(false)
      await this.announce()
    }
    this.handlers.onLinks?.({ p2p: true, peers: this.mesh?.linked.length ?? 0 })
    // Initial sync: tell the peer what I hold; it answers with what I lack, then `synced`.
    const ids = this.log.all().map((e) => e.id)
    const parts = chunks(ids, HAVE_CHUNK)
    if (!parts.length) parts.push([])
    parts.forEach((part, i) => this.mesh?.sendReliable(conn, JSON.stringify({ t: 'have', ids: part, done: i === parts.length - 1 } satisfies PeerFrame)))
  }

  private onPeerData(conn: string, data: string): void {
    let raw: unknown
    try { raw = JSON.parse(data) } catch { return }
    const frame = parsePeerFrame(raw)
    if (frame) this.enqueue(() => this.onPeerFrame(conn, frame))
  }

  private async onPeerFrame(conn: string, frame: PeerFrame): Promise<void> {
    switch (frame.t) {
      case 'have': {
        const have = this.peerHave.get(conn) ?? new Set<string>()
        for (const id of frame.ids) have.add(id)
        this.peerHave.set(conn, have)
        if (!frame.done) return
        this.peerHave.delete(conn)
        const missing = (await this.sealedAll()).filter((e) => !have.has(e.id))
        for (const part of chunks(missing, PEER_ENV_CHUNK)) this.mesh?.sendReliable(conn, JSON.stringify({ t: 'env', envs: part } satisfies PeerFrame))
        this.mesh?.sendReliable(conn, JSON.stringify({ t: 'synced' } satisfies PeerFrame))
        return
      }
      case 'env': {
        this.received += frame.envs.length
        const added = await this.ingest(frame.envs)
        if (!added.length) return
        // Partial mesh: flood new events to my other links. Bridge: also to relay-only participants.
        if (this.mesh && !isFullMesh(this.conns.length)) {
          for (const part of chunks(added, PEER_ENV_CHUNK)) this.mesh.broadcastReliable(JSON.stringify({ t: 'env', envs: part } satisfies PeerFrame), conn)
        }
        if (this.isBridge) this.push(added)
        this.emit()
        return
      }
      case 'synced':
        this.peerSynced.add(conn)
        await this.maybeSynced()
        return
      case 'eph': {
        if (!this.seenLive.add(frame.env.id)) return
        const live = parseLive(await this.openEnvelope(frame.env))
        if (!live || live.t === 'presence') return
        // Direct frames must come from their sender; forwarded ones carry a hop count.
        if (frame.hop === 0 && live.conn !== conn) return
        this.onLive(live)
        // Partial mesh: focus reaches peers I am not linked with (cursors stay direct).
        if (live.t === 'focus' && frame.hop < 2 && !isFullMesh(this.conns.length)) {
          this.mesh?.broadcastLive(JSON.stringify({ t: 'eph', env: frame.env, hop: frame.hop + 1 } satisfies PeerFrame), conn)
        }
      }
    }
  }

  /** Label of a peer, unless the facilitator hid them. undefined: do not show this peer at all. */
  private liveName(conn: string): string | null | undefined {
    const p = this.presence.get(conn)
    if (p?.key && this.log.ledger.hidden.includes(p.key)) return undefined
    return p?.showName ? p.name : null
  }

  private async onFrame(frame: RelayFrame): Promise<void> {
    switch (frame.t) {
      case 'welcome':
        if (this.full) { this.full = false; this.handlers.onRoomFull?.(false) }
        this.conn = frame.conn
        this.conns = frame.peers
        this.synced = false
        this.histDone = false
        this.wasBridge = false
        this.startMesh()
        await this.announce()
        return
      case 'peers': {
        const known = new Set(this.conns)
        this.conns = frame.peers
        for (const c of [...this.presence.keys()]) if (!frame.peers.includes(c)) this.presence.delete(c)
        for (const c of known) if (!frame.peers.includes(c)) this.handlers.onPeerLeft?.(c)
        this.mesh?.update(this.conns)
        if (frame.peers.some((c) => !known.has(c) && c !== this.conn)) await this.announce()
        await this.checkBridge()
        this.emit()
        return
      }
      case 'hist':
        this.received += frame.envs.length
        await this.ingest(frame.envs)
        if (frame.done) { this.histDone = true; await this.maybeSynced() }
        return
      case 'env': {
        // Events of relay-only participants (or of the bridge, for them).
        this.received += frame.envs.length
        const added = await this.ingest(frame.envs)
        if (added.length) {
          // The bridge carries them into the mesh; other mesh peers got them from the relay too.
          if (this.isBridge && this.mesh && !isFullMesh(this.conns.length)) {
            for (const part of chunks(added, PEER_ENV_CHUNK)) this.mesh.broadcastReliable(JSON.stringify({ t: 'env', envs: part } satisfies PeerFrame))
          }
          if (this.relayOnly && !this.synced) await this.maybeSynced()
          this.emit()
        }
        return
      }
      case 'eph': {
        const live = parseLive(await this.openLive(frame.env))
        if (live) this.onLive(live)
        return
      }
      case 'sig': {
        const s = parseSignal(await this.openLive(frame.env))
        if (s && s.from === frame.from && s.to === this.conn) await this.mesh?.onSignal(s.from, s.kind, s.sdp)
        return
      }
      case 'need':
        // Older relays: re-seed only what relay-only participants need.
        if (this.relayOnly || this.isBridge) await this.republishAll()
        return
      case 'err':
        if (frame.code === 'full') { this.full = true; this.handlers.onRoomFull?.(true); return }
        this.handlers.onError('invalid')
    }
  }

  /**
   * Presence and signalling of the others, counted: when none of them opens with my key, the
   * passcode is wrong (the board itself never reaches me: no direct link can be set up).
   */
  private async openLive(env: Envelope): Promise<unknown> {
    const plain = await this.openEnvelope(env)
    if (plain === null) {
      this.liveFailed++
      if (!this.synced && this.liveOpened === 0 && this.log.size === 0) this.deny()
    } else {
      this.liveOpened++
    }
    return plain
  }

  /** The board exists but nothing opens with these keys. Publishing anything would fork it. */
  private deny(): void {
    this.closed = true
    clearInterval(this.heartbeat)
    clearTimeout(this.p2pTimer)
    this.mesh?.close()
    this.mesh = null
    this.ws?.close(1000)
    this.ws = null
    this.handlers.onStatus('closed')
    this.handlers.onAccessDenied?.()
  }

  /**
   * The board is ready once the relay answered and, when others are in the room, one of them
   * synced with me peer to peer (or I fell back to the relay).
   */
  private async maybeSynced(): Promise<void> {
    if (this.synced || !this.histDone) return
    const alone = !this.conns.some((c) => c !== this.conn)
    if (!alone && this.peerSynced.size === 0 && !this.relayOnly) return
    await this.onSynced(alone || this.peerSynced.size > 0)
  }

  private async onSynced(mayCreate: boolean): Promise<void> {
    // The board exists but not one event opened: wrong passcode (or a corrupted link).
    // Stop here: publishing anything, a genesis above all, would fork the board.
    if ((this.received > 0 || (this.liveFailed > 0 && this.liveOpened === 0)) && this.log.size === 0) {
      this.deny()
      return
    }
    this.synced = true
    // Relay-only: hand the relay what I hold (the bridge forwards it into the mesh).
    if (this.relayOnly) await this.republishAll()
    await this.checkBridge()
    // Only create the board when alone or after a peer confirmed there is none yet.
    if (mayCreate && this.log.ledger.facilitatorKey === null && this.deps.facilitator) {
      await this.publishLocal({ t: 'genesis', roomId: this.ring.roomId, facilitatorKey: this.deps.facilitator.publicKey })
    }
    this.handlers.onStatus('open')
    this.emit()
  }

  /** My best role: as this tab's session key, or through the facilitator key of my link. */
  private myRole(): Role {
    const ledger = this.log.ledger
    const roles = [roleOf(ledger, this.deps.session.publicKey), ...(this.deps.facilitator ? [roleOf(ledger, this.deps.facilitator.publicKey)] : [])]
    return roles.includes('facilitator') ? 'facilitator' : roles.includes('co-facilitator') ? 'co-facilitator' : 'participant'
  }

  private peers(): Peer[] {
    const ledger = this.log.ledger
    const rank: Record<Role, number> = { facilitator: 2, 'co-facilitator': 1, participant: 0 }
    const best = (keys: (string | undefined)[]): Role => keys.filter((k): k is string => !!k).map((k) => roleOf(ledger, k)).sort((a, b) => rank[b] - rank[a])[0] ?? 'participant'
    const describe = (key: string | undefined, fkey?: string) => (key ? { key, role: best([key, fkey]), hidden: ledger.hidden.includes(key) } : {})
    const list: Peer[] = this.conns.map((c) => {
      if (c === this.conn) return { name: this.identity?.showName ? this.identity.name || null : null, me: true, key: this.deps.session.publicKey, role: this.myRole(), conn: c }
      const p = this.presence.get(c)
      return { name: p?.showName ? p.name : null, me: false, conn: c, ...describe(p?.key, p?.fkey) }
    })
    if (!list.some((p) => p.me)) list.unshift({ name: this.identity?.showName ? this.identity.name || null : null, me: true, key: this.deps.session.publicKey, role: this.myRole() })
    return list.sort((x, y) => Number(y.me) - Number(x.me) || (x.name ?? '').localeCompare(y.name ?? ''))
  }

  /** Before the relay answers, the board can already show what the local replica holds. */
  private emit(): void {
    if (!this.synced && this.log.ledger.facilitatorKey === null) return
    const ledger = this.log.ledger
    if (ledger.board.settings.destroyed) this.forgetReplica()
    const role = this.myRole()
    const lead = ledger.lead === this.deps.session.publicKey || (!!this.deps.facilitator && (ledger.lead === this.deps.facilitator.publicKey || ledger.facilitatorKey === this.deps.facilitator.publicKey))
    const access = { role, canSteer: role !== 'participant' || canSteer(ledger, this.deps.session.publicKey), bypassesPhase: role !== 'participant', canManageRoles: lead, isLead: ledger.lead === this.deps.session.publicKey }
    this.handlers.onSnapshot({ ...buildSnapshot(ledger.board, { cid: this.actorKey }, this.peers(), this.now()), access })
  }

  private open(): void {
    this.handlers.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
    const ws = new this.WS(this.url)
    this.ws = ws
    ws.onopen = () => {
      this.attempts = 0
      clearInterval(this.heartbeat)
      this.heartbeat = setInterval(() => { if (ws.readyState === 1) ws.send('ping') }, 25_000)
    }
    ws.onmessage = (ev: MessageEvent) => {
      if (ev.data === 'pong' || this.ws !== ws) return
      let raw: unknown
      try { raw = JSON.parse(String(ev.data)) } catch { return }
      const frame = parseRelayFrame(raw)
      if (frame) this.enqueue(() => this.onFrame(frame))
    }
    ws.onclose = () => {
      clearInterval(this.heartbeat)
      if (this.closed || this.ws !== ws) return
      // New connection id on reconnect: the mesh is rebuilt from the next welcome.
      this.mesh?.close()
      this.mesh = null
      clearTimeout(this.p2pTimer)
      this.synced = false
      this.handlers.onStatus('reconnecting')
      // Full room: no point hammering it, a seat frees up when someone leaves.
      this.reconnectTimer = setTimeout(() => { this.attempts++; this.open() }, this.full ? FULL_RETRY_MS : backoffDelay(this.attempts))
    }
    ws.onerror = () => { /* onclose follows */ }
  }
}
