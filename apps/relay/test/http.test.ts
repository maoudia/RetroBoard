import { describe, expect, it } from 'vitest'
import { handleHttp, type HttpDeps, type Settings } from '../src/core/http'

const ROOM = 'a'.repeat(22)
const html = (path: string, headers: Record<string, string> = {}) => new Request(`https://retroboard.example${path}`, { headers: { Accept: 'text/html', ...headers } })

function deps(over: Partial<HttpDeps> & { settings?: Settings } = {}) {
  const calls: { relay: { room: string; rh: string; method: string; url: string }[]; assets: string[] } = { relay: [], assets: [] }
  const d: HttpDeps = {
    assets: {
      fetch: async (r) => {
        const path = new URL(typeof r === 'string' ? r : r.url).pathname
        calls.assets.push(path)
        if (path === '/_csp.json') return Response.json({ scripts: ['sha256-a'], styles: [] })
        if (path === '/404.html') return new Response('<h1>nope</h1>', { headers: { 'Content-Type': 'text/html' } })
        if (path === '/missing') return new Response('gone', { status: 404 })
        return new Response(`<p>${path}</p>`, { headers: { 'Content-Type': 'text/html' } })
      },
    },
    settings: { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '0' },
    clientIp: '203.0.113.7',
    relay: async (request, room, rh) => {
      calls.relay.push({ room, rh, method: request.method, url: request.url })
      return new Response('relayed', { status: 200 })
    },
    ...over,
  }
  return { d, calls }
}

describe('handleHttp', () => {
  it('answers the health probe without touching assets', async () => {
    const { d, calls } = deps()
    const res = await handleHttp(new Request('https://retroboard.example/healthz'), d)
    expect([res.status, await res.text(), res.headers.get('Cache-Control')]).toEqual([200, 'ok', 'no-store'])
    expect(calls.assets).toEqual([])
  })

  it('serves an asset with the security headers and the CSP hashes of the build', async () => {
    const { d } = deps()
    const res = await handleHttp(html('/boards'), d)
    expect(await res.text()).toBe('<p>/boards</p>')
    expect(res.headers.get('Content-Security-Policy')).toContain("'sha256-a'")
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('answers a missing file with the branded 404', async () => {
    const res = await handleHttp(html('/missing'), deps().d)
    expect(res.status).toBe(404)
    expect(await res.text()).toContain('nope')
  })

  it('refuses methods other than GET and HEAD', async () => {
    const res = await handleHttp(new Request('https://retroboard.example/boards', { method: 'POST' }), deps().d)
    expect(res.status).toBe(405)
  })

  it('redirects plain http unless self-hosted', async () => {
    const plain = new Request('http://retroboard.example/boards')
    expect((await handleHttp(plain, deps({ settings: {} }).d)).status).toBe(308)
    expect((await handleHttp(plain, deps().d)).status).toBe(200)
  })

  it('hands an admitted upgrade to the relay with the room and its short hash, as a plain GET', async () => {
    const { d, calls } = deps()
    const res = await handleHttp(new Request(`https://retroboard.example/ws2?room=${ROOM}`, { headers: { Upgrade: 'websocket', Origin: 'https://retroboard.example' } }), d)
    expect(await res.text()).toBe('relayed')
    expect(calls.relay).toHaveLength(1)
    expect(calls.relay[0]).toMatchObject({ room: ROOM, method: 'GET' })
    expect(calls.relay[0]?.rh).toMatch(/^[0-9a-f]{8}$/)
  })

  it('refuses an upgrade from a foreign origin or without a room, before the relay', async () => {
    const { d, calls } = deps()
    const foreign = await handleHttp(new Request(`https://retroboard.example/ws2?room=${ROOM}`, { headers: { Upgrade: 'websocket', Origin: 'https://evil.example' } }), d)
    expect(foreign.status).toBe(403)
    const noRoom = await handleHttp(new Request('https://retroboard.example/ws2', { headers: { Upgrade: 'websocket', Origin: 'https://retroboard.example' } }), d)
    expect(noRoom.status).toBe(400)
    expect(calls.relay).toEqual([])
  })

  it('answers 503 during maintenance except for exempt pages', async () => {
    const { d } = deps({ settings: { SELF_HOSTED: '1', MAINTENANCE: '1' } })
    const down = await handleHttp(html('/boards'), d)
    expect([down.status, down.headers.get('Retry-After')]).toEqual([503, '30'])
    expect((await handleHttp(html('/legal'), d)).status).toBe(200)
  })

  it('limits page loads per client address, keyed on the address the adapter resolved', async () => {
    const settings = { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '2' }
    const a = deps({ settings, clientIp: '198.51.100.1' }).d
    const b = deps({ settings, clientIp: '198.51.100.2' }).d
    expect((await handleHttp(html('/boards'), a)).status).toBe(200)
    expect((await handleHttp(html('/boards'), a)).status).toBe(200)
    const limited = await handleHttp(html('/boards'), a)
    expect([limited.status, limited.headers.get('Retry-After')]).toEqual([429, '30'])
    expect((await handleHttp(html('/boards'), b)).status).toBe(200)
  })
})
