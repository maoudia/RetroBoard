/**
 * The relay client of the Scrum Poker demo (change scrum-poker, ADR-0042). It speaks the real protocol: envelopes of five fields
 * sealed with the room's content key, signed events, `pub` frames through the relay, the history on connect. It does not use the
 * mesh: the demo goes through the relay only. The real transport, with a kind-aware ledger, comes with tasks 1.2 and 2.1.
 */
import { signEvent, type SignerPort, type SignedEvent, verifyEvent } from '@retroboard/application'
import { deriveContentKey, deriveFacilitatorSeed, fromBase64Url, fromUtf8, open, randomBytes, seal, sign, signingKeyPair, toBase64Url, utf8, verify } from '@retroboard/crypto'
import { EVENT_ID_RE, envelopeAad, type Envelope, parseEnvelope, parseRelayFrame, PROTOCOL_VERSION } from '@retroboard/protocol'
import { KEY_RE, type KeyRing } from '@retroboard/domain'
import { ulid } from '~/transport/ulid'
import { openCard, roundKeyPair, sealCard } from './ballot'
import { emptyPoker, foldPoker, type PokerEvent, type PokerState } from './fold'

/** The deck of the demo: Fibonacci with a question mark. A card travels as its index. */
export const DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '?'] as const

export type PokerStatus = 'connecting' | 'live' | 'offline' | 'full'
export interface SeatView { readonly key: string; readonly name: string; readonly me: boolean; readonly moderator: boolean; readonly voted: boolean; readonly card: string | null }
export interface PokerView {
  readonly status: PokerStatus
  readonly moderator: boolean
  readonly seats: readonly SeatView[]
  readonly round: { readonly n: number; readonly revealed: boolean; readonly voted: number } | null
  /** Deck index of my own card in this round. */
  readonly mine: number | null
}

export interface PokerClientOptions {
  readonly ring: KeyRing
  readonly name: string
  /** Base of the socket URL (`ws://host`), without path. */
  readonly socketBase: string
  readonly WS?: typeof WebSocket
  /** Where a voter's key and own card survive a reload of the tab (sessionStorage). Optional. */
  readonly store?: Pick<Storage, 'getItem' | 'setItem'>
  readonly onChange: (view: PokerView) => void
}

const RETRY_MS = 2_000
const PING_MS = 25_000
const PUSH_CHUNK = 100

const verifier = {
  async verify(publicKey: string, signature: string, message: string) {
    const key = fromBase64Url(publicKey); const sig = fromBase64Url(signature)
    return !!key && !!sig && verify(key, sig, utf8(message))
  },
}

const isEvent = (x: unknown): x is SignedEvent => {
  const e = x as Partial<SignedEvent> | null
  return typeof e === 'object' && e !== null && typeof e.id === 'string' && EVENT_ID_RE.test(e.id) && Number.isFinite(e.at) && typeof e.author === 'string' && KEY_RE.test(e.author)
    && typeof e.sig === 'string' && typeof e.body === 'object' && e.body !== null
}

export class PokerClient {
  private ws: WebSocket | null = null
  private status: PokerStatus = 'connecting'
  private state: PokerState = emptyPoker()
  /** Verified events in the total order of the room: by clock, then id, the same on every replica whatever the order they arrive in. */
  private log: { at: number; id: string; event: PokerEvent }[] = []
  private contentKey = new Uint8Array()
  private signer: SignerPort | null = null
  private secret: Uint8Array | null = null
  private me = ''
  private clock = 0
  private closed = false
  private histDone = false
  private cards = new Map<string, Record<string, number | null>>()
  private mine: { round: string; index: number } | null = null
  private readonly held = new Map<string, Envelope>()
  private readonly fromRelay = new Set<string>()
  private readonly sent = new Set<'genesis' | 'seat' | 'round'>()
  private queue: Promise<void> = Promise.resolve()
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private retry: ReturnType<typeof setTimeout> | undefined

  constructor(private readonly o: PokerClientOptions) {}

