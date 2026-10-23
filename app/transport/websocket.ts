import type { Command } from '~~/shared/domain/schemas'
import type { ServerMessage } from '~~/shared/domain/types'
import type { BoardTransport, Identity, TransportHandlers } from './types'

export function buildWsUrl(base: string, roomId: string, loc: Pick<Location, 'protocol' | 'host'>): string {
  const origin = base || `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}`
  return `${origin.replace(/\/$/, '')}/ws?room=${encodeURIComponent(roomId)}`
}

export function backoffDelay(attempt: number, random = Math.random): number {
  return Math.min(10_000, 500 * 2 ** attempt) + Math.floor(random() * 300)
}

export class WebSocketTransport implements BoardTransport {
  private ws: WebSocket | null = null
  private identity: Identity | null = null
  private attempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private closed = false

  constructor(
    private readonly url: string,
    private readonly handlers: TransportHandlers,
    private readonly WS: typeof WebSocket = WebSocket,
  ) {}

  connect(identity: Identity): void {
    this.identity = identity
    this.closed = false
    this.open()
  }

  send(command: Command): boolean {
    if (this.ws?.readyState !== 1) return false
    this.ws.send(JSON.stringify(command))
    return true
  }

  updateIdentity(identity: Identity): void {
    this.identity = identity
    this.sendHello()
  }

  close(): void {
    this.closed = true
    clearTimeout(this.reconnectTimer)
    clearInterval(this.heartbeat)
    this.ws?.close(1000)
    this.ws = null
    this.handlers.onStatus('closed')
  }

  private sendHello(): void {
    if (this.ws?.readyState !== 1 || !this.identity) return
    this.ws.send(JSON.stringify({ t: 'hello', cid: this.identity.cid, name: this.identity.name, showName: this.identity.showName }))
  }

  private open(): void {
    this.handlers.onStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
    const ws = new this.WS(this.url)
    this.ws = ws
    ws.onopen = () => {
      this.attempts = 0
      this.sendHello()
      this.handlers.onStatus('open')
      clearInterval(this.heartbeat)
      // Answered by the Durable Object without waking it up.
      this.heartbeat = setInterval(() => { if (ws.readyState === 1) ws.send('ping') }, 25_000)
    }
    ws.onmessage = (ev: MessageEvent) => {
      if (ev.data === 'pong') return
      let msg: ServerMessage
      try { msg = JSON.parse(String(ev.data)) as ServerMessage } catch { return }
      if (msg.t === 'snapshot') this.handlers.onSnapshot(msg)
      else if (msg.t === 'error') this.handlers.onError(msg.error)
    }
    ws.onclose = () => {
      clearInterval(this.heartbeat)
      if (this.closed || this.ws !== ws) return
      this.handlers.onStatus('reconnecting')
      this.reconnectTimer = setTimeout(() => { this.attempts++; this.open() }, backoffDelay(this.attempts))
    }
    ws.onerror = () => { /* onclose follows */ }
  }
}
