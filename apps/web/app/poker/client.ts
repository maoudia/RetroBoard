/**
 * The relay client of the Scrum Poker room (change scrum-poker, ADR-0042). It speaks the real protocol: envelopes of five fields sealed
 * with the room's content key, signed events, `pub` frames through the relay, the history on connect. The room is the shared ledger
 * folded by the replica log (kind `poker`), the cards are opened with the estimation read model and the statistics are the application's.
 * It does not use the mesh: the room goes through the relay only until task 2.1 moves it onto the shared transport.
 */
import { EventLog, openRound, type OpenedRound, roundStatistics, type SignedEvent, type SignerPort, signEvent, type Statistics, verifyEvent } from '@retroboard/application'
import { deriveContentKey, deriveFacilitatorSeed, fromBase64Url, fromUtf8, open, openCard, randomBytes, roundKeyPair, seal, sealCard, sign, signingKeyPair, toBase64Url, utf8 } from '@retroboard/crypto'
import { currentRound, type EventBody, type KeyRing, type Ledger, type PokerCommand, type Round, signingRoom } from '@retroboard/domain'
import { type Envelope, envelopeAad, parseEnvelope, parseEventOrUnknown, parseRelayFrame, PROTOCOL_VERSION } from '@retroboard/protocol'
import { HybridClock } from '@retroboard/sync'
import { ed25519Verifier } from '~/adapters/signing'
import { ulid } from '~/transport/ulid'

export type PokerStatus = 'connecting' | 'live' | 'offline' | 'full' | 'board'
export interface SeatView {
  readonly key: string; readonly name: string; readonly me: boolean; readonly moderator: boolean
  /** A seat that does not vote watches (the room has more voters than its cap). */
  readonly voter: boolean
  readonly voted: boolean
  /** The card, once the round is revealed and the ballot opens; never before. */
  readonly card: string | null
}
export interface RoundView { readonly n: number; readonly revealed: boolean; readonly revote: boolean; readonly voted: number; readonly voters: number; readonly deck: readonly string[] }
export interface PokerView {
  readonly status: PokerStatus
  readonly moderator: boolean
  /** The device that may reveal this round: it holds the round key. */
  readonly canReveal: boolean
  readonly seats: readonly SeatView[]
  readonly round: RoundView | null
  /** Deck index of my own card in this round. */
  readonly mine: number | null
  /** Whether my seat votes (a late seat of a full room watches). */
  readonly voter: boolean
  /** Statistics of the revealed round; null before the reveal. */
  readonly stats: Statistics | null
  /** Voters whose card did not open (a wrong key): a new round repairs it. */
  readonly unreadable: number
}

export interface PokerClientOptions {
  readonly ring: KeyRing
  readonly name: string
  /** Cards of the room, chosen on the start page: written by the moderator before the first round. */
  readonly deck?: readonly string[]
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

export class PokerClient {
  private ws: WebSocket | null = null
  private status: PokerStatus = 'connecting'
  private log: EventLog<SignedEvent>
  private readonly room: string
  private readonly clock = new HybridClock()
  private contentKey = new Uint8Array()
  private signer: SignerPort | null = null
  private secret: Uint8Array | null = null
  private me = ''
  private closed = false
  private histDone = false
  private opened = new Map<string, { key: string; cards: OpenedRound }>()
  private mine: { round: string; index: number } | null = null
  private readonly held = new Map<string, Envelope>()
  private readonly fromRelay = new Set<string>()
  private readonly sent = new Set<'genesis' | 'settings' | 'seat' | 'round'>()
  private queue: Promise<void> = Promise.resolve()
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private retry: ReturnType<typeof setTimeout> | undefined

  constructor(private readonly o: PokerClientOptions) {
    this.room = signingRoom(o.ring)
    this.log = new EventLog<SignedEvent>(this.room)
  }

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

  private get ledger(): Ledger { return this.log.ledger }
  private get round(): Round | undefined { return this.ledger.poker ? currentRound(this.ledger.poker) : undefined }
  private get seat() { return this.ledger.poker?.seats.find((s) => s.key === this.me) }

  /** Picks (or changes) my card before the reveal. */
  vote(index: number): void {
    const round = this.round
    if (!round || round.revealKey !== null || !this.seat?.voter || !Number.isInteger(index) || index < 0 || index >= round.deck.length) return
    this.mine = { round: round.id, index }
    try { this.o.store?.setItem(`retroboard:poker:card:${this.o.ring.roomId}`, JSON.stringify(this.mine)) } catch { /* kept in memory only */ }
    this.emit()
    this.enqueue(async () => this.send_({ t: 'vote.seal', round: round.id, sealed: await sealCard(round.pub, this.o.ring.roomId, this.me, index) }))
  }

  /** The device that opened the round shows every card at once, by publishing the private half of the round key. */
  reveal(): void {
    const round = this.round
    if (!round || round.revealKey !== null || !this.secret || round.opener !== this.me) return
    this.enqueue(async () => this.send_({ t: 'round.reveal', round: round.id, key: toBase64Url((await roundKeyPair(this.secret!, this.o.ring.roomId, round.id)).privateKey) }))
  }

  /** Moderator: a new round with its own key; `revote` votes again on the same item. */
  nextRound(revote = false): void {
    if (!this.secret || this.me !== this.ledger.lead) return
    this.enqueue(async () => this.send_(await this.roundStart(`r${(this.ledger.poker?.rounds.length ?? 0) + 1}`, revote)))
  }