  async start(): Promise<void> {
    const { ring, store } = this.o
    this.contentKey = await deriveContentKey(fromBase64Url(ring.roomKey)!, ring.roomId)
    // The moderator holds the facilitator link: its key is the genesis key and the round keys come from the same secret on any device.
    // A voter keeps a key of its own for the life of the tab.
    let seed: Uint8Array
    if (ring.facilitatorSecret) {
      this.secret = fromBase64Url(ring.facilitatorSecret)
      seed = await deriveFacilitatorSeed(this.secret!)
    } else {
      const slot = `retroboard:poker:key:${ring.roomId}`
      const kept = (() => { try { return store?.getItem(slot) ?? null } catch { return null } })()
      const found = kept ? fromBase64Url(kept) : null
      seed = found?.length === 32 ? found : randomBytes(32)
      try { store?.setItem(slot, toBase64Url(seed)) } catch { /* private mode: the seat does not survive a reload */ }
    }
    const pair = await signingKeyPair(seed)
    this.me = toBase64Url(pair.publicKey)
    this.signer = { publicKey: this.me, sign: async (message) => toBase64Url(await sign(pair.privateKey, utf8(message))) }
    try { const kept = JSON.parse(store?.getItem(`retroboard:poker:card:${ring.roomId}`) ?? 'null') as { round?: string; index?: number } | null; if (kept && typeof kept.round === 'string' && Number.isInteger(kept.index)) this.mine = { round: kept.round, index: kept.index! } } catch { /* nothing kept */ }
    this.open()
  }

  close(): void {
    this.closed = true
    clearInterval(this.heartbeat); clearTimeout(this.retry)
    this.ws?.close()
  }

  /** Picks (or changes) my card before the reveal. */
  vote(index: number): void {
    const round = this.current
    if (!round || round.revealKey || !this.state.seats.has(this.me)) return
    this.mine = { round: round.id, index }
    try { this.o.store?.setItem(`retroboard:poker:card:${this.o.ring.roomId}`, JSON.stringify(this.mine)) } catch { /* kept in memory only */ }
    this.emit()
    this.enqueue(async () => this.publish({ t: 'poker', cmd: { t: 'vote.seal', round: round.id, sealed: await sealCard(round.pub, this.o.ring.roomId, this.me, index) } }))
  }

  /** Moderator: shows every card at once, by publishing the private half of the round key. */
  reveal(): void {
    const round = this.current
    if (!round || round.revealKey || !this.secret || this.me !== this.state.moderator) return
    this.enqueue(async () => this.publish({ t: 'poker', cmd: { t: 'round.reveal', round: round.id, key: toBase64Url((await roundKeyPair(this.secret!, this.o.ring.roomId, round.id)).privateKey) } }))
  }

  /** Moderator: a new round with its own key (the first round, or a re-vote). */
  nextRound(): void {
    if (!this.secret || this.me !== this.state.moderator) return
    this.enqueue(async () => this.publish(await this.roundStart(`r${this.state.rounds.length + 1}`)))
  }

  private async roundStart(id: string) {
    return { t: 'poker', cmd: { t: 'round.start', round: id, pub: toBase64Url((await roundKeyPair(this.secret!, this.o.ring.roomId, id)).publicKey) } }
  }

  private get current() { return this.state.rounds[this.state.rounds.length - 1] }

  private enqueue(job: () => Promise<void>): void {
    this.queue = this.queue.then(job).catch(() => { /* a failed job must not block the next ones */ })
  }

  private setStatus(status: PokerStatus): void {
    if (this.status === status) return
    this.status = status
    this.emit()
  }

  private open(): void {
    if (this.closed) return
    const WS = this.o.WS ?? WebSocket
    const ws = new WS(`${this.o.socketBase.replace(/\/$/, '')}/ws2?room=${encodeURIComponent(this.o.ring.roomId)}`)
    this.ws = ws
    this.histDone = false
    this.setStatus('connecting')
    ws.onmessage = (m) => { this.enqueue(() => this.onFrame(String(m.data))) }
    ws.onclose = () => {
      clearInterval(this.heartbeat)
      if (this.ws !== ws || this.closed) return
      if (this.status !== 'full') this.setStatus('offline')
      this.retry = setTimeout(() => this.open(), RETRY_MS)
    }
  }

  private async onFrame(text: string): Promise<void> {
    let raw: unknown
    try { raw = JSON.parse(text) } catch { return }
    const frame = parseRelayFrame(raw)
    if (!frame) return
    if (frame.t === 'err' && frame.code === 'full') { this.setStatus('full'); return }
    if (frame.t === 'welcome') {
      clearInterval(this.heartbeat)
      this.heartbeat = setInterval(() => { if (this.ws?.readyState === 1) this.ws.send('ping') }, PING_MS)
      return
    }
    if (frame.t === 'hist' || frame.t === 'env') {
      for (const env of frame.envs) { if (frame.t === 'hist') this.fromRelay.add(env.id); await this.ingest(env) }
      if (frame.t === 'hist' && frame.done) await this.onHistory()
    }
  }

  /** The room is read: write what only I can write, then give the relay what it lacks. */
  private async onHistory(): Promise<void> {
    this.histDone = true
    await this.settle()
    // After a relay restart the history is empty: whoever holds the room uploads it (the relay keeps only ids it did not have).
    const lacking = [...this.held.values()].filter((e) => !this.fromRelay.has(e.id))
    for (let i = 0; i < lacking.length; i += PUSH_CHUNK) this.send({ t: 'pub', envs: lacking.slice(i, i + PUSH_CHUNK) })
    this.setStatus('live')
  }

