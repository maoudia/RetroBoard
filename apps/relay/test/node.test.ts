import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import WebSocket from 'ws'
import { LIMITS } from '@retroboard/domain'
import { MAX_FRAME_BYTES } from '@retroboard/protocol'
import { type NodeServer, type NodeOptions, settingsFromEnv, startServer } from '../src/adapters/node'
// @ts-expect-error plain ESM script without types
import { runSmoke } from '../../../scripts/smoke.mjs'

const ROOM = 'Ab3dEfGhIjKlMnOpQrStUv'
let publicDir = ''
const started: NodeServer[] = []
const sockets: WebSocket[] = []

beforeAll(() => {
  publicDir = join(mkdtempSync(join(tmpdir(), 'rb-node-')), 'public')
  mkdirSync(join(publicDir, '_nuxt'), { recursive: true })
  mkdirSync(join(publicDir, 'boards'))
  writeFileSync(join(publicDir, 'index.html'), '<html><body><div id="__nuxt"></div><script type="module" src="/_nuxt/entry1.js"></script></body></html>')
  writeFileSync(join(publicDir, 'boards', 'index.html'), '<html><body><div id="__nuxt"></div></body></html>')
  writeFileSync(join(publicDir, '404.html'), '<html><body>branded 404</body></html>')
  writeFileSync(join(publicDir, '_nuxt', 'entry1.js'), 'export {}')
  writeFileSync(join(publicDir, '_csp.json'), JSON.stringify({ scripts: ['sha256-a'], styles: [] }))
})
afterAll(() => rmSync(join(publicDir, '..'), { recursive: true, force: true }))
afterEach(async () => {
  for (const ws of sockets.splice(0)) ws.terminate()
  await Promise.all(started.splice(0).map((s) => s.close()))
  vi.restoreAllMocks()
})

const serve = async (options: Partial<NodeOptions> = {}) => {
  const server = await startServer({ publicDir, port: 0, host: '127.0.0.1', settings: { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '0' }, drainMs: 500, ...options })
  started.push(server)
  return { server, base: `http://127.0.0.1:${server.port}` }
}

