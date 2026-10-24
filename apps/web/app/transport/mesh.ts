import { isInitiator, meshLinks } from '@retroboard/sync'

/**
 * WebRTC mesh between the participants of a board (change p2p-presence-and-cursors).
 *
 * Each link has two data channels: `rb` (reliable, ordered) for the sync and board events, and
 * `live` (unordered, no retransmit) for cursors and focus. The relay only carries the encrypted
 * offer and answer (non-trickle ICE: one message each way), never the data.
 */
export interface MeshOptions {
  me: string
  iceServers: RTCIceServer[]
  /** Sends an offer or answer to one participant (through the relay, encrypted by the caller). */
  signal(to: string, kind: 'offer' | 'answer', sdp: string): void
  onOpen(conn: string): void
  onClose(conn: string): void
  onReliable(conn: string, data: string): void
  onLive(conn: string, data: string): void
  RTC?: typeof RTCPeerConnection
}

interface Link {
  pc: RTCPeerConnection
  rb: RTCDataChannel | null
  live: RTCDataChannel | null
  open: boolean
  timer: ReturnType<typeof setTimeout> | undefined
  attempts: number
}

/** A link that has not opened by then is torn down and retried (twice at most). */
export const LINK_TIMEOUT_MS = 10_000
const MAX_ATTEMPTS = 3
/** Non-trickle ICE: wait for gathering, but never longer than this (an unreachable STUN server). */
const ICE_WAIT_MS = 1_500

function waitIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); pc.removeEventListener('icegatheringstatechange', check); resolve() }
    const check = () => { if (pc.iceGatheringState === 'complete') done() }
    const t = setTimeout(done, ICE_WAIT_MS)
    pc.addEventListener('icegatheringstatechange', check)
  })
}

export class PeerMesh {
  private readonly links = new Map<string, Link>()
  private wanted = new Set<string>()
  private closed = false
  private readonly RTC: typeof RTCPeerConnection

  constructor(private readonly o: MeshOptions) {
    this.RTC = o.RTC ?? RTCPeerConnection
  }

  /** Participants with an open link. */
  get linked(): string[] {
    return [...this.links].filter(([, l]) => l.open).map(([c]) => c)
  }

  /** Recomputes the links from the room's participants; opens the missing ones, closes the extra ones. */
  update(conns: readonly string[]): void {
    if (this.closed) return
    this.wanted = new Set(meshLinks(this.o.me, conns))
    for (const c of [...this.links.keys()]) if (!this.wanted.has(c)) this.drop(c)
    for (const c of this.wanted) if (!this.links.has(c) && isInitiator(this.o.me, c)) void this.call(c, 0)
  }

  async onSignal(from: string, kind: 'offer' | 'answer', sdp: string): Promise<void> {
    if (this.closed) return
    try {
      if (kind === 'offer') {
        // A new offer replaces a stale link (the other side retried).
        if (this.links.has(from)) this.drop(from)
        const link = this.create(from, false, 0)
        await link.pc.setRemoteDescription({ type: 'offer', sdp })
        await link.pc.setLocalDescription(await link.pc.createAnswer())
        await waitIce(link.pc)
        if (this.links.get(from) === link && link.pc.localDescription) this.o.signal(from, 'answer', link.pc.localDescription.sdp)
      } else {
        const link = this.links.get(from)
        if (link && link.pc.signalingState === 'have-local-offer') await link.pc.setRemoteDescription({ type: 'answer', sdp })
      }
    } catch {
      this.fail(from)
    }
  }

  sendReliable(conn: string, text: string): boolean {
    const ch = this.links.get(conn)?.rb
    if (ch?.readyState !== 'open') return false
    try { ch.send(text); return true } catch { return false }
  }

  broadcastReliable(text: string, except?: string): number {
    let n = 0
    for (const c of this.linked) if (c !== except && this.sendReliable(c, text)) n++
    return n
  }

  /** Cursors and focus: best effort, a lost frame is replaced by the next one. */
  broadcastLive(text: string, except?: string): void {
    for (const [c, l] of this.links) {
      if (c === except || l.live?.readyState !== 'open') continue
      // Do not queue behind a congested link: drop instead.
      if (l.live.bufferedAmount > 64 * 1024) continue
      try { l.live.send(text) } catch { /* closing */ }
    }
  }

  close(): void {
    this.closed = true
    for (const c of [...this.links.keys()]) this.drop(c)
  }

  private async call(to: string, attempts: number): Promise<void> {
    const link = this.create(to, true, attempts)
    try {
      await link.pc.setLocalDescription(await link.pc.createOffer())
      await waitIce(link.pc)
      if (this.links.get(to) === link && link.pc.localDescription) this.o.signal(to, 'offer', link.pc.localDescription.sdp)
    } catch {
      this.fail(to)
    }
  }

  private create(conn: string, initiator: boolean, attempts: number): Link {
    const pc = new this.RTC({ iceServers: this.o.iceServers })
    const link: Link = { pc, rb: null, live: null, open: false, timer: undefined, attempts }
    this.links.set(conn, link)
    const bind = (ch: RTCDataChannel) => {
      if (ch.label === 'rb') link.rb = ch
      else if (ch.label === 'live') link.live = ch
      else return
      ch.onopen = () => this.maybeOpen(conn, link)
      ch.onclose = () => { if (this.links.get(conn) === link) this.fail(conn) }
      ch.onmessage = (e: MessageEvent) => {
        if (typeof e.data !== 'string') return
        if (ch.label === 'rb') this.o.onReliable(conn, e.data)
        else this.o.onLive(conn, e.data)
      }
    }
    if (initiator) {
      bind(pc.createDataChannel('rb', { ordered: true }))
      bind(pc.createDataChannel('live', { ordered: false, maxRetransmits: 0 }))
    } else {
      pc.ondatachannel = (e) => bind(e.channel)
    }
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' && this.links.get(conn) === link) this.fail(conn) }
    link.timer = setTimeout(() => { if (!link.open && this.links.get(conn) === link) this.fail(conn) }, LINK_TIMEOUT_MS)
    return link
  }

  private maybeOpen(conn: string, link: Link): void {
    if (link.open || link.rb?.readyState !== 'open' || link.live?.readyState !== 'open') return
    link.open = true
    clearTimeout(link.timer)
    link.attempts = 0
    this.o.onOpen(conn)
  }

  /** A link failed: tear it down, and the initiator retries a couple of times. */
  private fail(conn: string): void {
    const link = this.links.get(conn)
    const attempts = (link?.attempts ?? 0) + 1
    this.drop(conn)
    if (this.closed || !this.wanted.has(conn) || !isInitiator(this.o.me, conn) || attempts >= MAX_ATTEMPTS) return
    setTimeout(() => { if (!this.closed && this.wanted.has(conn) && !this.links.has(conn)) void this.call(conn, attempts) }, 1_000 * attempts)
  }

  private drop(conn: string): void {
    const link = this.links.get(conn)
    if (!link) return
    this.links.delete(conn)
    clearTimeout(link.timer)
    try { link.rb?.close(); link.live?.close(); link.pc.close() } catch { /* already closed */ }
    if (link.open) this.o.onClose(conn)
  }
}