  /** What only I can write and the room still lacks: the genesis (moderator), my seat, the first round (moderator). Idempotent: it reads the state. */
  private async settle(): Promise<void> {
    // Each is tried once: an event the fold refuses (a full room) must not be written again for ever.
    if (this.secret && this.state.kind === null && !this.sent.has('genesis')) { this.sent.add('genesis'); await this.publish({ t: 'genesis', roomId: this.o.ring.roomId, facilitatorKey: this.me, kind: 'poker' }) }
    if (this.state.kind !== 'poker') return
    if (!this.state.seats.has(this.me) && !this.sent.has('seat')) { this.sent.add('seat'); await this.publish({ t: 'poker', cmd: { t: 'seat.join', name: this.o.name } }) }
    if (this.secret && this.me === this.state.moderator && this.state.rounds.length === 0 && !this.sent.has('round')) { this.sent.add('round'); await this.publish(await this.roundStart('r1')) }
  }

  private async ingest(env: Envelope): Promise<void> {
    const head = parseEnvelope(env)
    if (!head || head.room !== this.o.ring.roomId || this.held.has(head.id)) return
    const ct = fromBase64Url(head.ct)
    const plain = ct && await open(this.contentKey, ct, utf8(envelopeAad(head)))
    if (!plain) return
    let event: unknown
    try { event = JSON.parse(fromUtf8(plain)) } catch { return }
    // The header must agree with the signed content, and the signature must hold, before anything is folded.
    if (!isEvent(event) || event.id !== head.id || event.at !== head.hlc || !(await verifyEvent(verifier, this.o.ring.roomId, event))) return
    this.held.set(head.id, head)
    this.clock = Math.max(this.clock, event.at)
    this.insert({ at: event.at, id: event.id, event: { author: event.author, body: event.body } })
    await this.openRevealed()
    this.emit()
    if (this.histDone) await this.settle()
  }

  /** An event that sorts last is folded onto the state; one that sorts earlier (it arrived late) makes the room fold again from the start. */
  private insert(entry: { at: number; id: string; event: PokerEvent }): void {
    const last = this.log[this.log.length - 1]
    const after = !last || entry.at > last.at || (entry.at === last.at && entry.id > last.id)
    if (after) { this.log.push(entry); this.state = foldPoker(this.state, entry.event); return }
    this.log = [...this.log, entry].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1))
    this.state = this.log.reduce((s, e) => foldPoker(s, e.event), emptyPoker())
  }

  /** Every replica opens the ballots of a revealed round itself, with the key the reveal published. */
  private async openRevealed(): Promise<void> {
    for (const round of this.state.rounds) {
      if (!round.revealKey || this.cards.has(round.id)) continue
      const opened: Record<string, number | null> = {}
      for (const [voter, sealed] of round.ballots) opened[voter] = await openCard(round.revealKey, round.pub, this.o.ring.roomId, voter, sealed)
      this.cards.set(round.id, opened)
    }
  }

  private async publish(body: Record<string, unknown>): Promise<void> {
    if (!this.signer) return
    this.clock = Math.max(this.clock + 1, Date.now())
    const event = await signEvent(this.signer, this.o.ring.roomId, { id: ulid(), at: this.clock, body: body as never })
    const head = { v: PROTOCOL_VERSION, room: this.o.ring.roomId, id: event.id, hlc: event.at } as const
    const env: Envelope = { ...head, ct: toBase64Url(await seal(this.contentKey, utf8(JSON.stringify(event)), utf8(envelopeAad(head)))) }
    await this.ingest(env)
    if (this.histDone) this.send({ t: 'pub', envs: [env] })
  }

  private send(frame: unknown): void {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(frame))
  }

  private emit(): void {
    const round = this.current
    const opened = round ? this.cards.get(round.id) : undefined
    const seats = [...this.state.seats].map(([key, name]) => ({
      key, name, me: key === this.me, moderator: key === this.state.moderator, voted: !!round?.ballots.has(key),
      card: opened && opened[key] != null ? (DECK[opened[key]!] ?? '?') : null,
    }))
    this.o.onChange({
      status: this.state.kind === 'poker' && this.sent.has('seat') && !this.state.seats.has(this.me) ? 'full' : this.status, moderator: !!this.secret && this.me === this.state.moderator, seats,
      round: round ? { n: this.state.rounds.length, revealed: !!round.revealKey, voted: round.ballots.size } : null,
      mine: round && this.mine?.round === round.id ? this.mine.index : null,
    })
  }
}
