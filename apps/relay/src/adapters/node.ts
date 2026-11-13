import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { type WebSocket, WebSocketServer } from 'ws'
import { MAX_FRAME_BYTES } from '@retroboard/protocol'
import { clientIp } from '../core/client-ip'
import { handleHttp, type Settings } from '../core/http'
import { consoleLogger } from '../core/logger'
import { type Attachment, RoomCore, type RoomPort } from '../core/room'
import { AddressBook, DEFAULT_IDLE, idleAction, type IdlePolicy, overBudget } from './node-limits'
import { createAssets } from './node-static'

export interface NodeOptions {
  /** Directory of the generated static site. */
  publicDir: string
  settings?: Settings
  port?: number
  host?: string
  /** Open sockets and connection attempts per minute from one address; 0 turns a limit off. */
  maxConnectionsPerAddress?: number
  maxConnectsPerMinute?: number
  idle?: IdlePolicy
  /** Time given to sockets to close on shutdown before they are cut. */
  drainMs?: number
}

export interface NodeServer {
  port: number
  /** Stop accepting, close every socket with 1001, resolve when they are gone or the drain period is over. */
  close(): Promise<void>
}

interface Room { sockets: Set<WebSocket>; core: RoomCore<WebSocket> }

const log = consoleLogger

/** The request as the web-standard handler sees it. The URL is rebuilt from the Host header and never logged. */
function toRequest(req: IncomingMessage): Request {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) for (const v of value) headers.append(name, v)
    else if (value !== undefined) headers.set(name, value)
  }
  const host = req.headers.host ?? 'localhost'
  return new Request(`http://${host}${req.url ?? '/'}`, { method: req.method ?? 'GET', headers })
}

/** A response written onto a raw upgrade socket that is not going to become a WebSocket. */
async function refuseUpgrade(socket: Duplex, res: Response): Promise<void> {
  const body = await res.text()
  const lines = [`HTTP/1.1 ${res.status} ${res.statusText || 'Refused'}`]
  res.headers.forEach((value, name) => lines.push(`${name}: ${value}`))
  lines.push('Connection: close', `Content-Length: ${Buffer.byteLength(body)}`, '', body)
  socket.end(lines.join('\r\n'))
}

async function writeResponse(out: ServerResponse, res: Response, head: boolean): Promise<void> {
  const headers: Record<string, string> = {}
  res.headers.forEach((value, name) => { headers[name] = value })
  out.writeHead(res.status, headers)
  if (head || !res.body) return void out.end()
  const reader = res.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!out.write(value)) await new Promise<void>((resolve) => out.once('drain', resolve))
    }
  } finally {
    out.end()
  }
}

