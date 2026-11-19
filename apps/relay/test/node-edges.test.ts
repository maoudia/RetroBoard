/** The Node adapter at its edges: what a real client cannot send or a real socket cannot do, reached through the same server. */
import { EventEmitter } from 'node:events'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'
import type { Logger } from '../src/core/logger'
import type { RoomPort } from '../src/core/room'

interface Spied { server: Server; listen: unknown[]; listener: (req: unknown, res: unknown) => void }
const servers: Spied[] = []
const ports: RoomPort<unknown>[] = []
const cores: { open: unknown[][] }[] = []
const control = { listenOverride: false, addressNull: false, forceFull: false }
const assetDirs: string[] = []

vi.mock('node:http', async (importOriginal) => {
  const http = await importOriginal<typeof import('node:http')>()
  return {
    ...http,
    createServer: (listener: (req: unknown, res: unknown) => void) => {
      const server = http.createServer(listener as never)
      const spied: Spied = { server, listen: [], listener }
      servers.push(spied)
      if (control.listenOverride) {
        const listen = server.listen.bind(server) as (...a: unknown[]) => Server
        ;(server as unknown as { listen: unknown }).listen = (...args: unknown[]) => { spied.listen = args; return listen(0, '127.0.0.1', args[2]) }
      }
      if (control.addressNull) (server as unknown as { address: unknown }).address = () => null
      return server
    },
  }
})

vi.mock('../src/core/room', async (importOriginal) => {
  const room = await importOriginal<typeof import('../src/core/room')>()
  class SpyCore<S> extends room.RoomCore<S> {
    readonly seen = { open: [] as unknown[][] }
    constructor(port: RoomPort<S>, log?: Logger, newConn?: () => string) {
      super(port, log, newConn)
      ports.push(port as RoomPort<unknown>)
      cores.push(this.seen)
    }
    override full(): boolean { return control.forceFull || super.full() }
    override open(ws: S, rh: string, roomId: string, now: number): void {
      this.seen.open.push([ws])
      super.open(ws, rh, roomId, now)
    }
  }
  return { ...room, RoomCore: SpyCore }
})

vi.mock('../src/adapters/node-static', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/adapters/node-static')>()
  // The packaged site does not exist in the repository: remember where it was looked for and serve the fixture instead.
  return { ...real, createAssets: (dir: string) => { assetDirs.push(dir); return real.createAssets(dir.endsWith(join('src', 'public')) ? fixtureDir() : dir) } }
})

const { startServer } = await import('../src/adapters/node')

let publicDir = ''
const fixtureDir = () => publicDir
beforeAll(() => {
  publicDir = join(mkdtempSync(join(tmpdir(), 'rb-node-edges-')), 'public')
  mkdirSync(publicDir, { recursive: true })
  writeFileSync(join(publicDir, 'index.html'), '<html><body>home</body></html>')
  writeFileSync(join(publicDir, '404.html'), '<html><body>branded 404</body></html>')
  writeFileSync(join(publicDir, '_csp.json'), JSON.stringify({ scripts: [], styles: [] }))
})
afterAll(() => rmSync(join(publicDir, '..'), { recursive: true, force: true }))

const started: { close(): Promise<void> }[] = []
const clients: WebSocket[] = []
afterEach(async () => {
  for (const ws of clients.splice(0)) ws.terminate()
  await Promise.all(started.splice(0).map((s) => s.close()))
  servers.length = 0
  ports.length = 0
  cores.length = 0
  control.listenOverride = false
  control.addressNull = false
  control.forceFull = false
  assetDirs.length = 0
  vi.restoreAllMocks()
})

const serve = async (options: Partial<Parameters<typeof startServer>[0]> = {}) => {
  const server = await startServer({ publicDir, port: 0, host: '127.0.0.1', settings: { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '0' }, drainMs: 100, ...options })
  started.push(server)
  return { server, spied: servers.at(-1)!, base: `ws://127.0.0.1:${server.port}` }
}

const ROOM = 'Ab3dEfGhIjKlMnOpQrStUv'
const connect = (base: string, room = ROOM) => {
  const ws = new WebSocket(`${base}/ws2?room=${room}`, { headers: { Origin: base.replace('ws', 'http') } })
  clients.push(ws)
  ws.on('error', () => { /* the close event carries the outcome */ })
  return ws
}
const until = async (test: () => boolean, ms = 3000) => {
  const end = Date.now() + ms
  while (!test()) { if (Date.now() > end) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 10)) }
}