interface Client { ws: WebSocket; frames: { t: string; [k: string]: unknown }[]; closed: Promise<{ code: number; reason: string }> }
const connect = (base: string, room = ROOM, origin = base, autoPong = true): Client => {
  const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws2?room=${room}`, { headers: { Origin: origin }, autoPong })
  sockets.push(ws)
  const frames: Client['frames'] = []
  ws.on('message', (data) => { const text = data.toString(); if (text !== 'pong') frames.push(JSON.parse(text)) })
  const closed = new Promise<{ code: number; reason: string }>((resolve) => ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() })))
  ws.on('error', () => { /* the close event carries the outcome */ })
  return { ws, frames, closed }
}
const until = async (test: () => boolean, ms = 3000) => {
  const end = Date.now() + ms
  while (!test()) { if (Date.now() > end) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 10)) }
}
const opened = (c: Client) => until(() => c.frames.some((f) => f.t === 'hist'))

describe('Node adapter: site', () => {
  it('serves the site with the hosted security headers and the CSP hashes of the build', async () => {
    const { base } = await serve()
    const home = await fetch(`${base}/`)
    expect(home.status).toBe(200)
    expect(home.headers.get('content-security-policy')).toContain("'sha256-a'")
    expect(home.headers.get('strict-transport-security')).toBe('max-age=15552000')
    expect(home.headers.get('x-content-type-options')).toBe('nosniff')
    expect((await fetch(`${base}/boards`)).status).toBe(200)
    expect((await fetch(`${base}/healthz`)).headers.get('cache-control')).toBe('no-store')
  })

  it('answers a missing hashed file with an uncacheable non-HTML 404 and an unknown page with the branded one', async () => {
    const { base } = await serve()
    const gone = await fetch(`${base}/_nuxt/gone.js`)
    expect([gone.status, gone.headers.get('cache-control'), gone.headers.get('content-type')]).toEqual([404, 'no-store', 'text/plain; charset=utf-8'])
    const page = await fetch(`${base}/nope`, { headers: { Accept: 'text/html' } })
    expect([page.status, await page.text()]).toEqual([404, expect.stringContaining('branded 404')])
  })

  it('answers HEAD without a body, refuses POST with 405 and a plain request to /ws2 with 426', async () => {
    const { base } = await serve()
    const head = await fetch(`${base}/boards`, { method: 'HEAD' })
    expect([head.status, await head.text()]).toEqual([200, ''])
    expect((await fetch(`${base}/boards`, { method: 'POST', body: 'x' })).status).toBe(405)
    expect((await fetch(`${base}/ws2?room=${ROOM}`)).status).toBe(426)
  })

  it('limits page loads per resolved client address, with the configured header', async () => {
    const { base } = await serve({ settings: { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '2', CLIENT_IP_HEADER: 'X-Real-IP' } })
    const page = (ip: string) => fetch(`${base}/boards`, { headers: { Accept: 'text/html', 'X-Real-IP': ip } }).then((r) => r.status)
    expect([await page('198.51.100.1'), await page('198.51.100.1'), await page('198.51.100.1')]).toEqual([200, 200, 429])
    expect(await page('198.51.100.2')).toBe(200)
  })

  it('reads the settings from the environment', () => {
    expect(settingsFromEnv({ SELF_HOSTED: '1', CLIENT_IP_HEADER: 'X-Forwarded-For', TRUSTED_PROXIES: '2', RATE_LIMIT_PER_MIN: '', ORIGIN_TRIAL_TOKENS: '{"a.example":"t"}' }))
      .toEqual({ SELF_HOSTED: '1', CLIENT_IP_HEADER: 'X-Forwarded-For', TRUSTED_PROXIES: '2', ORIGIN_TRIAL_TOKENS: { 'a.example': 't' } })
  })
})

describe('Node adapter: relay', () => {
  it('runs the room core: welcome, history, peers, fan-out, and ping to pong', async () => {
    const { base } = await serve()
    const a = connect(base)
    await opened(a)
    expect(a.frames[0]).toMatchObject({ t: 'welcome', peers: [expect.any(String)] })
    const b = connect(base)
    await opened(b)
    await until(() => a.frames.filter((f) => f.t === 'peers').length >= 2)
    const env = { v: 2, room: ROOM, id: `01J${'1'.padStart(23, '0')}`, hlc: 1, ct: 'AAAA' }
    a.ws.send(JSON.stringify({ t: 'eph', env }))
    await until(() => b.frames.some((f) => f.t === 'eph'))
    a.ws.send(JSON.stringify({ t: 'pub', envs: [env] }))
    await until(() => b.frames.some((f) => f.t === 'env'))
    const pong = new Promise<string>((resolve) => b.ws.once('message', (d) => resolve(d.toString())))
    b.ws.send('ping')
    expect(await pong).toBe('pong')
    const late = connect(base)
    await opened(late)
    expect(late.frames.find((f) => f.t === 'hist')).toMatchObject({ envs: [env], done: true })
    expect(a.frames.some((f) => f.t === 'eph')).toBe(false)
  })

  it('keeps rooms apart and forgets a room when its last socket leaves', async () => {
    const { base } = await serve()
    const env = { v: 2, room: ROOM, id: `01J${'2'.padStart(23, '0')}`, hlc: 1, ct: 'AAAA' }
    const a = connect(base)
    await opened(a)
    a.ws.send(JSON.stringify({ t: 'pub', envs: [env] }))
    const other = connect(base, 'Zz3dEfGhIjKlMnOpQrStUv')
    await opened(other)
    expect(other.frames.find((f) => f.t === 'hist')).toMatchObject({ envs: [] })
    a.ws.close()
    await a.closed
    const again = connect(base)
    await opened(again)
    expect(again.frames.find((f) => f.t === 'hist')).toMatchObject({ envs: [] })
  })

  it('refuses a foreign origin with 403 and a malformed room with 400, before any socket exists', async () => {
    const { base } = await serve()
    const foreign = connect(base, ROOM, 'https://evil.example')
    const bad = connect(base, 'short')
    const status = (c: Client) => new Promise<number>((resolve) => c.ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0)))
    expect([await status(foreign), await status(bad)]).toEqual([403, 400])
  })

  it('refuses the thirty-first socket with err full then 4008, without counting it', async () => {
    const { base } = await serve({ maxConnectionsPerAddress: 0, maxConnectsPerMinute: 0 })
    const members = Array.from({ length: LIMITS.maxConnections }, () => connect(base))
    await Promise.all(members.map(opened))
    const extra = connect(base)
    expect(await extra.closed).toEqual({ code: 4008, reason: 'Board is full' })
    expect(extra.frames).toEqual([{ t: 'err', code: 'full' }])
    members[0]!.ws.close()
    await members[0]!.closed
    const next = connect(base)
    await opened(next)
    expect(next.frames[0]).toMatchObject({ t: 'welcome' })
  })

  it('closes a socket with 1009 on a message over the frame limit and keeps serving the others', async () => {
    const { base } = await serve()
    const a = connect(base)
    const b = connect(base)
    await Promise.all([opened(a), opened(b)])
    a.ws.send('x'.repeat(MAX_FRAME_BYTES + 1))
    expect((await a.closed).code).toBe(1009)
    await until(() => b.frames.filter((f) => f.t === 'peers').at(-1)?.peers instanceof Array && (b.frames.filter((f) => f.t === 'peers').at(-1)?.peers as string[]).length === 1)
    expect(b.ws.readyState).toBe(WebSocket.OPEN)
  })

  it('closes a binary message with 1009', async () => {
    const { base } = await serve()
    const a = connect(base)
    await opened(a)
    a.ws.send(Buffer.from([1, 2, 3]))
    expect((await a.closed).code).toBe(1009)
  })

  it('caps the sockets open from one address and answers 429', async () => {
    const { base } = await serve({ maxConnectionsPerAddress: 2 })
    const [a, b] = [connect(base), connect(base)]
    await Promise.all([opened(a), opened(b)])
    const third = connect(base)
    const status = await new Promise<number>((resolve) => third.ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0)))
    expect(status).toBe(429)
    a.ws.close()
    await a.closed
    await until(() => true)
    const again = connect(base)
    await opened(again)
  })

  it('limits connection attempts per minute from one address', async () => {
    const { base } = await serve({ maxConnectsPerMinute: 2 })
    const [a, b] = [connect(base), connect(base)]
    await Promise.all([opened(a), opened(b)])
    const third = connect(base)
    expect(await new Promise<number>((resolve) => third.ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0)))).toBe(429)
  })

  it('closes a silent socket after the idle timeout and tells the room', async () => {
    const { base } = await serve({ idle: { pingMs: 60, idleMs: 150 } })
    // The quiet client never answers a ping; the lively one does, without ever sending a frame.
    const quiet = connect(base, ROOM, base, false)
    const lively = connect(base)
    await Promise.all([opened(quiet), opened(lively)])
    const verdict = await quiet.closed
    expect(verdict.code).toBe(1001)
    expect(lively.ws.readyState).toBe(WebSocket.OPEN)
    await until(() => lively.frames.filter((f) => f.t === 'peers').at(-1)?.peers instanceof Array && (lively.frames.filter((f) => f.t === 'peers').at(-1)?.peers as string[]).length === 1, 4000)
  })

  it('closes every socket with 1001 on shutdown and stops listening', async () => {
    const { server, base } = await serve()
    const clients = [connect(base), connect(base), connect(base, 'Zz3dEfGhIjKlMnOpQrStUv')]
    await Promise.all(clients.map(opened))
    await server.close()
    expect((await Promise.all(clients.map((c) => c.closed))).map((c) => c.code)).toEqual([1001, 1001, 1001])
    await expect(fetch(`${base}/healthz`)).rejects.toThrow()
  })
})

describe('Node adapter: logs never carry a URL', () => {
  it('writes event names, short hashes and counts only through a full smoke run', async () => {
    const lines: string[] = []
    const capture = (...args: unknown[]) => { lines.push(args.map(String).join(' ')) }
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'info')]
    const { base } = await serve()
    const mine = connect(base, ROOM)
    await opened(mine)
    for (const spy of spies) spy.mockImplementation(capture)
    // The smoke script reports through its own `log`: keep its output out of the adapter's.
    const failures = await runSmoke(base, { log: () => { /* quiet */ } })
    mine.ws.close()
    await mine.closed
    await new Promise((r) => setTimeout(r, 50))
    expect(failures).toEqual([])
    const adapter = lines.filter((l) => l.startsWith('{'))
    expect(adapter.length).toBeGreaterThanOrEqual(3)
    const text = adapter.join('\n')
    expect(text).not.toContain(ROOM)
    expect(text).not.toMatch(/ws2|room=|\/boards|\/_nuxt|127\.0\.0\.1|https?:|evil/i)
    for (const line of adapter) {
      const entry = JSON.parse(line) as Record<string, unknown>
      expect(Object.keys(entry).every((k) => ['level', 'event', 'rh', 'v', 'n', 'reason', 'port', 'code'].includes(k))).toBe(true)
    }
    expect(adapter.some((l) => l.includes('"ws.open"'))).toBe(true)
  })
})
