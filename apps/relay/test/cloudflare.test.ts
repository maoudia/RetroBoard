import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LIMITS } from '@retroboard/domain'

vi.mock('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(readonly ctx: unknown, readonly env: unknown) {}
  },
}))

const ROOM = 'Ab3dEfGhIjKlMnOpQrStUv'

/** A socket of the Workers runtime: sent frames, the close, and the serialized attachment. */
class FakeSocket {
  sent: string[] = []
  closed: { code?: number; reason?: string } | null = null
  accepted = false
  attachment: unknown = null
  failClose = false
  send(text: string) { this.sent.push(text) }
  close(code?: number, reason?: string) {
    if (this.failClose) throw new Error('already closed')
    this.closed = { code, reason }
  }
  accept() { this.accepted = true }
  serializeAttachment(value: unknown) { this.attachment = structuredClone(value) }
  deserializeAttachment() { return this.attachment }
  frames() { return this.sent.map((s) => JSON.parse(s) as { t: string }) }
}

class FakeContext {
  sockets: FakeSocket[] = []
  autoResponse: unknown = null
  setWebSocketAutoResponse(pair: unknown) { this.autoResponse = pair }
  getWebSockets() { return this.sockets }
  acceptWebSocket(ws: FakeSocket) { this.sockets.push(ws) }
}

let pairs: { client: FakeSocket; server: FakeSocket }[] = []

beforeEach(() => {
  pairs = []
  vi.stubGlobal('WebSocketRequestResponsePair', class { constructor(readonly request: string, readonly response: string) {} })
  vi.stubGlobal('WebSocketPair', class {
    0: FakeSocket
    1: FakeSocket
    constructor() {
      const pair = { client: new FakeSocket(), server: new FakeSocket() }
      pairs.push(pair)
      this[0] = pair.client
      this[1] = pair.server
    }
  })
  // The runtime answers an upgrade with status 101 and a socket; Node's Response refuses both.
  vi.stubGlobal('Response', class {
    readonly status: number
    readonly webSocket: unknown
    constructor(readonly body: unknown, init: { status?: number; webSocket?: unknown } = {}) {
      this.status = init.status ?? 200
      this.webSocket = init.webSocket
    }
    text() { return Promise.resolve(String(this.body)) }
  })
})
afterEach(() => { vi.unstubAllGlobals() })

async function room() {
  const { RelayRoom } = await import('../src/adapters/cloudflare')
  const ctx = new FakeContext()
  const object = new RelayRoom(ctx as unknown as DurableObjectState, {} as never)
  const upgrade = (headers: Record<string, string> = { Upgrade: 'websocket' }, url = `https://relay.invalid/ws2?room=${ROOM}`) => object.fetch(new Request(url, { headers }))
  return { object, ctx, upgrade }
}

