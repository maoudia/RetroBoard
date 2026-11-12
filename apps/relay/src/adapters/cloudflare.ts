import { DurableObject } from 'cloudflare:workers'
import type { Env } from '../env'
import { type Attachment, RoomCore, type RoomPort } from '../core/room'

/** The room core over the hibernation API: state in the socket attachment, sockets from the object context. */
const portOf = (ctx: DurableObjectState): RoomPort<WebSocket> => ({
  sockets: () => ctx.getWebSockets(),
  send: (ws, text) => ws.send(text),
  close: (ws, code, reason) => ws.close(code, reason),
  attachment: (ws) => ws.deserializeAttachment() as Attachment | null,
  attach: (ws, att) => ws.serializeAttachment(att),
})

/**
 * Protocol v2 room on Cloudflare: a Durable Object that only plumbs sockets (accept, hibernate,
 * attachment) into the runtime-neutral RoomCore. It never touches ctx.storage.
 */
export class RelayRoom extends DurableObject<Env> {
  private readonly core: RoomCore<WebSocket>

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
    this.core = new RoomCore(portOf(ctx))
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
    const rh = request.headers.get('x-room-hash') ?? 'unknown'
    const room = new URL(request.url).searchParams.get('room') ?? ''
    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    if (this.core.full()) {
      // Not hibernatable and not counted: this socket only carries the refusal.
      server.accept()
      this.core.refuse(server, rh)
      return new Response(null, { status: 101, webSocket: client })
    }
    this.ctx.acceptWebSocket(server)
    this.core.open(server, rh, room, Date.now())
    return new Response(null, { status: 101, webSocket: client })
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    this.core.message(ws, message, Date.now())
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    try { ws.close(code === 1005 ? 1000 : code) } catch { /* already closed */ }
    this.core.leave(ws)
  }

  override webSocketError(ws: WebSocket): void {
    this.core.leave(ws)
  }
}
