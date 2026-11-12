import { LIMITS } from '@retroboard/domain'
import { type Budgets, CLOSE_TOO_LARGE, checkFrame, EnvelopeBuffer, type RelayFrame } from '@retroboard/protocol'
import { consoleLogger, type Logger } from './logger'

/** Per-connection state an adapter keeps with its socket (Cloudflare: the hibernation attachment, max 2 KB). No board data here. */
export interface Attachment extends Budgets { rh: string; room: string; conn: string }

/**
 * What the room core needs from a runtime. The per-connection state lives behind `attachment` and
 * `attach` and is read again on every call: on Cloudflare the object can be evicted while its sockets
 * stay open, so the core never caches anything per socket.
 */
export interface RoomPort<S> {
  /** The live sockets of the room, the one being admitted included. */
  sockets(): readonly S[]
  send(ws: S, text: string): void
  close(ws: S, code: number, reason?: string): void
  attachment(ws: S): Attachment | null
  attach(ws: S, att: Attachment): void
}

const connId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)

/**
 * Protocol v2 room: a memory-only forwarder of encrypted envelopes, the same on every runtime.
 * It cannot read, validate or reduce board content, and it has no storage of any kind.
 * Since the peer-to-peer mesh, its job is the strict minimum: who is in the room, WebRTC
 * signalling (encrypted, point to point) and presence. Board events go through it only for
 * participants who cannot open any direct link (fallback), buffered in memory for them.
 * No runtime API here: the clock is a parameter, sockets come through the port.
 */
export class RoomCore<S> {
  private readonly buffer = new EnvelopeBuffer()

  constructor(
    private readonly port: RoomPort<S>,
    private readonly log: Logger = consoleLogger,
    private readonly newConn: () => string = connId,
  ) {}

  /** True when the room holds the maximum number of connections: decide before accepting the socket. */
  full(): boolean {
    return this.port.sockets().length >= LIMITS.maxConnections
  }

  /** Browsers cannot read the status of a refused upgrade: say why, then close. `ws` is never part of the room. */
  refuse(ws: S, rh: string): void {
    this.log.warn('ws.full', { rh })
    this.send(ws, { t: 'err', code: 'full' })
    this.port.close(ws, 4008, 'Board is full')
  }

  /** `ws` is already among `port.sockets()`. */
  open(ws: S, rh: string, room: string, now: number): void {
    const att: Attachment = { rh, room, conn: this.newConn(), windowStart: now, count: 0 }
    this.port.attach(ws, att)
    this.send(ws, { t: 'welcome', conn: att.conn, peers: this.conns() })
    for (const frame of this.buffer.history()) this.send(ws, frame)
    // Board events travel peer to peer: the relay no longer asks peers to re-seed its buffer.
    this.broadcastPeers()
    this.log.info('ws.open', { rh, v: 2 })
  }

  message(ws: S, data: string | ArrayBuffer, now: number): void {
    const att = this.port.attachment(ws)
    if (!att) return
    const checked = checkFrame(att, data, now, LIMITS.rateWindowMs)
    this.port.attach(ws, att)
    if (checked.verdict === 'drop') return
    if (checked.verdict === 'close') {
      this.log.warn(checked.code === CLOSE_TOO_LARGE.code ? 'msg.too-large' : 'rate.limited', { rh: att.rh })
      return this.port.close(ws, checked.code, checked.reason)
    }
    const frame = checked.frame
    if (!frame) return this.send(ws, { t: 'err', code: 'invalid' })
    if (frame.t === 'eph') {
      if (frame.env.room !== att.room) return this.send(ws, { t: 'err', code: 'wrong-room' })
      return this.fanOut({ t: 'eph', env: frame.env }, ws)
    }
    if (frame.t === 'sig') {
      if (frame.env.room !== att.room) return this.send(ws, { t: 'err', code: 'wrong-room' })
      // WebRTC set-up, encrypted: to one connection of this room only, never buffered.
      const to = this.others(ws).find((s) => s.att?.conn === frame.to)
      if (to) this.send(to.ws, { t: 'sig', from: att.conn, env: frame.env })
      return
    }
    if (frame.envs.some((e) => e.room !== att.room)) return this.send(ws, { t: 'err', code: 'wrong-room' })
    const fresh = this.buffer.add(frame.envs)
    if (fresh.length) this.fanOut({ t: 'env', envs: fresh }, ws)
    this.log.info('env.ok', { rh: att.rh, n: fresh.length })
  }

  /** A connection closed or failed: the others learn the new list of peers. */
  leave(ws: S): void {
    this.broadcastPeers(ws)
  }

  private others(except?: S) {
    return this.port.sockets().filter((ws) => ws !== except).map((ws) => ({ ws, att: this.port.attachment(ws) }))
  }

  private conns(except?: S): string[] {
    return this.others(except).flatMap((s) => (s.att ? [s.att.conn] : [])).sort()
  }

  private broadcastPeers(except?: S): void {
    const peers = this.conns(except)
    for (const s of this.others(except)) this.send(s.ws, { t: 'peers', peers })
  }

  /** Serialised once, sent to every other socket: fan-out is the relay's hot path (cursors). */
  private fanOut(frame: RelayFrame, from: S): void {
    const text = JSON.stringify(frame)
    for (const ws of this.port.sockets()) {
      if (ws === from) continue
      try { this.port.send(ws, text) } catch { /* socket gone */ }
    }
  }

  private send(ws: S, frame: RelayFrame): void {
    try { this.port.send(ws, JSON.stringify(frame)) } catch { /* socket gone */ }
  }
}