describe('RelayRoom (Cloudflare adapter)', () => {
  it('answers ping with pong without waking the object', async () => {
    const { ctx } = await room()
    expect(ctx.autoResponse).toMatchObject({ request: 'ping', response: 'pong' })
  })

  it('refuses a request that is not a WebSocket upgrade', async () => {
    const { upgrade } = await room()
    const res = await upgrade({})
    expect([res.status, await res.text()]).toEqual([426, 'Expected WebSocket'])
  })

  it('accepts a hibernatable socket and welcomes it, with the room hash it was handed', async () => {
    const { ctx, upgrade } = await room()
    const res = await upgrade({ Upgrade: 'websocket', 'x-room-hash': 'rh01' })
    const { client, server } = pairs[0]!
    expect(res).toMatchObject({ status: 101, webSocket: client })
    expect(ctx.sockets).toEqual([server])
    expect(server.accepted).toBe(false)
    expect(server.attachment).toMatchObject({ rh: 'rh01', room: ROOM })
    expect(server.frames().map((f) => f.t)).toEqual(['welcome', 'hist', 'peers'])
  })

  it('defaults the room hash and the room when the request does not carry them', async () => {
    const { upgrade } = await room()
    await upgrade({ Upgrade: 'websocket' }, 'https://relay.invalid/ws2')
    expect(pairs[0]!.server.attachment).toMatchObject({ rh: 'unknown', room: '' })
  })

  it('carries only the refusal on a socket it does not keep when the room is full', async () => {
    const { ctx, upgrade } = await room()
    for (let i = 0; i < LIMITS.maxConnections; i++) ctx.sockets.push(new FakeSocket())
    const res = await upgrade()
    const { client, server } = pairs[0]!
    expect(res).toMatchObject({ status: 101, webSocket: client })
    expect(server.accepted).toBe(true)
    expect(ctx.sockets).not.toContain(server)
    expect(server.frames()).toEqual([{ t: 'err', code: 'full' }])
    expect(server.closed).toEqual({ code: 4008, reason: 'Board is full' })
  })

  it('hands a message to the room, string or binary', async () => {
    const { object, upgrade } = await room()
    await upgrade()
    const server = pairs[0]!.server
    await object.webSocketMessage(server as unknown as WebSocket, 'not json')
    expect(server.frames().at(-1)).toEqual({ t: 'err', code: 'invalid' })
  })

  it('closes with the code it was given, mapping the reserved "no status" to a normal close, and leaves the room', async () => {
    const { object, upgrade } = await room()
    await upgrade()
    await upgrade()
    const [a, b] = [pairs[0]!.server, pairs[1]!.server]
    object.webSocketClose(a as unknown as WebSocket, 1005)
    expect(a.closed).toEqual({ code: 1000, reason: undefined })
    expect(b.frames().at(-1)).toMatchObject({ t: 'peers' })
    object.webSocketClose(b as unknown as WebSocket, 4000)
    expect(b.closed).toEqual({ code: 4000, reason: undefined })
  })

  it('tolerates a socket that is already closed', async () => {
    const { object, upgrade } = await room()
    await upgrade()
    const server = pairs[0]!.server
    server.failClose = true
    expect(() => object.webSocketClose(server as unknown as WebSocket, 1001)).not.toThrow()
  })

  it('leaves the room on a socket error', async () => {
    const { object, ctx, upgrade } = await room()
    await upgrade()
    await upgrade()
    ctx.sockets = [pairs[1]!.server]
    object.webSocketError(pairs[0]!.server as unknown as WebSocket)
    expect(pairs[1]!.server.frames().at(-1)).toEqual({ t: 'peers', peers: [expect.any(String)] })
  })
})

describe('Worker entry', () => {
  it('serves the site over the assets binding and forwards an admitted upgrade to the room object by name, with the room hash', async () => {
    const forwarded: { name: string; request: Request }[] = []
    const env = {
      SELF_HOSTED: '1',
      RATE_LIMIT_PER_MIN: '0',
      CLIENT_IP_HEADER: 'CF-Connecting-IP',
      ASSETS: { fetch: async () => new Response('<p>site</p>') },
      RELAY: {
        idFromName: (name: string) => ({ name }),
        get: (id: { name: string }) => ({ fetch: async (request: Request) => { forwarded.push({ name: id.name, request }); return new Response('relayed') } }),
      },
    }
    vi.unstubAllGlobals()
    const { default: worker, RelayRoom } = await import('../src/index')
    expect(RelayRoom).toBeTypeOf('function')
    const res = await worker.fetch(new Request('https://retroboard.example/healthz', { headers: { 'CF-Connecting-IP': '203.0.113.7' } }) as never, env as never)
    expect(await res.text()).toBe('ok')
    const upgrade = await worker.fetch(new Request(`https://retroboard.example/ws2?room=${ROOM}`, { headers: { Upgrade: 'websocket', Origin: 'https://retroboard.example' } }) as never, env as never)
    expect(await upgrade.text()).toBe('relayed')
    expect(forwarded).toHaveLength(1)
    expect(forwarded[0]!.name).toBe(ROOM)
    expect(forwarded[0]!.request.headers.get('x-room-hash')).toMatch(/\S/)
    expect(forwarded[0]!.request.method).toBe('GET')
    expect(forwarded[0]!.request.url).toBe(`https://retroboard.example/ws2?room=${ROOM}`)
  })
})
