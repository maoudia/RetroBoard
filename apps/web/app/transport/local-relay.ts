import { type Envelope, EnvelopeBuffer, type RelayFrame, parseRelayFrame } from '@retroboard/protocol'

/**
 * In-memory relay for solo boards (change solo-parity-and-dedup): a stand-in for the WebSocket of the real relay,
 * so a solo board runs the very same signed ledger engine as a shared one and nothing leaves the tab.
 * One client, no fan-out: it greets the client, replays what it has pushed and drops live frames.
 */
const OPEN = 1
const CLOSED = 3

export class LocalRelaySocket {
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  private static readonly buffers = new Map<string, EnvelopeBuffer>()
  private readonly buffer: EnvelopeBuffer

  constructor(url: string) {
    const room = new URL(url, 'http://local').searchParams.get('room') ?? ''
    // Kept per room for the life of the tab, so a reconnect (or a reload of the page state) replays the board.
    const known = LocalRelaySocket.buffers.get(room) ?? new EnvelopeBuffer()
    LocalRelaySocket.buffers.set(room, known)
    this.buffer = known
    queueMicrotask(() => {
      if (this.readyState === CLOSED) return
      this.readyState = OPEN
      this.onopen?.()
      const conn = 'solo'
      this.emit({ t: 'welcome', conn, peers: [conn] })
      for (const frame of this.buffer.history()) this.emit(frame)
    })
  }

  send(data: string): void {
    if (this.readyState !== OPEN) return
    if (data === 'ping') { this.onmessage?.({ data: 'pong' } as MessageEvent); return }
    let raw: unknown
    try { raw = JSON.parse(data) } catch { return }
    const frame = raw as { t?: string, envs?: Envelope[] }
    if (frame.t === 'pub' && Array.isArray(frame.envs)) this.buffer.add(frame.envs)
    // eph and sig frames have nobody to reach.
  }

  close(): void {
    if (this.readyState === CLOSED) return
    this.readyState = CLOSED
    this.onclose?.()
  }

  private emit(frame: RelayFrame): void {
    // Round trip through the schema: the transport sees exactly what the real relay would send.
    const ok = parseRelayFrame(JSON.parse(JSON.stringify(frame)))
    if (ok) this.onmessage?.({ data: JSON.stringify(ok) } as MessageEvent)
  }
}
