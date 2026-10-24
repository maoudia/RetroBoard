/**
 * Protocol v2 transport: end-to-end encrypted board over the memory-only relay.
 * The relay sees envelopes { v, room, id, hlc, ct } and connection ids, nothing else.
 *
 * Inbound: open (AES-GCM, AAD binds room/id/hlc) -> parse -> verify signature -> fold.
 * Outbound: build event -> preview fold (local rule check) -> sign -> seal -> publish.
 * Every peer runs the same fold, so all replicas converge without a server reducer.
 */
import { EventLog, type SignedEvent, type SignerPort, signEvent, type VerifierPort, verifyEvent } from '@retroboard/application'
import { fromBase64Url, fromUtf8, open, seal, toBase64Url, utf8 } from '@retroboard/crypto'
import { buildSnapshot, type Command, type ErrorCode, type EventBody, type IgnoreReason, isPrivileged, type KeyRing, type Peer } from '@retroboard/domain'
import { HybridClock } from '@retroboard/sync'
import { type Envelope, envelopeAad, PROTOCOL_VERSION, parsePresence, parseRelayFrame, parseSignedEvent, type Presence, type RelayFrame } from '@retroboard/protocol'
import type { BoardTransport, Identity, TransportHandlers } from './types'
import { ulid } from './ulid'
import { backoffDelay } from './websocket'

export interface EncryptedDeps {
  contentKey: Uint8Array
  session: SignerPort
  /** Present for the facilitator: signs genesis and privileged events. */
  facilitator: SignerPort | null
  verifier: VerifierPort
  WS?: typeof WebSocket
  now?: () => number
}

const toError = (reason: IgnoreReason): ErrorCode =>
  reason === 'rate-limited' ? 'limit-reached'
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
      if (!this.closed) this.open()
    }, () => this.handlers.onError('invalid'))
  }

  send(command: Command): boolean {
    if (this.ws?.readyState !== 1 || !this.synced || !this.identity) return false
    const body: EventBody = { t: 'cmd', cmd: command, name: this.identity.name || null, showName: this.identity.showName }
    this.enqueue(() => this.publishLocal(body))
    return true
  }

  updateIdentity(identity: Identity): void {
    this.identity = identity
    this.enqueue(() => this.announce())
    this.emit()
  }

  close(): void {
    this.closed = true
    clearTimeout(this.reconnectTimer)
    clearInterval(this.heartbeat)
    this.ws?.close(1000)
    this.ws = null
    this.handlers.onStatus('closed')
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
    this.push([await this.sealEvent(event)])
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

  /** Decrypts, validates and verifies inbound events. Anything invalid is dropped silently. */
  private async ingest(envs: readonly Envelope[]): Promise<number> {
    let added = 0
    for (const env of envs) {
      if (this.log.has(env.id)) continue
      const event = parseSignedEvent(await this.openEnvelope(env))
      // The envelope header must agree with the signed content (no relabelled replays).
      if (!event || event.id !== env.id || event.at !== env.hlc) continue
      const verified = await verifyEvent(this.deps.verifier, this.ring.roomId, event)
      if (verified && this.log.insert(event)) { this.hlc.receive(event.at); added++ }
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
    if (!this.conn || !this.identity || this.ws?.readyState !== 1) return
    const p: Presence = { t: 'presence', conn: this.conn, name: this.identity.name || null, showName: this.identity.showName }
    const head = { v: PROTOCOL_VERSION, room: this.ring.roomId, id: ulid(), hlc: this.now() } as const
    const ct = await seal(this.deps.contentKey, utf8(JSON.stringify(p)), utf8(envelopeAad(head)))
    this.ws.send(JSON.stringify({ t: 'eph', env: { ...head, ct: toBase64Url(ct) } }))
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
        const p = parsePresence(await this.openEnvelope(frame.env))
        if (p && this.conns.includes(p.conn)) { this.presence.set(p.conn, p); this.emit() }
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

  private peers(): Peer[] {
    const list = this.conns.map((c) => ({ name: this.presence.get(c)?.showName ? this.presence.get(c)!.name : (c === this.conn && this.identity?.showName ? this.identity.name || null : null), me: c === this.conn }))
    if (!list.some((p) => p.me)) list.unshift({ name: this.identity?.showName ? this.identity.name || null : null, me: true })
    return list.sort((x, y) => Number(y.me) - Number(x.me) || (x.name ?? '').localeCompare(y.name ?? ''))
  }

  private emit(): void {
    if (!this.synced) return
    this.handlers.onSnapshot(buildSnapshot(this.log.ledger.board, { cid: this.actorKey }, this.peers(), this.now()))
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