/** A request as the Node parser would never hand it over. */
const fakeReq = (over: Record<string, unknown> = {}) => ({ headers: { host: 'retroboard.example' }, url: '/healthz', method: 'GET', socket: { remoteAddress: '203.0.113.7' }, resume: () => undefined, ...over })
function fakeRes(opts: { writeHeadFails?: number; headersSent?: boolean; drains?: boolean } = {}) {
  let failures = opts.writeHeadFails ?? 0
  const out = { status: 0, headers: {} as Record<string, string>, chunks: [] as unknown[], ended: false, headersSent: opts.headersSent ?? false, waited: 0 }
  const res = {
    ...out,
    writeHead(status: number, headers: Record<string, string> = {}) {
      if (failures > 0) { failures--; throw new Error('socket gone') }
      out.status = status; out.headers = headers
    },
    write(chunk: unknown) { out.chunks.push(chunk); return !opts.drains },
    once(_event: string, cb: () => void) { out.waited++; cb() },
    end() { out.ended = true },
    get headersSent() { return out.headersSent },
  }
  return { res, out }
}
const flush = () => new Promise((r) => setTimeout(r, 20))

describe('Node adapter: requests the parser never produces', () => {
  it('joins repeated header lines, skips an absent value, and defaults the host, the method and the path', async () => {
    const { spied } = await serve({ settings: { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '1', CLIENT_IP_HEADER: 'X-Forwarded-For', TRUSTED_PROXIES: '1' } })
    const get = async (req: ReturnType<typeof fakeReq>) => { const { res, out } = fakeRes(); spied.listener(req, res); await flush(); return out }
    const html = { accept: 'text/html' }
    // Two header lines: the client is the last hop. Same last hop, second page: limited. Another last hop: not.
    const via = (hops: string[]) => fakeReq({ url: '/', headers: { host: 'retroboard.example', ...html, 'x-forwarded-for': hops } })
    expect((await get(via(['6.6.6.6', '198.51.100.1']))).status).toBe(200)
    expect((await get(via(['7.7.7.7', '198.51.100.1']))).status).toBe(429)
    expect((await get(via(['6.6.6.6', '198.51.100.2']))).status).toBe(200)
    const bare = await get(fakeReq({ headers: { accept: undefined }, url: undefined, method: undefined }))
    expect(bare.status).toBe(200)
    expect(bare.ended).toBe(true)
  })

  it('serves a request of an unknown address', async () => {
    const { spied } = await serve()
    const { res, out } = fakeRes()
    spied.listener(fakeReq({ socket: {} }), res)
    await flush()
    expect(out.status).toBe(200)
  })

  it('waits for the socket to drain when a write does not fit', async () => {
    const { spied } = await serve()
    const { res, out } = fakeRes({ drains: true })
    spied.listener(fakeReq(), res)
    await flush()
    expect(out.waited).toBeGreaterThan(0)
    expect(out.ended).toBe(true)
  })

  it('answers 500 when the response cannot be written, and only ends it when the headers are gone already', async () => {
    const { spied } = await serve()
    const first = fakeRes({ writeHeadFails: 1 })
    spied.listener(fakeReq(), first.res)
    await flush()
    expect([first.out.status, first.out.ended]).toEqual([500, true])
    const sent = fakeRes({ writeHeadFails: 1, headersSent: true })
    spied.listener(fakeReq(), sent.res)
    await flush()
    expect([sent.out.status, sent.out.ended]).toEqual([0, true])
  })

  it('answers 426 to an upgrade request that reached the plain handler', async () => {
    const { spied, base } = await serve()
    const { res, out } = fakeRes()
    spied.listener(fakeReq({ url: `/ws2?room=${ROOM}`, headers: { host: 'retroboard.example', upgrade: 'websocket', origin: 'http://retroboard.example' } }), res)
    await flush()
    expect(out.status).toBe(426)
    expect(base).toContain('ws://')
  })
})

describe('Node adapter: upgrades the parser never produces', () => {
  const fakeSocket = () => {
    const socket = Object.assign(new EventEmitter(), { destroyed: false, ended: '' as string, destroy() { socket.destroyed = true }, end(text: string) { socket.ended = text } })
    return socket
  }

  it('destroys the socket when the request cannot be read', async () => {
    const { spied } = await serve()
    const socket = fakeSocket()
    spied.server.emit('upgrade', fakeReq({ headers: { host: 'not a host' } }), socket, Buffer.alloc(0))
    await flush()
    expect(socket.destroyed).toBe(true)
    // A peer that resets the connection is not an error of the server.
    expect(() => socket.emit('error', new Error('ECONNRESET'))).not.toThrow()
  })

  it('refuses an upgrade from an unknown address with the reason of the handler', async () => {
    const { spied } = await serve()
    const socket = fakeSocket()
    spied.server.emit('upgrade', fakeReq({ socket: {}, url: `/ws2?room=${ROOM}`, headers: { host: 'retroboard.example', upgrade: 'websocket', origin: 'https://evil.example' } }), socket, Buffer.alloc(0))
    await flush()
    expect(socket.ended).toContain('HTTP/1.1 403')
  })
})

