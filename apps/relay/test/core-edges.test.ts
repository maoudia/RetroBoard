import { describe, expect, it, vi } from 'vitest'
import { clientIp } from '../src/core/client-ip'
import { isUnknownAppPath, normalizePath, pickErrorResponse, wantsHtml } from '../src/core/errors'
import { createLimiter, isMaintenance, maintenanceAction } from '../src/core/guards'
import { type AssetsPort, withSecurityHeaders } from '../src/core/headers'
import { handleHttp, type HttpDeps } from '../src/core/http'
import { providersResponse } from '../src/core/providers'

describe('client address edges', () => {
  it('falls back to the socket address when a header that survives normalisation is blank', () => {
    const blank = { headers: { get: () => '   ' } } as unknown as Request
    expect(clientIp(blank, { CLIENT_IP_HEADER: 'CF-Connecting-IP' }, '10.0.0.1')).toBe('10.0.0.1')
  })
})

describe('error pages edges', () => {
  it('collapses a path made of slashes to the root', () => {
    expect(normalizePath('//')).toBe('/')
    expect(normalizePath('/boards/')).toBe('/boards')
    expect(normalizePath('/')).toBe('/')
  })

  it('does not call a response without a content type the app shell', () => {
    expect(isUnknownAppPath('/nowhere', new Response(null))).toBe(false)
  })

  it('treats a navigation as a request for a page, with or without an Accept header', () => {
    expect(wantsHtml(new Request('https://x.test/', { headers: { 'Sec-Fetch-Mode': 'navigate' } }))).toBe(true)
    expect(wantsHtml(new Request('https://x.test/'))).toBe(false)
  })

  it('answers a HEAD without a body, for the branded page and for the text', async () => {
    const head = new Request('https://x.test/', { method: 'HEAD', headers: { Accept: 'text/html' } })
    const page = pickErrorResponse(head, 404, new Response('<h1>nope</h1>'), 'Not found')
    expect([page.status, page.headers.get('content-type'), await page.text()]).toEqual([404, 'text/html; charset=utf-8', ''])
    const text = pickErrorResponse(new Request('https://x.test/', { method: 'HEAD' }), 404, null, 'Not found')
    expect([text.status, text.headers.get('content-type'), await text.text()]).toEqual([404, 'text/plain; charset=utf-8', ''])
  })
})

describe('guards edges', () => {
  it('reads an unset maintenance flag as off', () => {
    expect(isMaintenance(undefined)).toBe(false)
    expect(isMaintenance('TRUE')).toBe(true)
  })

  it('sends a navigation to the root to the maintenance page, and lets other requests through', () => {
    expect(maintenanceAction(new Request('https://x.test/', { headers: { Accept: 'text/html' } }), '/')).toBe('page')
    expect(maintenanceAction(new Request('https://x.test/'), '/')).toBe('pass')
  })

  it('forgets idle clients once the table is large', () => {
    const allow = createLimiter(5, 1000)
    for (let i = 0; i < 5001; i++) allow(`client${i}`, 0)
    // Every earlier client is outside the window: the sweep drops them, the newcomer is counted alone.
    expect(allow('newcomer', 5000)).toBe(true)
    expect(allow('client0', 5000)).toBe(true)
  })

  it('keeps a client that is still inside its window when the table is swept', () => {
    const allow = createLimiter(1, 1000)
    for (let i = 0; i < 5000; i++) allow(`client${i}`, 0)
    expect(allow('busy', 900)).toBe(true)
    expect(allow('busy', 950)).toBe(false)
    expect(allow('busy', 1050)).toBe(false)
  })
})

describe('security headers edges', () => {
  it('leaves a response without a content type as it is, headers aside', () => {
    const out = withSecurityHeaders(new Response(null, { status: 204 }), "default-src 'self'")
    expect(out.status).toBe(204)
    expect(out.headers.get('Content-Security-Policy')).toBeNull()
    expect(out.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })
})

describe('CSP hashes of the build', () => {
  const load = async (assets: AssetsPort) => {
    vi.resetModules()
    const { loadCspHashes } = await import('../src/core/headers')
    return loadCspHashes(assets)
  }

  it('are empty when the asset layer answers an error', async () => {
    expect(await load({ fetch: async () => new Response('no', { status: 404 }) })).toEqual({ scripts: [], styles: [] })
  })

  it('are empty when the asset layer fails', async () => {
    expect(await load({ fetch: async () => { throw new Error('down') } })).toEqual({ scripts: [], styles: [] })
  })
})

describe('provider settings edges', () => {
  it('offers no fake endpoints for a blank list', async () => {
    const body = await providersResponse({ ONEDRIVE_CLIENT_ID: '11111111-2222-3333-4444-555555555555', FAKE_PROVIDER_ORIGINS: '' }, false).json()
    expect(body).toEqual({ onedrive: { clientId: '11111111-2222-3333-4444-555555555555' } })
  })
})

describe('handleHttp edges', () => {
  const deps = (over: Partial<HttpDeps> = {}): HttpDeps => ({
    assets: { fetch: async (r) => new Response(new URL(typeof r === 'string' ? r : r.url).pathname === '/_csp.json' ? '{"scripts":[],"styles":[]}' : 'gone', { status: new URL(typeof r === 'string' ? r : r.url).pathname === '/_csp.json' ? 200 : 404 }) },
    settings: { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '1' },
    clientIp: null,
    relay: async () => new Response('relayed'),
    ...over,
  })

  it('counts every client of an unknown address together for the page limit', async () => {
    const d = deps()
    const get = () => handleHttp(new Request('https://retroboard.example/boards', { headers: { Accept: 'text/html' } }), d)
    expect((await get()).status).toBe(404)
    expect((await get()).status).toBe(429)
  })

  it('answers a missing page in plain text when the branded one is not available either', async () => {
    const res = await handleHttp(new Request('https://retroboard.example/nowhere', { headers: { Accept: 'text/html' } }), deps({ settings: { SELF_HOSTED: '1', RATE_LIMIT_PER_MIN: '0' } }))
    expect([res.status, res.headers.get('content-type'), await res.text()]).toEqual([404, 'text/plain; charset=utf-8', 'Not found'])
  })
})
