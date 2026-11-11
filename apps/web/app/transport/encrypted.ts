/**
 * Protocol v2 transport: end-to-end encrypted board, peer to peer with the relay as a safety net
 * (ADR-0024).
 *
 * Board events go to every open direct link of the WebRTC mesh (mesh.ts) and, whenever my links
 * are incomplete, also through the relay (memory only, ciphertext). On every connection a client
 * pushes what the relay history lacked, and one holder re-seeds the relay when someone joins, so
 * the board survives a relay that lost its memory, a flaky link or a participant without WebRTC.
 * Cursors and focus stay peer to peer.
 *
 * Inbound: open (AES-GCM, AAD binds room/id/hlc) -> parse -> verify signature -> fold.
 * Outbound: build event -> preview fold (local rule check) -> sign -> seal -> publish.
 * Every peer runs the same fold, so all replicas converge without a server reducer.
 */
import { EventLog, type HistoryEntry, historyOf, type LogBase, type MoveResult, type OwnCursor, type OwnFocus, type ReplicaStorePort, type RewindPlan, rewindPlan, type SignedEvent, type SignedSnapshot, type SignerPort, signEvent, signSnapshot, type VerifierPort, verifyEvent, verifySnapshot } from '@retroboard/application'
import { deriveFileKey, fromBase64Url, fromUtf8, open, seal, toBase64Url, utf8 } from '@retroboard/crypto'
import { buildSnapshot, canSteer, type Command, type ErrorCode, type EventBody, formatInvite, type IgnoreReason, isPrivileged, type KeyRing, type Peer, participantRing, type Role, roleOf, type RoleBody, signingRoom } from '@retroboard/domain'
import { chunks, HybridClock, isFullMesh, seederOf, SeenSet } from '@retroboard/sync'
import { BOARD_FILE_FORMAT, type BoardFile, boardFileAad, type Envelope, envelopeAad, HAVE_CHUNK, MAX_SNAPSHOT_CT_CHARS, PEER_ENV_CHUNK, PROTOCOL_VERSION, parseBoardFile, parseEnvelope, parseEnvelopes, parseLive, parsePeerFrame, parseRelayFrame, parseSignal, parseSignedEvent, parseSnapshot, parseSnapshotEnvelope, SNAP_CHUNK_CHARS, type Live, type PeerFrame, type Presence, type RelayFrame, type Signal, type SnapshotEnvelope } from '@retroboard/protocol'
import type { BoardTransport, ConnectionStatus, Identity, TransportHandlers } from './types'
import { ulid } from './ulid'
import { backoffDelay } from './backoff'
import { moveRecipients, openMoved, sealMoved, type SessionAgreement } from './room-move'
import { PeerMesh } from './mesh'

/** Retry delay when the board is at its participant cap. */
export const FULL_RETRY_MS = 15_000
/** Others are in the room but none synced with me by then: decide with what the relay and my copy hold. */
export const P2P_WAIT_MS = 8_000
/** Random delay before uploading what the relay lacks, so holders reconnecting together do not all upload. */
export const RESEED_JITTER_MS = 800
/** The facilitator signs a snapshot once this many events lie beyond the previous one, cut at least SNAPSHOT_LAG_MS before the newest event (ADR-0037). */
export const SNAPSHOT_EVERY = 1_000
export const SNAPSHOT_LAG_MS = 60_000
/** Quiet time after the last event of a full log being rebuilt before it replaces the snapshot-based one. */
export const FULL_QUIET_MS = 1_000
/** Replica record ids of snapshots (events use their own id). */
const SNAPSHOT_RECORD = 'snap:'

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
  /** This tab created the board (setup hand-off): it alone may write the genesis without being asked. */
  creator?: boolean
  /** X25519 key of this session: announced in presence, it lets the facilitator seal the new link to me when the team moves. */
  agreement?: SessionAgreement
  /** Content key of another ring (same passcode): needed to keep a copy of the board in a fresh room. */
  contentKeyFor?: (ring: KeyRing) => Promise<Uint8Array>
  /** When the facilitator signs snapshots (default: SNAPSHOT_EVERY, SNAPSHOT_LAG_MS). */
  snapshot?: { every: number; lagMs: number }
}

/** The facilitator waits this long after the hand-offs before closing the old room, so the frames arrive first. */
export const MOVE_SETTLE_MS = 2_500

const toError = (reason: IgnoreReason): ErrorCode =>
  reason === 'rate-limited' ? 'limit-reached'
    : reason === 'hidden' || reason === 'closed' ? 'forbidden'
    : reason === 'not-facilitator' || reason === 'no-genesis' || reason === 'bad-genesis' || reason === 'duplicate-genesis' ? 'forbidden' : reason

/** An event sealed for a room: the same bytes of the event, a header and a key of that room. */
async function sealEventFor(e: SignedEvent, room: string, contentKey: Uint8Array): Promise<Envelope> {
  const head = { v: PROTOCOL_VERSION, room, id: e.id, hlc: e.at } as const
  const ct = await seal(contentKey, utf8(JSON.stringify(e)), utf8(envelopeAad(head)))
  return { ...head, ct: toBase64Url(ct) }
}

export function buildWs2Url(base: string, roomId: string, loc: Pick<Location, 'protocol' | 'host'>): string {
  const origin = base || `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}`
  return `${origin.replace(/\/$/, '')}/ws2?room=${encodeURIComponent(roomId)}`
}