/** The relay and the site on plain Node: `node:http` for files, `ws` for sockets, the same core as the Durable Object. */
export async function startServer(options: NodeOptions): Promise<NodeServer> {
  const settings = options.settings ?? {}
  const idle = options.idle ?? DEFAULT_IDLE
  const drainMs = options.drainMs ?? 5000
  const assets = createAssets(options.publicDir)
  const book = new AddressBook(options.maxConnectionsPerAddress ?? 200, options.maxConnectsPerMinute ?? 600)
  const rooms = new Map<string, Room>()
  const attachments = new WeakMap<WebSocket, Attachment>()
  const lastSeen = new WeakMap<WebSocket, number>()
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES, perMessageDeflate: false })

  const roomOf = (id: string): Room => {
    let room = rooms.get(id)
    if (room) return room
    const sockets = new Set<WebSocket>()
    const port: RoomPort<WebSocket> = {
      sockets: () => [...sockets],
      send(ws, text) {
        if (ws.readyState !== ws.OPEN) return
        // A socket that stopped reading would grow without bound: close it rather than queue for it.
        if (overBudget(ws.bufferedAmount)) return ws.close(1008, 'Backpressure')
        ws.send(text)
      },
      close: (ws, code, reason) => ws.close(code, reason),
      attachment: (ws) => attachments.get(ws) ?? null,
      attach: (ws, att) => void attachments.set(ws, att),
    }
    room = { sockets, core: new RoomCore(port, log) }
    rooms.set(id, room)
    return room
  }

  function accept(ws: WebSocket, id: string, rh: string, address: string): void {
    ws.on('error', (err: Error & { code?: string }) => log.warn('ws.error', { code: err.code ?? 'unknown' }))
    const room = roomOf(id)
    lastSeen.set(ws, Date.now())
    ws.on('pong', () => lastSeen.set(ws, Date.now()))
    ws.on('close', () => {
      book.release(address)
      if (!room.sockets.delete(ws)) return
      room.core.leave(ws)
      if (room.sockets.size === 0 && rooms.get(id) === room) rooms.delete(id)
    })
    if (room.core.full()) {
      // Never counted in the room: this socket only carries the refusal.
      room.core.refuse(ws, rh)
      if (room.sockets.size === 0 && rooms.get(id) === room) rooms.delete(id)
      return
    }
    ws.on('message', (data, isBinary) => {
      lastSeen.set(ws, Date.now())
      const text = isBinary ? null : data.toString('utf8')
      // Liveness ping of the client: answered without counting against any budget.
      if (text === 'ping') return ws.send('pong')
      room.core.message(ws, text ?? new ArrayBuffer(0), Date.now())
    })
    room.sockets.add(ws)
    room.core.open(ws, rh, id, Date.now())
  }

  async function upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    socket.on('error', () => { /* the peer went away */ })
    const request = toRequest(req)
    const address = clientIp(request, settings, req.socket.remoteAddress ?? null) ?? 'unknown'
    const admission = book.admit(address, Date.now())
    if (admission !== 'ok') {
      log.warn('ws.reject', { reason: admission })
      return void (await refuseUpgrade(socket, new Response('Too many connections', { status: 429, headers: { 'Retry-After': '30' } })))
    }
    let admitted: { room: string; rh: string } | null = null
    const res = await handleHttp(request, {
      assets,
      settings,
      clientIp: address,
      relay: async (_request, room, rh) => {
        admitted = { room, rh }
        return new Response(null, { status: 204 })
      },
    })
    if (!admitted || socket.destroyed) {
      book.release(address)
      return void (await refuseUpgrade(socket, res))
    }
    const { room, rh } = admitted as { room: string; rh: string }
    wss.handleUpgrade(req, socket, head, (ws) => accept(ws, room, rh, address))
  }

  const server: Server = createServer((req, res) => {
    const request = toRequest(req)
    const ip = clientIp(request, settings, req.socket.remoteAddress ?? null)
    handleHttp(request, {
      assets,
      settings,
      clientIp: ip,
      // A plain request to /ws2 is not an upgrade: the handler already answered 426, this is never reached.
      relay: async () => new Response('Expected WebSocket', { status: 426 }),
    })
      .then((out) => writeResponse(res, out, request.method === 'HEAD'))
      .catch(() => {
        log.warn('http.error')
        if (!res.headersSent) res.writeHead(500)
        res.end()
      })
    req.resume()
  })
  server.on('upgrade', (req, socket, head) => {
    upgrade(req, socket, head).catch(() => {
      log.warn('ws.upgrade-error')
      socket.destroy()
    })
  })

  const sweep = setInterval(() => {
    const now = Date.now()
    book.sweep(now)
    for (const ws of wss.clients) {
      const action = idleAction(lastSeen.get(ws) ?? now, now, idle)
      if (action === 'ping') ws.ping()
      else if (action === 'close') {
        ws.close(1001, 'Idle')
        setTimeout(() => ws.terminate(), 2000).unref()
      }
    }
  }, Math.max(20, Math.min(10_000, Math.floor(idle.pingMs / 3))))
  sweep.unref()

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 8787, options.host ?? '0.0.0.0', resolve)
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : (options.port ?? 0)

  return {
    port,
    async close() {
      clearInterval(sweep)
      server.close()
      for (const ws of wss.clients) ws.close(1001, 'Server going away')
      const deadline = Date.now() + drainMs
      while (wss.clients.size > 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25))
      for (const ws of wss.clients) ws.terminate()
      server.closeAllConnections()
    },
  }
}

/** Settings from the environment: the same names as the Worker variables. */
export function settingsFromEnv(env: NodeJS.ProcessEnv): Settings {
  const pick = <K extends keyof Settings>(key: K) => (env[key] ? { [key]: env[key] } : {})
  return {
    ...pick('ALLOWED_ORIGINS'), ...pick('MAINTENANCE'), ...pick('RATE_LIMIT_PER_MIN'), ...pick('SELF_HOSTED'),
    ...pick('CLIENT_IP_HEADER'), ...pick('TRUSTED_PROXIES'),
    ...(env.ORIGIN_TRIAL_TOKENS ? { ORIGIN_TRIAL_TOKENS: JSON.parse(env.ORIGIN_TRIAL_TOKENS) as Record<string, string> } : {}),
  }
}

const intFrom = (value: string | undefined): number | undefined => (value === undefined || value === '' ? undefined : Number(value))

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env
  const publicDir = env.PUBLIC_DIR ?? fileURLToPath(new URL('../public', import.meta.url).href)
  const app = await startServer({
    publicDir,
    settings: settingsFromEnv(env),
    port: intFrom(env.PORT) ?? 8787,
    host: env.HOST,
    maxConnectionsPerAddress: intFrom(env.MAX_CONNECTIONS_PER_ADDRESS),
    maxConnectsPerMinute: intFrom(env.MAX_CONNECTS_PER_MINUTE),
  })
  log.info('node.listening', { port: app.port })
  let stopping = false
  const stop = () => {
    if (stopping) return
    stopping = true
    log.info('node.stopping')
    void app.close().then(() => process.exit(0))
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
}