  private async roundStart(id: string, revote: boolean): Promise<PokerCommand> {
    const pub = toBase64Url((await roundKeyPair(this.secret!, this.o.ring.roomId, id)).publicKey)
    return revote ? { t: 'round.start', round: id, pub, revote } : { t: 'round.start', round: id, pub }
  }

  private send_(cmd: PokerCommand): Promise<void> { return this.publish({ t: 'poker', cmd }) }

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

  /** What only I can write and the room still lacks: the genesis, the deck and the first round (moderator), my seat. Idempotent: it reads the ledger. */
  private async settle(): Promise<void> {
    const { poker } = this.ledger
    // Each is tried once: an event the fold refuses (a full room) must not be written again for ever.
    if (this.secret && this.ledger.facilitatorKey === null && !this.sent.has('genesis')) {
      this.sent.add('genesis')
      await this.publish({ t: 'genesis', roomId: this.room, facilitatorKey: this.me, kind: 'poker' })
    }
    if (this.ledger.kind !== 'poker' || !poker) return
    if (!this.seat && !this.sent.has('seat')) { this.sent.add('seat'); await this.send_({ t: 'seat.join', name: this.o.name }) }
    if (!this.secret || this.me !== this.ledger.lead || poker.rounds.length > 0) return
    if (this.o.deck && !this.sent.has('settings')) { this.sent.add('settings'); await this.send_({ t: 'settings.update', deck: [...this.o.deck] }) }
    if (!this.sent.has('round')) { this.sent.add('round'); await this.send_(await this.roundStart('r1', false)) }
  }

  private async ingest(env: Envelope): Promise<void> {
    const head = parseEnvelope(env)
    if (!head || head.room !== this.o.ring.roomId || this.held.has(head.id)) return
    const ct = fromBase64Url(head.ct)
    const plain = ct && await open(this.contentKey, ct, utf8(envelopeAad(head)))
    if (!plain) return
    let raw: unknown
    try { raw = JSON.parse(fromUtf8(plain)) } catch { return }
    // The header must agree with the signed content, the body must be one this version reads and the signature must hold, before anything is folded.
    const parsed = parseEventOrUnknown(raw)
    if (parsed?.kind !== 'known' || parsed.event.id !== head.id || parsed.event.at !== head.hlc) return
    if (!(await verifyEvent(ed25519Verifier, this.room, parsed.event as SignedEvent))) return
    this.held.set(head.id, head)
    this.clock.receive(parsed.event.at)
    this.log.insert(parsed.event as SignedEvent)
    await this.openRevealed()
    this.emit()
    if (this.histDone) await this.settle()
  }

  /** Every replica opens the ballots of a revealed round itself, with the key the reveal published. */
  private async openRevealed(): Promise<void> {
    for (const round of this.ledger.poker?.rounds ?? []) {
      if (round.revealKey === null || this.opened.get(round.id)?.key === round.revealKey) continue
      const cards = await openRound(round, (r, voter, sealed) => openCard(r.revealKey!, r.pub, this.o.ring.roomId, voter, sealed))
      this.opened.set(round.id, { key: round.revealKey, cards })
    }
  }

  private async publish(body: EventBody): Promise<void> {
    if (!this.signer) return
    const event = await signEvent(this.signer, this.room, { id: ulid(), at: this.clock.tick(this.log.lastAt), body })
    const head = { v: PROTOCOL_VERSION, room: this.o.ring.roomId, id: event.id, hlc: event.at } as const
    const env: Envelope = { ...head, ct: toBase64Url(await seal(this.contentKey, utf8(JSON.stringify(event)), utf8(envelopeAad(head)))) }
    await this.ingest(env)
    if (this.histDone) this.send({ t: 'pub', envs: [env] })
  }

  private send(frame: unknown): void {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(frame))
  }

  private emit(): void {
    const { poker, kind, lead } = this.ledger
    const round = this.round
    const cards = round ? this.opened.get(round.id)?.cards : undefined
    const seats: SeatView[] = (poker?.seats ?? []).map((s) => {
      const index = cards?.picks[s.key]
      return { key: s.key, name: s.name, me: s.key === this.me, moderator: s.key === lead, voter: s.voter, voted: !!round && s.key in round.ballots, card: index === undefined ? null : (round!.deck[index] ?? null) }
    })
    const voters = seats.filter((s) => s.voter).length
    const revealed = !!round && round.revealKey !== null
    const status: PokerStatus = this.ledger.facilitatorKey !== null && kind !== 'poker' ? 'board'
      : kind === 'poker' && this.sent.has('seat') && !this.seat ? 'full' : this.status
    this.o.onChange({
      status, moderator: !!this.secret && this.me === lead, canReveal: !!round && !revealed && !!this.secret && round.opener === this.me,
      seats, mine: round && this.mine?.round === round.id ? this.mine.index : null, voter: !!this.seat?.voter, unreadable: cards?.unreadable.length ?? 0,
      round: round ? { n: poker!.rounds.length, revealed, revote: round.revote, voted: Object.keys(round.ballots).length, voters, deck: round.deck } : null,
      stats: round && revealed && cards ? roundStatistics(round.deck, Object.values(cards.picks)) : null,
    })
  }
}
