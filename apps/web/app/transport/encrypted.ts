/**
 * Protocol v2 transport: end-to-end encrypted board over the memory-only relay.
 * The relay sees envelopes { v, room, id, hlc, ct } and connection ids, nothing else.
 *
 * Inbound: open (AES-GCM, AAD binds room/id/hlc) -> parse -> verify signature -> fold.
 * Outbound: build event -> preview fold (local rule check) -> sign -> seal -> publish.
 * Every peer runs the same fold, so all replicas converge without a server reducer.
 */
import { EventLog, type OwnCursor, type OwnFocus, type ReplicaStorePort, type SignedEvent, type SignerPort, signEvent, type VerifierPort, verifyEvent } from '@retroboard/application'
import { deriveFileKey, fromBase64Url, fromUtf8, open, seal, toBase64Url, utf8 } from '@retroboard/crypto'
import { buildSnapshot, canSteer, type Command, type ErrorCode, type EventBody, type IgnoreReason, isPrivileged, type KeyRing, type Peer, type Role, roleOf, type RoleBody } from '@retroboard/domain'
import { HybridClock } from '@retroboard/sync'
import { BOARD_FILE_FORMAT, type BoardFile, boardFileAad, type Envelope, envelopeAad, PROTOCOL_VERSION, parseBoardFile, parseEnvelope, parseEnvelopes, parseLive, parseRelayFrame, parseSignedEvent, type Live, type Presence, type RelayFrame } from '@retroboard/protocol'
import type { BoardTransport, Identity, TransportHandlers } from './types'
import { ulid } from './ulid'
import { backoffDelay } from './backoff'

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
}