describe('Node adapter: sockets', () => {
  it('finds no attachment for a socket the room never opened', async () => {
    await serve()
    const port = ports.at(-1) ?? null
    expect(port).toBeNull()
    const ws = connect(`ws://127.0.0.1:${(servers.at(-1)!.server.address() as { port: number }).port}`)
    await until(() => ports.length > 0)
    expect(ports[0]!.attachment({} as never)).toBeNull()
    ws.close()
  })

  it('closes a socket that stopped reading instead of queueing for it', async () => {
    const { base } = await serve()
    const ws = connect(base)
    await until(() => ports.length > 0)
    const closes: unknown[][] = []
    ports[0]!.send({ readyState: 1, OPEN: 1, bufferedAmount: 5 * 1024 * 1024, close: (...a: unknown[]) => closes.push(a), send: () => { throw new Error('queued') } } as never, 'x')
    expect(closes).toEqual([[1008, 'Backpressure']])
    ws.close()
  })

  it('logs an error without a code as unknown', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { base } = await serve()
    const ws = connect(base)
    await until(() => cores.length > 0 && cores[0]!.open.length > 0)
    ;(cores[0]!.open[0]![0] as WebSocket).emit('error', new Error('boom'))
    expect(warn.mock.calls.some((c) => String(c[0]).includes('unknown'))).toBe(true)
    ws.close()
  })

  it('forgets a room whose only socket was refused as full', async () => {
    const { base } = await serve()
    control.forceFull = true
    const ws = connect(base)
    const closed = new Promise<number>((resolve) => ws.on('close', (code) => resolve(code)))
    expect(await closed).toBe(4008)
    expect(cores).toHaveLength(1)
  })

  it('cuts a socket that does not leave within the drain period of a shutdown', async () => {
    const { server, base } = await serve({ drainMs: 50 })
    const ws = connect(base)
    await until(() => cores.length > 0 && cores[0]!.open.length > 0)
    const stuck = cores[0]!.open[0]![0] as WebSocket
    const terminate = vi.spyOn(stuck, 'terminate')
    stuck.close = () => undefined
    await server.close()
    started.length = 0
    expect(terminate).toHaveBeenCalled()
    ws.terminate()
  })

  it('terminates a silent socket a little after the close that tells it to go', async () => {
    const delays: { fn: () => void; ms: number | undefined }[] = []
    const real = globalThis.setTimeout
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number, ...rest: unknown[]) => {
      if (ms === 2000) delays.push({ fn, ms })
      return (real as (...a: unknown[]) => unknown)(fn, ms, ...rest)
    }) as never)
    const { base } = await serve({ idle: { pingMs: 40, idleMs: 100 } })
    const ws = new WebSocket(`${base}/ws2?room=${ROOM}`, { headers: { Origin: base.replace('ws', 'http') }, autoPong: false })
    clients.push(ws)
    ws.on('error', () => undefined)
    await until(() => delays.length > 0)
    expect(() => delays[0]!.fn()).not.toThrow()
  })
})

describe('Node adapter: defaults', () => {
  it('listens on 8787 on every interface unless told otherwise, and reports port 0 when the server has no address', async () => {
    control.listenOverride = true
    control.addressNull = true
    const server = await startServer({ publicDir })
    started.push(server)
    expect(servers.at(-1)!.listen.slice(0, 2)).toEqual([8787, '0.0.0.0'])
    expect(server.port).toBe(0)
  })
})

describe('Node adapter: run as a program', () => {
  const entry = fileURLToPath(new URL('../src/adapters/node.ts', import.meta.url).href)
  const run = async (env: Record<string, string>) => {
    const argv = process.argv[1]
    const before = { term: process.listeners('SIGTERM'), int: process.listeners('SIGINT') }
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.resetModules()
    process.argv[1] = entry
    const saved = { ...process.env }
    Object.assign(process.env, env)
    try {
      await import('../src/adapters/node')
    } finally {
      process.argv[1] = argv!
      for (const key of Object.keys(env)) { if (saved[key] === undefined) Reflect.deleteProperty(process.env, key); else process.env[key] = saved[key] }
    }
    const added = process.listeners('SIGTERM').filter((l) => !before.term.includes(l))
    expect(added).toHaveLength(1)
    expect(process.listeners('SIGINT').filter((l) => !before.int.includes(l))).toHaveLength(1)
    process.emit('SIGTERM')
    process.emit('SIGINT')
    await until(() => exit.mock.calls.length > 0)
    for (const l of added) process.off('SIGTERM', l)
    for (const l of process.listeners('SIGINT').filter((l) => !before.int.includes(l))) process.off('SIGINT', l)
    return exit
  }

  it('starts from the environment and stops once on a signal', async () => {
    const exit = await run({ PUBLIC_DIR: publicDir, PORT: '0', HOST: '127.0.0.1', MAX_CONNECTIONS_PER_ADDRESS: '5', MAX_CONNECTS_PER_MINUTE: '', SELF_HOSTED: '1' })
    expect(exit).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledWith(0)
  })

  it('uses the packaged site and its own port when the environment names none', async () => {
    control.listenOverride = true
    const exit = await run({ PORT: '', HOST: '127.0.0.1' })
    expect(exit).toHaveBeenCalledWith(0)
    expect(assetDirs.at(-1)).toBe(fileURLToPath(new URL('../src/public', import.meta.url).href))
  })
})
