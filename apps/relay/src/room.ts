import { DurableObject } from 'cloudflare:workers'
import { createBoard, LIMITS , reduce , buildSnapshot  } from '@retroboard/domain'
import { parseCommand, parseHello } from '@retroboard/protocol'
import type { BoardState, ErrorCode, Peer, ServerMessage } from '@retroboard/domain'
import type { Env } from './env'
import { consoleLogger, type Logger } from './logger'
import { type BoardRepository, DurableStorageRepository } from './repository'

/** Survives hibernation, lives in the WebSocket attachment (max 2 KB). */
interface Attachment {
  rh: string
  cid: string | null
  name: string | null
  showName: boolean
  windowStart: number
  count: number
}

const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)

/**
 * One Durable Object per board. Transport and persistence only:
 * every rule lives in the shared domain (`reduce`), which is pure and unit tested.
 */
export class Room extends DurableObject<Env> {
  private state: BoardState = createBoard({ newId })
  private readonly repo: BoardRepository
  private readonly log: Logger

  constructor(ctx: DurableObjectState, env: Env, deps: { repo?: BoardRepository; log?: Logger } = {}) {
    super(ctx, env)
    this.repo = deps.repo ?? new DurableStorageRepository(ctx.storage)
    this.log = deps.log ?? consoleLogger
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
    void ctx.blockConcurrencyWhile(async () => {
      const loaded = await this.repo.load()
      if (loaded) this.state = loaded
    })
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
    const rh = request.headers.get('x-room-hash') ?? 'unknown'
    if (this.ctx.getWebSockets().length >= LIMITS.maxConnections) {
      this.log.warn('ws.full', { rh })
      return new Response('Board is full', { status: 503 })
    }
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    this.ctx.acceptWebSocket(server)
    const att: Attachment = { rh, cid: null, name: null, showName: false, windowStart: Date.now(), count: 0 }
    server.serializeAttachment(att)
    this.log.info('ws.open', { rh })
    return new Response(null, { status: 101, webSocket: client })
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const att = ws.deserializeAttachment() as Attachment
    if (typeof message !== 'string' || message.length > LIMITS.maxMessageBytes) {
      this.log.warn('msg.too-large', { rh: att.rh })
      ws.close(1009, 'Message too large')
      return
    }
    const now = Date.now()
    if (now - att.windowStart > LIMITS.rateWindowMs) {
      att.windowStart = now
      att.count = 0
    }
    if (++att.count > LIMITS.rateMax) {
      this.log.warn('rate.limited', { rh: att.rh })
      ws.close(1008, 'Rate limit')
      return
    }

    let raw: unknown
    try { raw = JSON.parse(message) } catch { return this.reject(ws, att, 'invalid') }

    if (!att.cid) {
      const hello = parseHello(raw)
      if (!hello) return this.reject(ws, att, 'invalid')
      att.cid = hello.cid
      att.name = hello.name || null
      att.showName = hello.showName
      ws.serializeAttachment(att)
      this.broadcast()
      return
    }
    ws.serializeAttachment(att)

    const hello = parseHello(raw)
    if (hello) {
      // Name change from the same connection.
      att.name = hello.name || null
      att.showName = hello.showName
      ws.serializeAttachment(att)
      this.broadcast()
      return
    }

    const cmd = parseCommand(raw)
    if (!cmd) return this.reject(ws, att, 'invalid')

    const out = reduce(this.state, cmd, { cid: att.cid, name: att.name, showName: att.showName }, { now, newId })
    if (!out.ok) {
      this.log.info('cmd.rejected', { rh: att.rh, t: cmd.t, error: out.error })
      return this.reject(ws, att, out.error)
    }
    this.state = out.state
    await this.repo.persist(out.state, out.dirty)
    await this.ctx.storage.setAlarm(now + LIMITS.ttlMs)
    this.log.info('cmd.ok', { rh: att.rh, t: cmd.t })
    this.broadcast()
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    const att = ws.deserializeAttachment() as Attachment | null
    this.log.info('ws.close', { rh: att?.rh ?? 'unknown', code })
    try { ws.close(code === 1005 ? 1000 : code) } catch { /* already closed */ }
    this.broadcast(ws)
  }

  override webSocketError(ws: WebSocket): void {
    this.log.warn('ws.error', { rh: (ws.deserializeAttachment() as Attachment | null)?.rh ?? 'unknown' })
    this.broadcast(ws)
  }

  override async alarm(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Board expired')
    await this.repo.erase()
    this.state = createBoard({ newId })
    this.log.info('room.erased')
  }

  private reject(ws: WebSocket, att: Attachment, error: ErrorCode): void {
    this.send(ws, { t: 'error', error })
    if (att.cid) this.send(ws, buildSnapshot(this.state, { cid: att.cid }, this.peers(att.cid), Date.now()))
  }

  private peers(viewerCid: string, except?: WebSocket): Peer[] {
    const seen = new Set<string>()
    const peers: Peer[] = []
    for (const s of this.ctx.getWebSockets()) {
      if (s === except) continue
      const a = s.deserializeAttachment() as Attachment | null
      if (!a?.cid || seen.has(a.cid)) continue
      seen.add(a.cid)
      peers.push({ name: a.name, me: a.cid === viewerCid })
    }
    return peers.sort((x, y) => Number(y.me) - Number(x.me) || (x.name ?? '').localeCompare(y.name ?? ''))
  }

  /** Each socket gets its own snapshot: votes and ownership are personalised. */
  private broadcast(except?: WebSocket): void {
    const now = Date.now()
    for (const s of this.ctx.getWebSockets()) {
      if (s === except) continue
      const a = s.deserializeAttachment() as Attachment | null
      if (!a?.cid) continue
      this.send(s, buildSnapshot(this.state, { cid: a.cid }, this.peers(a.cid, except), now))
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try { ws.send(JSON.stringify(msg)) } catch { /* socket gone */ }
  }
}
