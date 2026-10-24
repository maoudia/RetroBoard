import { DurableObject } from 'cloudflare:workers'
import { LIMITS } from '@retroboard/domain'
import { MAX_FRAME_BYTES, parseClientFrame, type RelayFrame } from '@retroboard/protocol'
import type { Env } from './env'
import { consoleLogger, type Logger } from './logger'
import { allow, EnvelopeBuffer, type RateWindow } from './relay-core'

/** Survives hibernation in the WebSocket attachment (max 2 KB). No board data here. */
interface Attachment extends RateWindow { rh: string; room: string; conn: string }

const connId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)
/** v2 frames are batched, so the per-socket budget is in frames, not commands. */
const RATE_MAX = LIMITS.rateMax * 2

/**
 * Protocol v2 room: a memory-only forwarder of encrypted envelopes.
 * It cannot read, validate or reduce board content. It never touches ctx.storage:
 * when the object is evicted the buffer is gone and connected peers re-seed it ('need').
 */
export class RelayRoom extends DurableObject<Env> {
  private readonly buffer = new EnvelopeBuffer()
  private readonly log: Logger = consoleLogger

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
    const rh = request.headers.get('x-room-hash') ?? 'unknown'
    const room = new URL(request.url).searchParams.get('room') ?? ''
    if (this.ctx.getWebSockets().length >= LIMITS.maxConnections) {
      this.log.warn('ws.full', { rh })
      return new Response('Board is full', { status: 503 })
    }
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server)
    const att: Attachment = { rh, room, conn: connId(), windowStart: Date.now(), count: 0 }
    server.serializeAttachment(att)

    const others = this.sockets().filter((s) => s.ws !== server)
    this.send(server, { t: 'welcome', conn: att.conn, peers: this.conns() })
    for (const frame of this.buffer.history()) this.send(server, frame)
    // Evicted and woken up with peers still connected: ask them to re-seed the buffer.
    if (this.buffer.size === 0 && others.length > 0) for (const o of others) this.send(o.ws, { t: 'need' })
    this.broadcastPeers()
    this.log.info('ws.open', { rh, v: 2 })
    return new Response(null, { status: 101, webSocket: client })
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment
    if (typeof message !== 'string' || message.length > MAX_FRAME_BYTES) {
      this.log.warn('msg.too-large', { rh: att.rh })
      return ws.close(1009, 'Message too large')
    }
    const ok = allow(att, Date.now(), RATE_MAX, LIMITS.rateWindowMs)
    ws.serializeAttachment(att)
    if (!ok) {
      this.log.warn('rate.limited', { rh: att.rh })
      return ws.close(1008, 'Rate limit')
    }
    let raw: unknown
    try { raw = JSON.parse(message) } catch { return this.send(ws, { t: 'err', code: 'invalid' }) }
    const frame = parseClientFrame(raw)
    if (!frame) return this.send(ws, { t: 'err', code: 'invalid' })

    if (frame.t === 'eph') {
      if (frame.env.room !== att.room) return this.send(ws, { t: 'err', code: 'wrong-room' })
      return this.fanOut({ t: 'eph', env: frame.env }, ws)
    }
    if (frame.envs.some((e) => e.room !== att.room)) return this.send(ws, { t: 'err', code: 'wrong-room' })
    const fresh = this.buffer.add(frame.envs)
    if (fresh.length) this.fanOut({ t: 'env', envs: fresh }, ws)
    this.log.info('env.ok', { rh: att.rh, n: fresh.length })
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    try { ws.close(code === 1005 ? 1000 : code) } catch { /* already closed */ }
    this.broadcastPeers(ws)
  }

  override webSocketError(ws: WebSocket): void {
    this.broadcastPeers(ws)
  }

  private sockets(except?: WebSocket) {
    return this.ctx.getWebSockets().filter((ws) => ws !== except).map((ws) => ({ ws, att: ws.deserializeAttachment() as Attachment | null }))
  }

  private conns(except?: WebSocket): string[] {
    return this.sockets(except).flatMap((s) => (s.att ? [s.att.conn] : [])).sort()
  }

  private broadcastPeers(except?: WebSocket): void {
    const peers = this.conns(except)
    for (const s of this.sockets(except)) this.send(s.ws, { t: 'peers', peers })
  }

  private fanOut(frame: RelayFrame, from: WebSocket): void {
    for (const s of this.sockets(from)) this.send(s.ws, frame)
  }

  private send(ws: WebSocket, frame: RelayFrame): void {
    try { ws.send(JSON.stringify(frame)) } catch { /* socket gone */ }
  }
}
