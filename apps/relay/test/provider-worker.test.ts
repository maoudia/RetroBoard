import { describe, expect, it } from 'vitest'
import { SYNC_WORKER_ORIGINS, buildCsp, workerCsp } from '../src/core/headers'
import { handleHttp, type HttpDeps, type Settings } from '../src/core/http'

const CLIENT = '11111111-2222-4333-8444-555555555555'

function deps(settings: Settings = {}): HttpDeps {
  return {
    assets: {
      fetch: async (r) => {
        const path = new URL(typeof r === 'string' ? r : r.url).pathname
        if (path === '/_csp.json') return Response.json({ scripts: ['sha256-a'], styles: [] })
        if (path === '/sync/missing.js') return new Response('gone', { status: 404 })
        if (path.endsWith('.js')) return new Response('self.onmessage = () => {}', { headers: { 'Content-Type': 'text/javascript' } })
        if (path.endsWith('.map')) return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
        return new Response('<p>x</p>', { headers: { 'Content-Type': 'text/html' } })
      },
    },
    settings: { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '0', ...settings },
    clientIp: '203.0.113.7',
    relay: async () => new Response('relayed'),
  }
}
const get = (path: string, settings?: Settings) => handleHttp(new Request(`https://retroboard.example${path}`), deps(settings))

describe('provider worker scripts (user-drive-storage, ADR-0039)', () => {
  it('serves /sync/onedrive.js with a policy of its own: the provider origins, nothing else, and revalidation on every load', async () => {
    const res = await get('/sync/onedrive.js')
    const csp = res.headers.get('Content-Security-Policy')!
    expect(csp).toBe("default-src 'none'; connect-src https://login.microsoftonline.com https://graph.microsoft.com https://*.up.1drv.com https://*.files.1drv.com")
    expect(csp).not.toContain("'self'")
    expect(csp).not.toContain('sha256')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('adds the fake provider origin of the e2e harness to the worker policy only, never to the page policy', async () => {
    const settings = { FAKE_PROVIDER_ORIGINS: 'http://127.0.0.1:8788' }
    expect((await get('/sync/onedrive.js', settings)).headers.get('Content-Security-Policy')).toMatch(/\*\.files\.1drv\.com http:\/\/127\.0\.0\.1:8788$/)
    const page = (await get('/boards', settings)).headers.get('Content-Security-Policy')!
    expect(page).toBe(buildCsp({ scripts: ['sha256-a'], styles: [] }))
    expect(page).not.toContain('127.0.0.1')
    expect(page).not.toContain('1drv')
    expect(page).not.toContain('microsoft')
  })

  it('gives no policy to any other script or path, and none to an error', async () => {
    for (const path of ['/sync/other.js', '/_nuxt/entry.abc.js', '/sync/onedrive.js.map', '/sync/', '/sync/missing.js']) {
      const res = await get(path)
      expect([path, res.headers.get('Content-Security-Policy')]).toEqual([path, null])
    }
    expect(workerCsp('/sync/other.js')).toBeNull()
    expect(Object.keys(SYNC_WORKER_ORIGINS)).toEqual(['/sync/onedrive.js'])
  })
})

describe('/providers.json', () => {
  it('offers nothing without a client id, or with one that is not a GUID', async () => {
    for (const ONEDRIVE_CLIENT_ID of [undefined, '', '   ', 'not-a-guid', `${CLIENT}/../x`]) {
      const res = await get('/providers.json', ONEDRIVE_CLIENT_ID === undefined ? {} : { ONEDRIVE_CLIENT_ID })
      expect([res.status, await res.json(), res.headers.get('Cache-Control')]).toEqual([200, {}, 'no-store'])
    }
  })

  it('offers OneDrive with the public client id of the deployment, on the Microsoft endpoints', async () => {
    const res = await get('/providers.json', { ONEDRIVE_CLIENT_ID: ` ${CLIENT} ` })
    expect(await res.json()).toEqual({ onedrive: { clientId: CLIENT } })
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('points the endpoints at the fake provider only where the harness configured one', async () => {
    const res = await get('/providers.json', { ONEDRIVE_CLIENT_ID: CLIENT, FAKE_PROVIDER_ORIGINS: 'http://127.0.0.1:8788, http://other' })
    expect(await res.json()).toEqual({ onedrive: { clientId: CLIENT, authority: 'http://127.0.0.1:8788/consumers', graph: 'http://127.0.0.1:8788/v1.0' } })
  })

  it('answers HEAD without a body', async () => {
    const res = await handleHttp(new Request('https://retroboard.example/providers.json', { method: 'HEAD' }), deps())
    expect([res.status, await res.text()]).toEqual([200, ''])
  })
})
