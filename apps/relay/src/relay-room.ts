import { DurableObject } from 'cloudflare:workers'
import { LIMITS } from '@retroboard/domain'
import { MAX_FRAME_BYTES, parseClientFrame, type RelayFrame } from '@retroboard/protocol'
import type { Env } from './env'
import { consoleLogger, type Logger } from './logger'
import { admit, type Budgets, EnvelopeBuffer } from './relay-core'

/** Survives hibernation in the WebSocket attachment (max 2 KB). No board data here. */
interface Attachment extends Budgets { rh: string; room: string; conn: string }

const connId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)

/**
 * Protocol v2 room: a memory-only forwarder of encrypted envelopes.
 * It cannot read, validate or reduce board content. It never touches ctx.storage.
 * Since the peer-to-peer mesh, its job is the strict minimum: who is in the room, WebRTC
 * signalling (encrypted, point to point) and presence. Board events go through it only for
 * participants who cannot open any direct link (fallback), buffered in memory for them.
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
      // Browsers cannot read the status of a refused upgrade: accept, say why, close.
      // Not hibernatable and not counted: this socket only carries the refusal.
      const pair = new WebSocketPair()
      pair[1].accept()
      pair[1].send(JSON.stringify({ t: 'err', code: 'full' } satisfies RelayFrame))
      pair[1].close(4008, 'Board is full')
      return new Response(null, { status: 101, webSocket: pair[0] })
    }
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server)
    const att: Attachment = { rh, room, conn: connId(), windowStart: Date.now(), count: 0 }
    server.serializeAttachment(att)

    this.send(server, { t: 'welcome', conn: att.conn, peers: this.conns() })
    for (const frame of this.buffer.history()) this.send(server, frame)
    // Board events travel peer to peer: the relay no longer asks peers to re-seed its buffer.
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
    let raw: unknown
    try { raw = JSON.parse(message) } catch { raw = null }
    const frame = parseClientFrame(raw)

    const verdict = admit(att, frame?.t === 'eph' ? 'live' : frame?.t === 'sig' ? 'sig' : 'board', Date.now(), LIMITS.rateWindowMs)
    ws.serializeAttachment(att)
    if (verdict === 'drop') return
    if (verdict === 'close') {
      this.log.warn('rate.limited', { rh: att.rh })
      return ws.close(1008, 'Rate limit')
    }
    if (!frame) return this.send(ws, { t: 'err', code: 'invalid' })
    if (frame.t === 'eph') {
      if (frame.env.room !== att.room) return this.send(ws, { t: 'err', code: 'wrong-room' })
      return this.fanOut({ t: 'eph', env: frame.env }, ws)
    }
    if (frame.t === 'sig') {
      if (frame.env.room !== att.room) return this.send(ws, { t: 'err', code: 'wrong-room' })
      // WebRTC set-up, encrypted: to one connection of this room only, never buffered.
      const to = this.sockets(ws).find((s) => s.att?.conn === frame.to)
      if (to) this.send(to.ws, { t: 'sig', from: att.conn, env: frame.env })
      return
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

  /** Serialised once, sent to every other socket: fan-out is the relay's hot path (cursors). */
  private fanOut(frame: RelayFrame, from: WebSocket): void {
    const text = JSON.stringify(frame)
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === from) continue
      try { ws.send(text) } catch { /* socket gone */ }
    }
  }

  private send(ws: WebSocket, frame: RelayFrame): void {
    try { ws.send(JSON.stringify(frame)) } catch { /* socket gone */ }
  }
}