const toError = (reason: IgnoreReason): ErrorCode =>
  reason === 'rate-limited' ? 'limit-reached'
    : reason === 'hidden' ? 'forbidden'
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
  private synced = false
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

  send(command: Command): boolean {
    if (this.ws?.readyState !== 1 || !this.synced || !this.identity) return false
    const body: EventBody = { t: 'cmd', cmd: command, name: this.identity.name || null, showName: this.identity.showName }
    this.enqueue(() => this.publishLocal(body))
    return true
  }

  sendRole(change: RoleBody['t'], key: string): boolean {
    if (this.ws?.readyState !== 1 || !this.synced) return false
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
    clearInterval(this.heartbeat)
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
      if (added) {
        this.push(envs.filter((e) => this.log.has(e.id)))
        this.emit()
      }
      resolve(added)
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
    this.remember([env])
    this.push([env])
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

  private pendingReplica: Envelope[] = []
  private replicaTimer: ReturnType<typeof setTimeout> | undefined

  /** Envelopes are already ciphertext: the replica stores them as they are, in small batches. */
  private remember(envs: readonly Envelope[]): void {
    const replica = this.deps.replica
    if (!replica || envs.length === 0) return
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
    if (await this.ingest(envs, false)) this.emit()
  }

  /** Decrypts, validates and verifies inbound events. Anything invalid is dropped silently. */
  private async ingest(envs: readonly Envelope[], remember = true): Promise<number> {
    let added = 0
    for (const env of envs) {
      if (this.log.has(env.id)) continue
      const event = parseSignedEvent(await this.openEnvelope(env))
      // The envelope header must agree with the signed content (no relabelled replays).
      if (!event || event.id !== env.id || event.at !== env.hlc) continue
      const verified = await verifyEvent(this.deps.verifier, this.ring.roomId, event)
      if (verified && this.log.insert(event)) {
        this.hlc.receive(event.at)
        added++
        if (remember) this.remember([env])
      }
    }
    return added
  }

  private push(envs: Envelope[]): void {
    for (let i = 0; i < envs.length; i += 100) {
      if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ t: 'pub', envs: envs.slice(i, i + 100) }))
    }
  }

  private async republishAll(): Promise<void> {
    this.push(await Promise.all(this.log.all().map((e) => this.sealEvent(e))))
  }

  private async announce(): Promise<void> {
    if (!this.conn || !this.identity) return
    const p: Presence = { t: 'presence', conn: this.conn, name: this.identity.name || null, showName: this.identity.showName, key: this.deps.session.publicKey, ...(this.deps.facilitator ? { fkey: this.deps.facilitator.publicKey } : {}) }
    await this.sendEph(p)
  }

  /** Ephemeral frames are fanned out by the relay, never buffered, and never reach the log or the replica. */
  private async sendEph(live: Live): Promise<void> {
    if (this.ws?.readyState !== 1) return
    const head = { v: PROTOCOL_VERSION, room: this.ring.roomId, id: ulid(), hlc: this.now() } as const
    const ct = await seal(this.deps.contentKey, utf8(JSON.stringify(live)), utf8(envelopeAad(head)))
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ t: 'eph', env: { ...head, ct: toBase64Url(ct) } }))
  }

  sendCursor(cursor: OwnCursor): void {
    if (this.conn && this.synced) void this.sendEph({ t: 'cursor', conn: this.conn, ...cursor }).catch(() => {})
  }

  sendFocus(focus: OwnFocus): void {
    if (this.conn && this.synced) void this.sendEph({ t: 'focus', conn: this.conn, ...focus }).catch(() => {})
  }

  /** Label of a peer, unless the facilitator hid them. undefined: do not show this peer at all. */
  private liveName(conn: string): string | null | undefined {
    const p = this.presence.get(conn)
    if (p?.key && this.log.ledger.hidden.includes(p.key)) return undefined
    return p?.showName ? p.name : null
  }

  private async onFrame(frame: RelayFrame, historyIds: Set<string>): Promise<void> {
    switch (frame.t) {
      case 'welcome':
        this.conn = frame.conn
        this.conns = frame.peers
        this.synced = false
        await this.announce()
        return
      case 'peers': {
        const known = new Set(this.conns)
        this.conns = frame.peers
        for (const c of [...this.presence.keys()]) if (!frame.peers.includes(c)) this.presence.delete(c)
        for (const c of known) if (!frame.peers.includes(c)) this.handlers.onPeerLeft?.(c)
        if (frame.peers.some((c) => !known.has(c) && c !== this.conn)) await this.announce()
        this.emit()
        return
      }
      case 'hist':
        for (const e of frame.envs) historyIds.add(e.id)
        await this.ingest(frame.envs)
        if (frame.done) await this.onSynced(historyIds)
        return
      case 'env':
        if (await this.ingest(frame.envs)) this.emit()
        return
      case 'eph': {
        const live = parseLive(await this.openEnvelope(frame.env))
        if (!live || !this.conns.includes(live.conn) || live.conn === this.conn) return
        if (live.t === 'presence') { this.presence.set(live.conn, live); this.emit(); return }
        const name = this.liveName(live.conn)
        if (name === undefined) return
        if (live.t === 'cursor') this.handlers.onCursor?.({ conn: live.conn, anchor: live.anchor, x: live.x, y: live.y, drag: live.drag }, name)
        else this.handlers.onFocus?.({ conn: live.conn, column: live.column, note: live.note, typing: live.typing }, name)
        return
      }
      case 'need':
        await this.republishAll()
        return
      case 'err':
        this.handlers.onError('invalid')
    }
  }

  private async onSynced(historyIds: Set<string>): Promise<void> {
    // The board exists but not one event opened: wrong passcode (or a corrupted link).
    // Stop here: publishing anything, a genesis above all, would fork the board.
    if (historyIds.size > 0 && this.log.size === 0) {
      this.closed = true
      clearInterval(this.heartbeat)
      this.ws?.close(1000)
      this.ws = null
      this.handlers.onStatus('closed')
      this.handlers.onAccessDenied?.()
      return
    }
    this.synced = true
    // Events we hold that the relay lost (eviction, reconnect): re-seed them.
    const missing = this.log.all().filter((e) => !historyIds.has(e.id))
    if (missing.length) this.push(await Promise.all(missing.map((e) => this.sealEvent(e))))
    if (this.log.ledger.facilitatorKey === null && this.deps.facilitator) {
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
    const role = this.myRole()
    const lead = ledger.lead === this.deps.session.publicKey || (!!this.deps.facilitator && (ledger.lead === this.deps.facilitator.publicKey || ledger.facilitatorKey === this.deps.facilitator.publicKey))
    const access = { role, canSteer: role !== 'participant' || canSteer(ledger, this.deps.session.publicKey), canManageRoles: lead }
    this.handlers.onSnapshot({ ...buildSnapshot(ledger.board, { cid: this.actorKey }, this.peers(), this.now()), access })
  }

  private open(): void {
    this.handlers.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
    const ws = new this.WS(this.url)
    this.ws = ws
    const historyIds = new Set<string>()
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
      if (frame) this.enqueue(() => this.onFrame(frame, historyIds))
    }
    ws.onclose = () => {
      clearInterval(this.heartbeat)
      if (this.closed || this.ws !== ws) return
      this.synced = false
      this.handlers.onStatus('reconnecting')
      this.reconnectTimer = setTimeout(() => { this.attempts++; this.open() }, backoffDelay(this.attempts))
    }
    ws.onerror = () => { /* onclose follows */ }
  }
}