export class EncryptedRelayTransport implements BoardTransport {
  private ws: WebSocket | null = null
  private identity: Identity | null = null
  private log: EventLog<SignedEvent>
  /**
   * Snapshot-based logs only (ADR-0037): the full log being rebuilt after an event before the cut, or a request to export.
   * It receives every event too and replaces `log` once a peer has sent the genesis and the stream went quiet.
   */
  private rebuilt: EventLog<SignedEvent> | null = null
  private fullTimer: ReturnType<typeof setTimeout> | undefined
  /** The newest verified snapshot I hold (made by me, adopted, or received): served to joiners with an empty log. */
  private latest: { snap: SignedSnapshot; env: SnapshotEnvelope } | null = null
  /** Chunks of a snapshot being received, by link. */
  private readonly snapParts = new Map<string, { sid: string; hlc: number; n: number; parts: string[]; chars: number }>()
  /** Links that asked me for a snapshot; links I asked. */
  private readonly snapWanted = new Set<string>()
  private readonly snapAsked = new Set<string>()
  private readonly seenSnap = new SeenSet(64)
  /** Events covered by the last snapshot I signed. */
  private snapCount = 0
  private snapTimer: ReturnType<typeof setTimeout> | undefined
  private conn: string | null = null
  private conns: string[] = []
  private readonly presence = new Map<string, Presence>()
  private full = false
  private synced = false
  private mesh: PeerMesh | null = null
  private p2pTimer: ReturnType<typeof setTimeout> | undefined
  /** Ids the relay is known to hold (history, fan-out, what I pushed): the rest is uploaded at the next welcome. */
  private readonly relayHas = new Set<string>()
  private reseedTimer: ReturnType<typeof setTimeout> | undefined
  /** The facilitator chose to start a new board in a room nobody holds. */
  private startRequested = false
  private lastStatus: ConnectionStatus | null = null
  private replicaFailing = false
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
    this.log = new EventLog(signingRoom(ring))
  }

  connect(identity: Identity): void {
    this.identity = identity
    this.closed = false
    this.setStatus('connecting')
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

  private setStatus(status: ConnectionStatus): void {
    if (this.lastStatus === status) return
    this.lastStatus = status
    this.handlers.onStatus(status)
  }

  /** The board is known here (genesis in the log): commands are accepted even without a connection. */
  private get known(): boolean {
    return this.log.ledger.facilitatorKey !== null
  }

  send(command: Command): boolean {
    // Local first: once the board is known the command is folded and saved at once, and delivered
    // as soon as a path exists (links on open, the relay at the next welcome).
    if (this.closed || !this.known || !this.identity) return false
    const body: EventBody = { t: 'cmd', cmd: command, name: this.identity.name || null, showName: this.identity.showName }
    this.enqueue(() => this.publishLocal(body))
    return true
  }

  sendRole(change: RoleBody['t'], key: string): boolean {
    if (this.closed || !this.known) return false
    this.enqueue(() => this.publishLocal({ t: change, key }))
    return true
  }

  history(): HistoryEntry[] {
    return historyOf(signingRoom(this.ring), this.log.all(), undefined, this.log.base?.ledger)
  }

  rewindPlan(entryId: string): RewindPlan | null {
    return rewindPlan(signingRoom(this.ring), this.log.all(), entryId, this.log.base?.ledger)
  }

  sendRename(key: string, name: string): boolean {
    if (this.closed || !this.known) return false
    this.enqueue(() => this.publishLocal({ t: 'participant.rename', key, name }))
    return true
  }

  // ----- Move to a fresh link (change facilitator-moderation, ADR-0035) -----

  /** The connections a move addresses, frozen by `beginMove`: someone who connects afterwards is not sent the new link. */
  private moveRoster: Set<string> | null = null
  private moving = false

  /** The signer allowed to move the team: the lead facilitator (the facilitator link, or a session key that was handed the lead). */
  private get moveSigner(): SignerPort | null {
    const { lead, facilitatorKey } = this.log.ledger
    const fac = this.deps.facilitator
    if (fac && (fac.publicKey === lead || fac.publicKey === facilitatorKey)) return fac
    return this.deps.session.publicKey === lead ? this.deps.session : null
  }

  private recipientsOf(removing: string | null) {
    return moveRecipients(this.log.ledger, this.presence, this.moveRoster ?? new Set(this.conns), { conn: this.conn, key: this.deps.session.publicKey }, removing)
  }

  beginMove(removing: string | null): number {
    if (this.closed || !this.known || !this.moveSigner) return 0
    this.moveRoster = new Set(this.conns.filter((c) => c !== this.conn))
    return this.recipientsOf(removing).length
  }

  async moveToFreshLink(removing: string | null, ring: KeyRing): Promise<MoveResult | null> {
    // The new room gets every event of my log: one that starts from a snapshot holds only the tail, so rebuild the full log first.
    if (this.log.base && !(await this.fillLog())) return null
    return new Promise((resolve) => this.enqueue(async () => {
      const signer = this.moveSigner
      if (this.closed || !this.known || !signer || !this.deps.contentKeyFor || this.moving || ring.roomId === this.ring.roomId || ring.signRoomId !== signingRoom(this.ring)) return resolve(null)
      this.moving = true
      try {
        const recipients = this.recipientsOf(removing)
        this.moveRoster = null
        // The board is kept in the new room on this device first: it opens from it, whatever happens to the relay.
        await this.keepCopy(ring)
        const link = formatInvite(participantRing(ring))
        let sent = 0
        for (const to of recipients) {
          const ct = await sealMoved(signer, this.ring.roomId, ring, to, link)
          if (ct && this.conn) { await this.sendEph({ t: 'room.moved', conn: this.conn, to: to.conn, ct }); sent++ }
        }
        // The frames come first; then the old room is closed for good, for whoever still holds its link.
        await new Promise((r) => setTimeout(r, MOVE_SETTLE_MS))
        await this.publishLocal({ t: 'cmd', cmd: { t: 'board.destroy' }, name: this.identity?.name || null, showName: this.identity?.showName ?? false })
        await this.flush()
        resolve({ hash: formatInvite(ring, ring.facilitatorSecret ? 'facilitator' : 'participant'), moved: sent })
      } catch {
        resolve(null)
      } finally {
        this.moving = false
      }
    }))
  }

  /** The events of my log sealed under `ring`, kept in this device's copy of that room. False when there is nowhere to keep them. */
  private async keepCopy(ring: KeyRing): Promise<boolean> {
    const { replica, contentKeyFor } = this.deps
    if (!replica || !contentKeyFor) return false
    try {
      const key = await contentKeyFor(ring)
      const envs = await Promise.all(this.log.all().map((e) => sealEventFor(e, ring.roomId, key)))
      await replica.append(ring.roomId, envs.map((e) => ({ id: e.id, data: JSON.stringify(e) })))
      return true
    } catch { return false }
  }

  /** A hand-off addressed to my connection: opened, checked against my own ledger, then the page opens the new link. */
  private async onMoved(ct: string): Promise<void> {
    const agreement = this.deps.agreement
    if (this.closed || this.moving || !agreement || !this.known) return
    const leads = (key: string) => key === this.log.ledger.lead || key === this.log.ledger.facilitatorKey
    const opened = await openMoved(agreement, this.deps.verifier, this.ring.roomId, signingRoom(this.ring), leads, ct)
    if (!opened || this.moving) return
    this.moving = true
    await this.keepCopy(opened.ring)
    this.handlers.onMoved?.({ hash: opened.hash, ring: opened.ring })
  }

  updateIdentity(identity: Identity): void {
    // A renamed participant: the signed notes already on the board follow the new name (#229).
    const before = this.identity
    const nameOf = (i: Identity | null | undefined) => (i?.showName ? i.name.trim() : '')
    if (before && this.known && !this.closed && nameOf(before) && nameOf(identity) && nameOf(before) !== nameOf(identity)) {
      const name = nameOf(identity)
      this.enqueue(() => this.publishLocal({ t: 'participant.self', name }))
    }
    this.identity = identity
    this.enqueue(() => this.announce())
    this.emit()
  }

  close(): void {
    this.closed = true
    // What is still batched is written now (unless the board was destroyed): the page may be
    // reloading, and the replica is the only copy when nobody else is online.
    void this.flush()
    clearTimeout(this.reconnectTimer)
    clearTimeout(this.p2pTimer)
    clearTimeout(this.reseedTimer)
    clearTimeout(this.snapTimer)
    clearTimeout(this.fullTimer)
    clearInterval(this.heartbeat)
    this.mesh?.close()
    this.mesh = null
    this.ws?.close(1000)
    this.ws = null
    this.setStatus('closed')
  }

  async exportBoardFile(): Promise<string | null> {
    if (!this.deps || this.log.size === 0) return null
    // A log that starts from a snapshot does not hold the history a file needs: rebuild the full one first.
    if (this.log.base && !(await this.fillLog())) return null
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
        this.push(added) // a restored board is backed up on the relay too (memory only), whoever is here
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

  private async publishLocal(body: EventBody): Promise<void> {
    const signer = isPrivileged(body) && this.deps.facilitator ? this.deps.facilitator : this.deps.session
    // After everything the log holds, whatever this device's clock says (a clock far behind the
    // others would otherwise sort the event before the genesis, where every replica ignores it).
    const draft = { id: ulid(), at: this.hlc.tick(this.log.lastAt), body }
    const verdict = this.log.preview({ ...draft, author: signer.publicKey })
    if (!verdict.ok) {
      this.handlers.onError(toError(verdict.reason))
      this.emit()
      return
    }
    const event = await signEvent(signer, signingRoom(this.ring), draft)
    // Sealed and staged before the board shows it: what the page shows has a synchronous copy on this device, so a tab
    // left before the replica commits (asynchronous, slower while the page paints) does not lose it.
    const env = await this.sealEvent(event)
    this.sealed.set(env.id, env)
    if (!this.forgotten) this.deps.replica?.stage?.(this.ring.roomId, [{ id: env.id, data: JSON.stringify(env) }])
    this.log.insert(event)
    this.emit()
    this.remember([env], true)
    this.publish([env])
  }

  private sealEvent(e: SignedEvent): Promise<Envelope> {
    return sealEventFor(e, this.ring.roomId, this.deps.contentKey)
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
  private replicaWrites: Promise<void> = Promise.resolve()

  /**
   * Envelopes are already ciphertext: the replica stores them as they are. My own events are
   * written at once (`now`), what others send me in small batches.
   */
  private remember(envs: readonly Envelope[], now = false): void {
    const replica = this.deps.replica
    if (!replica || envs.length === 0 || this.forgotten) return
    if (this.log.ledger.board.settings.destroyed) { this.forgetReplica(); return }
    this.pendingReplica.push(...envs)
    if (now) { void this.flush(); return }
    if (this.replicaTimer) return
    this.replicaTimer = setTimeout(() => { this.replicaTimer = undefined; void this.flush() }, 250)
  }

  /** Writes what is pending. Failures are retried once, then reported to the page (never silent). */
  flush(): Promise<void> {
    const replica = this.deps?.replica
    clearTimeout(this.replicaTimer)
    this.replicaTimer = undefined
    if (!replica || this.forgotten) { this.pendingReplica = []; return this.replicaWrites }
    const batch = this.pendingReplica.splice(0)
    if (batch.length === 0) return this.replicaWrites
    const records = batch.map((e) => ({ id: e.id, data: JSON.stringify(e) }))
    const write = async () => {
      try {
        await replica.append(this.ring.roomId, records)
      } catch {
        try { await replica.append(this.ring.roomId, records) } catch { this.setReplica(true); return }
      }
      this.setReplica(false)
    }
    this.replicaWrites = this.replicaWrites.then(write)
    return this.replicaWrites
  }

  private setReplica(failing: boolean): void {
    if (this.replicaFailing === failing) return
    this.replicaFailing = failing
    this.handlers.onReplica?.(failing ? 'failing' : 'ok')
  }

  private async loadReplica(): Promise<void> {
    const replica = this.deps.replica
    if (!replica) return
    let envs: Envelope[]
    const snaps: SnapshotEnvelope[] = []
    try {
      const json = (data: string): unknown => { try { return JSON.parse(data) as unknown } catch { return null } }
      envs = (await replica.load(this.ring.roomId)).flatMap((r) => {
        if (r.id.startsWith(SNAPSHOT_RECORD)) {
          const snap = parseSnapshotEnvelope(json(r.data))
          if (snap) snaps.push(snap)
          return []
        }
        const env = parseEnvelope(json(r.data))
        return env ? [env] : []
      })
    } catch { this.handlers.onLocalCopy?.(null); return }
    this.handlers.onLocalCopy?.(envs.length)
    // Already stored: ingest without re-remembering.
    if ((await this.ingest(envs, false)).length) this.emit()
    // The events stored here do not make a board (a joiner stored a snapshot and what came after): start from the snapshot.
    if (!this.known && snaps.length) await this.resumeFromSnapshot(snaps)
  }

  /** Opens and verifies a snapshot envelope; null for anything that is not a snapshot of this room signed by its genesis key. */
  private async openSnapshot(env: SnapshotEnvelope): Promise<{ snap: SignedSnapshot; base: LogBase } | null> {
    const plain = parseSnapshot(await this.openEnvelope(env))
    if (!plain || plain.id !== env.id) return null
    const snap = plain as unknown as SignedSnapshot
    const verdict = await verifySnapshot(this.deps.verifier, signingRoom(this.ring), snap)
    return verdict.ok ? { snap, base: verdict.base } : null
  }

  /** The newest stored snapshot that verifies, with the events held folded after it. */
  private async resumeFromSnapshot(envs: readonly SnapshotEnvelope[]): Promise<void> {
    for (const env of [...envs].sort((a, b) => b.hlc - a.hlc)) {
      const opened = await this.openSnapshot(env)
      if (!opened) continue
      this.adopt(opened, env)
      return
    }
  }

  /** Starts the log from a verified snapshot: the events held fold after it (the ones it covers are already in it). */
  private adopt(opened: { snap: SignedSnapshot; base: LogBase }, env: SnapshotEnvelope): void {
    const held = this.log.all()
    this.log = new EventLog(signingRoom(this.ring), opened.base)
    for (const e of held) this.log.insert(e)
    this.latest = { snap: opened.snap, env }
    this.hlc.receive(opened.snap.cut.at)
    if (this.log.horizonMisses.length) this.startFull()
    this.emit()
  }

  /** Decrypts, validates and verifies inbound events. Anything invalid is dropped silently. Returns the new ones. */
  private async ingest(envs: readonly Envelope[], remember = true): Promise<Envelope[]> {
    const added: Envelope[] = []
    for (const env of envs) {
      if (this.log.has(env.id) && !(this.rebuilt && !this.rebuilt.has(env.id))) continue
      const event = parseSignedEvent(await this.openEnvelope(env))
      // The envelope header must agree with the signed content (no relabelled replays).
      if (!event || event.id !== env.id || event.at !== env.hlc) continue
      const verified = await verifyEvent(this.deps.verifier, signingRoom(this.ring), event)
      if (!verified) continue
      const inserted = this.log.insert(event)
      // An event before the cut that the snapshot does not cover cannot be folded onto it: it is kept, and the full log is rebuilt.
      const missed = !inserted && !this.log.has(event.id)
      const inFull = this.rebuilt?.insert(event) ?? false
      if (inFull) this.armFull()
      if (inserted || missed) {
        this.noticeIfLive(event)
        this.hlc.receive(event.at)
        this.sealed.set(env.id, env)
        added.push(env)
        if (remember) this.remember([env])
      }
    }
    if (this.log.horizonMisses.length && !this.rebuilt) this.startFull()
    return added
  }

  /**
   * A snapshot-based log met an event it cannot fold (before its cut, not covered), or a file needs the history: collect the
   * full log next to it. The board keeps showing the snapshot-based state until the full log holds the genesis (ADR-0037).
   */
  private startFull(): void {
    if (this.rebuilt || !this.log.base) return
    const full = new EventLog<SignedEvent>(signingRoom(this.ring))
    for (const e of [...this.log.all(), ...this.log.horizonMisses]) full.insert(e)
    this.rebuilt = full
    for (const c of this.mesh?.linked ?? []) this.sendHave(c)
    this.armFull()
  }

  /** Swaps in the full log once it holds a genesis and no event arrived for FULL_QUIET_MS. */
  private armFull(): void {
    clearTimeout(this.fullTimer)
    this.fullTimer = setTimeout(() => this.enqueue(async () => {
      const full = this.rebuilt
      if (!full || this.closed || full.ledger.facilitatorKey === null) return
      this.log = full
      this.rebuilt = null
      this.emit()
    }), FULL_QUIET_MS)
  }

  /** Asks the peers for the history a snapshot-based log lacks, and waits (bounded) for it. */
  private async fillLog(): Promise<boolean> {
    this.enqueue(async () => this.startFull())
    for (let i = 0; i < 100 && this.log.base; i++) await new Promise((resolve) => setTimeout(resolve, 200))
    return !this.log.base
  }

  private lastAdvance = -1

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
    else if (c.t === 'agenda.advance') {
      // Automatic hand-over: announced once, only if it really moved the agenda (duplicates from other facilitators are ignored).
      const agenda = board.agenda
      const phase = agenda?.phases[agenda.current]?.kind
      if (agenda && phase && agenda.current === c.from + 1 && this.lastAdvance !== agenda.current) {
        this.lastAdvance = agenda.current
        this.handlers.onNotice({ kind: 'phase.auto', by: null, phase })
      }
    }
    else if (c.t === 'agenda.next') {
      const agenda = board.agenda
      const phase = agenda?.phases[agenda.current]?.kind
      if (phase) this.handlers.onNotice({ kind: 'phase.next', by, phase })
    }
    else if (c.t === 'column.reset') this.handlers.onNotice({ kind: 'reset.column', by, column: c.id ? (board.columns.find((x) => x.id === c.id)?.title) : undefined })
  }

  /** Relay `pub`, in frames of at most 100 envelopes. */
  private push(envs: readonly Envelope[]): void {
    if (this.ws?.readyState !== 1) return
    for (const part of chunks(envs, 100)) {
      for (const e of part) this.relayHas.add(e.id)
      this.ws.send(JSON.stringify({ t: 'pub', envs: part }))
    }
  }

  /** Participants of the room other than me. */
  private get others(): number {
    return this.conns.filter((c) => c !== this.conn).length
  }

  /**
   * Whether the relay must carry my events: there is nobody on the mesh side to rely on (no mesh
   * while others are here) or at least one link I should have is not open. A missing pair is
   * missing for both its ends, so both use the relay; everyone else already gets the event over
   * their direct links. With a complete mesh no board event touches the relay (ADR-0024).
   */
  private get relayNeeded(): boolean {
    if (this.others === 0) return false
    return this.mesh ? this.mesh.missing > 0 : true
  }

  /**
   * New envelopes go to every open link, and to the relay when my links are incomplete.
   * `from`: the peer they came from (not sent back to it).
   */
  private publish(envs: readonly Envelope[], from?: string): void {
    if (!envs.length) return
    if (this.mesh) for (const part of chunks(envs, PEER_ENV_CHUNK)) this.mesh.broadcastReliable(JSON.stringify({ t: 'env', envs: part } satisfies PeerFrame), from)
    if (this.relayNeeded) this.push(envs)
  }

  private async sealedAll(): Promise<Envelope[]> {
    return Promise.all(this.log.all().map(async (e) => {
      const known = this.sealed.get(e.id)
      if (known) return known
      const env = await this.sealEvent(e)
      this.sealed.set(env.id, env)
      return env
    }))
  }

  /**
   * Uploads to the relay what it does not hold: my own events written while I was offline, the
   * board when its memory was lost. `everything`: also what I believe it holds (a holder re-seeds
   * when someone joins; the relay forwards only ids it did not have).
   */
  private scheduleReseed(everything: boolean, jitterMs = RESEED_JITTER_MS): void {
    if (this.reseedTimer && !everything) return
    clearTimeout(this.reseedTimer)
    // On welcome only what I held when the relay answered counts (my own offline events, the board
    // after an eviction): what peers send me afterwards is theirs to upload.
    const mine = everything ? null : new Set(this.log.all().map((e) => e.id))
    this.reseedTimer = setTimeout(() => {
      this.reseedTimer = undefined
      this.enqueue(async () => {
        if (this.closed || this.ws?.readyState !== 1 || this.log.size === 0) return
        const all = await this.sealedAll()
        this.push(mine ? all.filter((e) => mine.has(e.id) && !this.relayHas.has(e.id)) : all)
      })
    }, Math.random() * jitterMs)
  }

  /** The lowest connection id among the participants that hold the board uploads it when someone joins. */
  private get isSeeder(): boolean {
    if (!this.conn || this.log.size === 0) return false
    const holders = [this.conn, ...[...this.presence.values()].filter((p) => p.ready && this.conns.includes(p.conn)).map((p) => p.conn)]
    return seederOf(holders) === this.conn
  }

  private async announce(): Promise<void> {
    if (!this.conn || !this.identity) return
    const p: Presence = {
      t: 'presence', conn: this.conn, name: this.identity.name || null, showName: this.identity.showName, ...(this.identity.hue !== undefined ? { hue: this.identity.hue } : {}), key: this.deps.session.publicKey,
      ...(this.deps.facilitator ? { fkey: this.deps.facilitator.publicKey } : {}), ...(this.log.size > 0 ? { ready: true } : {}),
      ...(this.deps.agreement ? { xkey: this.deps.agreement.publicKey } : {}),
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

  /** Latest own pointer and focus, resent when a direct link opens (frames sent before it are lost). */
  private lastCursor: OwnCursor | null = null
  private lastFocus: OwnFocus | null = null

  sendCursor(cursor: OwnCursor): void {
    this.lastCursor = cursor
    if (this.conn && this.synced) void this.sendPeerLive({ t: 'cursor', conn: this.conn, ...cursor }).catch(() => {})
  }

  sendFocus(focus: OwnFocus): void {
    this.lastFocus = focus
    if (this.conn && this.synced) void this.sendPeerLive({ t: 'focus', conn: this.conn, ...focus }).catch(() => {})
  }

  private async sendSignal(to: string, kind: 'offer' | 'answer', sdp: string): Promise<void> {
    if (!this.conn || this.ws?.readyState !== 1) return
    const env = await this.sealLive({ t: 'sig', from: this.conn, to, kind, sdp })
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ t: 'sig', to, env }))
  }

  private onLive(live: Live): void {
    if (!this.conns.includes(live.conn) || live.conn === this.conn) return
    if (live.t === 'presence') { this.presence.set(live.conn, live); this.emit(); return }
    if (live.t === 'room.moved') { if (live.to === this.conn) this.enqueue(() => this.onMoved(live.ct)); return }
    const name = this.liveName(live.conn)
    if (name === undefined) return
    if (live.t === 'cursor') this.handlers.onCursor?.({ conn: live.conn, anchor: live.anchor, x: live.x, y: live.y, drag: live.drag, ...(live.laser ? { laser: true } : {}) }, name)
    else this.handlers.onFocus?.({ conn: live.conn, column: live.column, note: live.note, typing: live.typing }, name)
  }

  // ----- Mesh -----

  private startMesh(): void {
    this.mesh?.close()
    this.mesh = null
    this.peerSynced.clear()
    this.peerHave.clear()
    this.snapParts.clear()
    this.snapWanted.clear()
    this.snapAsked.clear()
    clearTimeout(this.p2pTimer)
    const canP2p = this.deps.p2p !== false && typeof (this.deps.RTC ?? globalThis.RTCPeerConnection) === 'function'
    if (!canP2p || !this.conn) { this.reportLinks(); return }
    this.mesh = new PeerMesh({
      me: this.conn,
      iceServers: this.deps.iceServers ?? [],
      RTC: this.deps.RTC,
      signal: (to, kind, sdp) => this.enqueue(() => this.sendSignal(to, kind, sdp)),
      onOpen: (c) => this.enqueue(() => this.onPeerOpen(c)),
      onClose: (c) => { this.peerSynced.delete(c); this.peerHave.delete(c); this.snapParts.delete(c); this.snapWanted.delete(c); this.snapAsked.delete(c); this.reportLinks() },
      onReliable: (c, data) => this.onPeerData(c, data),
      onLive: (c, data) => this.onPeerData(c, data),
    })
    this.mesh.update(this.conns)
    this.reportLinks()
    this.armSyncTimer()
  }

  /** What the page shows: direct links when there are some (or nobody to link with), the relay otherwise. */
  private reportLinks(): void {
    const linked = this.mesh?.linked.length ?? 0
    this.handlers.onLinks?.({ p2p: this.mesh !== null && (linked > 0 || this.others === 0), peers: linked, direct: this.mesh ? [...this.mesh.linked] : [] })
  }

  /**
   * Others are here but none synced with me over a direct link: stop waiting for one. What the
   * relay history and my own copy hold is what there is (a creator may then start the board).
   */
  private armSyncTimer(): void {
    clearTimeout(this.p2pTimer)
    this.p2pTimer = setTimeout(() => this.enqueue(async () => {
      if (this.closed || this.synced || !this.histDone) return
      await this.onSynced(true)
    }), P2P_WAIT_MS)
  }

  private async onPeerOpen(conn: string): Promise<void> {
    this.reportLinks()
    if (this.conn) {
      if (this.lastFocus) void this.sendPeerLive({ t: 'focus', conn: this.conn, ...this.lastFocus }).catch(() => {})
      if (this.lastCursor) void this.sendPeerLive({ t: 'cursor', conn: this.conn, ...this.lastCursor }).catch(() => {})
    }
    // Without a board (no genesis yet), ask for a snapshot first: a peer that has one sends it and only the events it does not cover.
    if (!this.known && !this.rebuilt) {
      this.snapAsked.add(conn)
      this.mesh?.sendReliable(conn, JSON.stringify({ t: 'snapreq' } satisfies PeerFrame))
    }
    this.sendHave(conn)
  }

  /** Initial sync: tell the peer what I hold (what a snapshot covers included); it answers with what I lack, then `synced`. */
  private sendHave(conn: string): void {
    const ids = (this.rebuilt ?? this.log).knownIds()
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
        // A peer without a board that asked for a snapshot gets it, then only the events it does not cover.
        const offer = this.snapWanted.delete(conn) ? this.latest : null
        const covered = offer ? new Set(offer.snap.ids) : null
        const missing = (await this.sealedAll()).filter((e) => !have.has(e.id) && !covered?.has(e.id))
        if (offer) for (const frame of this.snapFrames(offer.env)) this.mesh?.sendReliable(conn, frame)
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
        this.emit()
        return
      }
      case 'synced':
        this.peerSynced.add(conn)
        // The snapshot this peer was to send did not come whole: the event log it sent instead is all there is.
        if (this.snapParts.delete(conn) && this.snapAsked.delete(conn)) this.sendHave(conn)
        await this.maybeSynced()
        return
      case 'snapreq':
        this.snapWanted.add(conn)
        return
      case 'snap':
        await this.onSnapChunk(conn, frame)
        return
      case 'eph': {
        if (!this.seenLive.add(frame.env.id)) return
        const live = parseLive(await this.openEnvelope(frame.env))
        if (!live || live.t === 'presence' || live.t === 'room.moved') return
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

  private snapFrames(env: SnapshotEnvelope): string[] {
    const n = Math.max(1, Math.ceil(env.ct.length / SNAP_CHUNK_CHARS))
    return Array.from({ length: n }, (_, i) => JSON.stringify({ t: 'snap', sid: env.id, hlc: env.hlc, i, n, part: env.ct.slice(i * SNAP_CHUNK_CHARS, (i + 1) * SNAP_CHUNK_CHARS) } satisfies PeerFrame))
  }

  /** The link did not deliver a usable snapshot: ask it again for the event log (a `have` without `snapreq`). */
  private snapRefused(conn: string): void {
    this.snapParts.delete(conn)
    if (this.snapAsked.delete(conn)) this.sendHave(conn)
  }

  private async onSnapChunk(conn: string, frame: Extract<PeerFrame, { t: 'snap' }>): Promise<void> {
    let buf = this.snapParts.get(conn)
    if (frame.i === 0) buf = { sid: frame.sid, hlc: frame.hlc, n: frame.n, parts: [], chars: 0 }
    if (!buf || buf.sid !== frame.sid || buf.n !== frame.n || frame.i !== buf.parts.length) { this.snapRefused(conn); return }
    buf.parts.push(frame.part)
    buf.chars += frame.part.length
    if (buf.chars > MAX_SNAPSHOT_CT_CHARS) { this.snapRefused(conn); return }
    this.snapParts.set(conn, buf)
    if (buf.parts.length < buf.n) return
    this.snapParts.delete(conn)
    await this.onSnapshot(conn, { v: PROTOCOL_VERSION, room: this.ring.roomId, id: buf.sid, hlc: buf.hlc, ct: buf.parts.join('') })
  }

  /**
   * A whole snapshot from a link. Verified first (ADR-0037); a joiner with an empty log that asked for it starts from it, anyone
   * keeps the newest one to serve later joiners. Anything that fails verification is dropped and, for a joiner, the same
   * peer is asked for the event log.
   */
  private async onSnapshot(conn: string, env: SnapshotEnvelope): Promise<void> {
    const asked = this.snapAsked.delete(conn)
    const opened = await this.openSnapshot(env)
    // Whoever already knows the board knows its facilitator key: a snapshot rooted in another genesis is never kept nor passed on.
    const root = this.log.ledger.facilitatorKey
    if (!opened || (root !== null && opened.snap.author !== root)) { if (asked) this.sendHave(conn); return }
    if (asked && !this.known && !this.rebuilt) {
      this.received += 1
      this.persistSnapshot(env)
      this.adopt(opened, env)
    }
    if (!this.latest || (opened.snap.cut.at > this.latest.snap.cut.at && opened.snap.ids.length > this.latest.snap.ids.length)) this.latest = { snap: opened.snap, env }
    // Partial mesh: pass a snapshot on once, like events.
    if (this.mesh && !isFullMesh(this.conns.length) && this.seenSnap.add(env.id)) {
      for (const frame of this.snapFrames(env)) this.mesh.broadcastReliable(frame, conn)
    }
  }

  /** The adopted snapshot is stored with the replica (ciphertext, like every record), so a reload opens from it. */
  private persistSnapshot(env: SnapshotEnvelope): void {
    const replica = this.deps.replica
    if (!replica || this.forgotten) return
    const records = [{ id: `${SNAPSHOT_RECORD}${env.id}`, data: JSON.stringify(env) }]
    this.replicaWrites = this.replicaWrites.then(async () => {
      try { await replica.append(this.ring.roomId, records) } catch { this.setReplica(true) }
    })
  }

  /** The facilitator capability signs a snapshot once enough events lie beyond the previous one (ADR-0037). */
  private scheduleSnapshot(): void {
    const cfg = this.deps.snapshot ?? { every: SNAPSHOT_EVERY, lagMs: SNAPSHOT_LAG_MS }
    if (this.snapTimer || this.closed || !this.deps.facilitator || this.log.base || this.log.size - this.snapCount < cfg.every) return
    this.snapTimer = setTimeout(() => { this.snapTimer = undefined; this.enqueue(() => this.makeSnapshot(cfg)) }, 2_000)
  }

  private async makeSnapshot(cfg: { every: number; lagMs: number }): Promise<void> {
    const fac = this.deps.facilitator
    if (!fac || this.closed || this.log.base || this.log.ledger.facilitatorKey !== fac.publicKey) return
    const checkpoint = this.log.checkpointBefore(this.now() - cfg.lagMs, this.snapCount, cfg.every)
    if (!checkpoint) {
      // The newest events are too recent to cut at: look again once they are old enough.
      if (this.log.lastAt > this.now() - cfg.lagMs && !this.snapTimer) this.snapTimer = setTimeout(() => { this.snapTimer = undefined; this.enqueue(() => this.makeSnapshot(cfg)) }, cfg.lagMs + 1_000)
      return
    }
    const genesis = this.log.all().find((e) => e.body.t === 'genesis' && e.author === fac.publicKey)
    if (!genesis) return
    const snap = await signSnapshot(fac, signingRoom(this.ring), ulid(), checkpoint, genesis)
    const head = { v: PROTOCOL_VERSION, room: this.ring.roomId, id: snap.id, hlc: this.now() } as const
    const ct = toBase64Url(await seal(this.deps.contentKey, utf8(JSON.stringify(snap)), utf8(envelopeAad(head))))
    if (ct.length > MAX_SNAPSHOT_CT_CHARS || this.closed) return
    const env: SnapshotEnvelope = { ...head, ct }
    this.snapCount = checkpoint.ids.length
    this.latest = { snap, env }
    this.seenSnap.add(env.id)
    for (const frame of this.snapFrames(env)) this.mesh?.broadcastReliable(frame)
  }

  /** Label of a peer, unless the facilitator hid them. undefined: do not show this peer at all. */
  private liveName(conn: string): string | null | undefined {
    const p = this.presence.get(conn)
    if (p?.key && this.log.ledger.hidden.includes(p.key)) return undefined
    if (p?.key && this.log.ledger.names[p.key]) return this.log.ledger.names[p.key]
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
        this.relayHas.clear()
        this.startMesh()
        await this.announce()
        return
      case 'peers': {
        const known = new Set(this.conns)
        this.conns = frame.peers
        for (const c of [...this.presence.keys()]) if (!frame.peers.includes(c)) this.presence.delete(c)
        for (const c of known) if (!frame.peers.includes(c)) this.handlers.onPeerLeft?.(c)
        this.mesh?.update(this.conns)
        const joined = frame.peers.some((c) => !known.has(c) && c !== this.conn)
        if (joined) await this.announce()
        this.reportLinks()
        // Someone joined: one holder uploads the board, in case the relay lost its memory.
        if (joined && this.synced && this.isSeeder) this.scheduleReseed(true, 200)
        this.emit()
        return
      }
      case 'hist':
        this.received += frame.envs.length
        for (const e of frame.envs) this.relayHas.add(e.id)
        await this.ingest(frame.envs)
        if (frame.done) {
          this.histDone = true
          // Upload what the relay history lacked: my events written offline, or a board it forgot.
          this.scheduleReseed(false)
          await this.maybeSynced()
          if (!this.synced) this.armSyncTimer()
        }
        return
      case 'env': {
        // Events that reached me through the relay (a participant whose links are incomplete).
        this.received += frame.envs.length
        for (const e of frame.envs) this.relayHas.add(e.id)
        const added = await this.ingest(frame.envs)
        if (added.length) {
          // Large boards (partial mesh): pass them on to the direct links as well.
          if (this.mesh && !isFullMesh(this.conns.length)) {
            for (const part of chunks(added, PEER_ENV_CHUNK)) this.mesh.broadcastReliable(JSON.stringify({ t: 'env', envs: part } satisfies PeerFrame))
          }
          if (!this.synced && this.histDone) await this.maybeSynced()
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
        // Older relays: the buffer is gone, upload the board.
        this.scheduleReseed(true)
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
    this.setStatus('closed')
    this.handlers.onAccessDenied?.()
  }

  /**
   * The board is ready once the relay answered and, when it holds nothing I know, once a peer
   * synced with me over a direct link or the wait ran out. A board I already hold (my copy or
   * the relay history) opens at once: peers catch me up in the background.
   */
  private async maybeSynced(): Promise<void> {
    if (this.synced || !this.histDone) return
    const alone = this.others === 0
    if (!this.known && !alone && this.peerSynced.size === 0) return
    await this.onSynced(alone || this.peerSynced.size > 0)
  }

  private async onSynced(mayCreate: boolean): Promise<void> {
    if (this.synced) return
    // The board exists but not one event opened: wrong passcode (or a corrupted link).
    // Stop here: publishing anything, a genesis above all, would fork the board.
    if ((this.received > 0 || (this.liveFailed > 0 && this.liveOpened === 0)) && this.log.size === 0) {
      this.deny()
      return
    }
    this.synced = true
    clearTimeout(this.p2pTimer)
    // Only the tab that created the board (or a facilitator who chose to start a new one) writes a genesis.
    const create = mayCreate && !this.known && !!this.deps.facilitator && (this.deps.creator === true || this.startRequested)
    if (create) await this.publishLocal({ t: 'genesis', roomId: signingRoom(this.ring), facilitatorKey: this.deps.facilitator!.publicKey })
    await this.announce() // "ready" for the seeder rule
    this.setStatus(this.known ? 'open' : 'waiting')
    this.emit()
  }

  startBoard(): void {
    this.startRequested = true
    this.enqueue(async () => {
      if (this.synced && !this.known && !this.closed) {
        this.synced = false
        await this.onSynced(true)
      }
    })
  }

  private sessionDelegated = false
  /**
   * Content (notes, votes) is signed by the session key, so phase rules apply to it even when this tab
   * holds the facilitator link (#270, #276). The link makes the session key a co-facilitator once, unless
   * a one-facilitator board is led by somebody else (the takeover question decides there).
   */
  private delegateSessionToLink(): void {
    const fac = this.deps.facilitator
    const ledger = this.log.ledger
    if (this.sessionDelegated || !fac || this.closed || ledger.facilitatorKey === null) return
    if (roleOf(ledger, this.deps.session.publicKey) !== 'participant') { this.sessionDelegated = true; return }
    if (!ledger.board.settings.initialized) return
    if (!ledger.board.settings.openFacilitation && ledger.lead !== fac.publicKey) return
    this.sessionDelegated = true
    this.enqueue(() => this.publishLocal({ t: 'role.delegate', key: this.deps.session.publicKey }))
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
    // A facilitator-set name wins over the participant's own (and shows even for an anonymous one in the list).
    const named = (key: string | undefined, own: string | null): { name: string | null; renamed?: boolean } => {
      const set = key ? ledger.names[key] : undefined
      return set ? { name: set, renamed: true } : { name: own }
    }
    const mine = this.deps.session.publicKey
    const myOwn = this.identity?.showName ? this.identity.name || null : null
    const list: Peer[] = this.conns.map((c) => {
      if (c === this.conn) return { ...named(mine, myOwn), me: true, key: mine, role: this.myRole(), conn: c, ...(this.identity?.hue !== undefined ? { hue: this.identity.hue } : {}) }
      const p = this.presence.get(c)
      return { ...named(p?.key, p?.showName ? p.name : null), me: false, conn: c, ...(p?.hue !== undefined ? { hue: p.hue } : {}), ...describe(p?.key, p?.fkey) }
    })
    if (!list.some((p) => p.me)) list.unshift({ ...named(mine, myOwn), me: true, key: mine, role: this.myRole() })
    return list.sort((x, y) => Number(y.me) - Number(x.me) || (x.name ?? '').localeCompare(y.name ?? ''))
  }

  /** Before the relay answers, the board can already show what the local replica holds. */
  private emit(): void {
    // A room nobody holds shows nothing: there is no board until a genesis exists.
    if (!this.known) return
    if (this.lastStatus === 'waiting') this.setStatus('open')
    const ledger = this.log.ledger
    // Closed for good, or removed by the facilitator: the encrypted copy goes from this device.
    if (ledger.board.settings.destroyed || ledger.removed.includes(this.deps.session.publicKey)) this.forgetReplica()
    this.delegateSessionToLink()
    this.scheduleSnapshot()
    const role = this.myRole()
    const lead = ledger.lead === this.deps.session.publicKey || (!!this.deps.facilitator && (ledger.lead === this.deps.facilitator.publicKey || ledger.facilitatorKey === this.deps.facilitator.publicKey))
    const access = { role, canSteer: role !== 'participant' || canSteer(ledger, this.deps.session.publicKey), bypassesPhase: role !== 'participant', canManageRoles: lead, isLead: ledger.lead === this.deps.session.publicKey, removed: ledger.removed.includes(this.deps.session.publicKey) }
    this.handlers.onSnapshot({ ...buildSnapshot(ledger.board, { cid: this.actorKey }, this.peers(), this.now(), { ...ledger.selfNames, ...ledger.names }), access })
  }

  private open(): void {
    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
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
      this.histDone = false
      this.relayHas.clear()
      clearTimeout(this.reseedTimer)
      this.reportLinks()
      this.setStatus('reconnecting')
      // Full room: no point hammering it, a seat frees up when someone leaves.
      this.reconnectTimer = setTimeout(() => { this.attempts++; this.open() }, this.full ? FULL_RETRY_MS : backoffDelay(this.attempts))
    }
    ws.onerror = () => { /* onclose follows */ }
  }
}
