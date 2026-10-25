import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ROOM_ID_RE } from '@retroboard/protocol'
import { buildCsp, HSTS, httpsRedirect, originTrialToken, withSecurityHeaders } from '../src/headers'
import { roomHash } from '../src/logger'
import { isUnknownAppPath, pickErrorResponse } from '../src/errors'
import { createLimiter, isMaintenance, maintenanceAction } from '../src/guards'
import { isAllowedOrigin } from '../src/origin'

describe('isAllowedOrigin', () => {
  const url = new URL('https://retroboard.example.workers.dev/ws?room=x')
  it('accepts the site itself and listed origins only', () => {
    expect(isAllowedOrigin('https://retroboard.example.workers.dev', url, undefined)).toBe(true)
    expect(isAllowedOrigin('https://evil.example', url, undefined)).toBe(false)
    expect(isAllowedOrigin('https://app.example.com', url, 'https://x.io, https://app.example.com')).toBe(true)
    expect(isAllowedOrigin(null, url, undefined)).toBe(false)
    expect(isAllowedOrigin('not a url', url, undefined)).toBe(false)
  })
})

describe('room ids', () => {
  it('accept url-safe 22 to 64 chars only', () => {
    expect(ROOM_ID_RE.test('a'.repeat(22))).toBe(true)
    expect(ROOM_ID_RE.test('a'.repeat(21))).toBe(false)
    expect(ROOM_ID_RE.test('a'.repeat(22) + '/../')).toBe(false)
  })
  it('hash to a short tag that does not reveal the id', async () => {
    const h = await roomHash('a'.repeat(22))
    expect(h).toMatch(/^[0-9a-f]{8}$/)
    expect(h).not.toContain('aaaa')
  })
})

describe('security headers', () => {
  it('builds a strict CSP with the build hashes', () => {
    const csp = buildCsp({ scripts: ['sha256-AAA'], styles: ['sha256-BBB'] })
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("script-src 'self' 'sha256-AAA'")
    expect(csp).toContain("style-src 'self' 'sha256-BBB'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('unsafe-')
  })
  it('adds the CSP to html only, other headers to everything', () => {
    const html = withSecurityHeaders(new Response('<p>', { headers: { 'content-type': 'text/html' } }), 'default-src none')
    const js = withSecurityHeaders(new Response('x', { headers: { 'content-type': 'text/javascript' } }), 'default-src none')
    expect(html.headers.get('Content-Security-Policy')).toBe('default-src none')
    expect(js.headers.get('Content-Security-Policy')).toBeNull()
    for (const r of [html, js]) {
      expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(r.headers.get('Referrer-Policy')).toBe('no-referrer')
      expect(r.headers.get('X-Frame-Options')).toBe('DENY')
      expect(r.headers.get('Strict-Transport-Security')).toBe(HSTS)
    }
    expect(Number(HSTS.match(/max-age=(\d+)/)?.[1])).toBeGreaterThanOrEqual(15552000)
  })
  it('redirects plain HTTP on public hosts only', () => {
    const res = httpsRedirect(new URL('http://retroboard.maoudia.com:80/board?x=1'))
    expect(res?.status).toBe(308)
    expect(res?.headers.get('Location')).toBe('https://retroboard.maoudia.com/board?x=1')
    expect(httpsRedirect(new URL('https://retroboard.maoudia.com/'))).toBeNull()
    for (const local of ['http://localhost:8787/', 'http://127.0.0.1:8787/', 'http://[::1]:8787/', 'http://a.localhost/']) {
      expect(httpsRedirect(new URL(local))).toBeNull()
    }
  })
})

describe('origin trial (WebMCP)', () => {
  const tokens = { 'retroboard.maoudia.com': 'TOKEN-PROD', 'retroboard-dev.maoudia.com': 'TOKEN-DEV' }

  it('picks the token of the request host only', () => {
    expect(originTrialToken('retroboard.maoudia.com', tokens)).toBe('TOKEN-PROD')
    expect(originTrialToken('RETROBOARD-DEV.maoudia.com', tokens)).toBe('TOKEN-DEV')
    expect(originTrialToken('localhost:8787', tokens)).toBeNull()
    expect(originTrialToken('retroboard.maoudia.com', undefined)).toBeNull()
  })

  it('adds the Origin-Trial header to HTML only', () => {
    const html = withSecurityHeaders(new Response('<p>', { headers: { 'content-type': 'text/html' } }), 'x', 'TOKEN-PROD')
    const js = withSecurityHeaders(new Response('x', { headers: { 'content-type': 'text/javascript' } }), 'x', 'TOKEN-PROD')
    expect(html.headers.get('Origin-Trial')).toBe('TOKEN-PROD')
    expect(js.headers.get('Origin-Trial')).toBeNull()
  })

  it('wrangler config holds one token per registered origin, matching its host', () => {
    const raw = readFileSync(fileURLToPath(new URL('../../../wrangler.jsonc', import.meta.url).href), 'utf8')
    const block = raw.slice(raw.indexOf('"ORIGIN_TRIAL_TOKENS"'))
    const pairs = [...block.matchAll(/"([a-z0-9.-]+)":\s*"([A-Za-z0-9+/=]+)"/g)].slice(0, 3)
    expect(pairs).toHaveLength(3)
    for (const [, host, token] of pairs) {
      const payload = Buffer.from(token!, 'base64').toString('latin1')
      expect(payload).toContain(`"origin":"https://${host}:443"`)
      expect(payload).toContain('"feature":"WebMCP"')
    }
  })
})

describe('error responses', () => {
  const html = new Response('<html>', { headers: { 'content-type': 'text/html' } })
  const nav = (accept: string, extra: Record<string, string> = {}) => new Request('https://x.test/nope', { headers: { Accept: accept, ...extra } })
  it('knows the app routes and flags only html answers for unknown ones', () => {
    expect(isUnknownAppPath('/new/', html)).toBe(false)
    expect(isUnknownAppPath('/nwe', html)).toBe(true)
    expect(isUnknownAppPath('/robots.txt', new Response('x', { headers: { 'content-type': 'text/plain' } }))).toBe(false)
  })
  it('sends html to browsers and text to scripts with the same status', async () => {
    const branded = pickErrorResponse(nav('text/html,*/*'), 404, new Response('<h1>404</h1>'), 'Not found')
    const script = pickErrorResponse(nav('application/json'), 404, new Response('<h1>404</h1>'), 'Not found')
    expect([branded.status, script.status]).toEqual([404, 404])
    expect(branded.headers.get('content-type')).toContain('text/html')
    expect(await script.text()).toBe('Not found')
    expect(script.headers.get('content-type')).toContain('text/plain')
  })
  it('falls back to text when the branded page is missing', async () => {
    expect(await pickErrorResponse(nav('text/html'), 404, null, 'Not found').text()).toBe('Not found')
  })
})

describe('maintenance and rate limit', () => {
  const nav = (path: string) => new Request(`https://x.test${path}`, { headers: { Accept: 'text/html' } })
  it('reads the MAINTENANCE switch', () => {
    expect([isMaintenance('1'), isMaintenance('true'), isMaintenance('0'), isMaintenance(undefined)]).toEqual([true, true, false, false])
  })
  it('blocks pages and sockets but spares health, legal pages and assets', () => {
    expect(maintenanceAction(nav('/board'), '/board')).toBe('page')
    expect(maintenanceAction(new Request('https://x.test/ws2'), '/ws2')).toBe('text')
    expect(maintenanceAction(nav('/healthz'), '/healthz')).toBe('pass')
    expect(maintenanceAction(nav('/legal/'), '/legal/')).toBe('pass')
    expect(maintenanceAction(new Request('https://x.test/_nuxt/a.js'), '/_nuxt/a.js')).toBe('pass')
  })
  it('limits one client per window and forgets old hits', () => {
    const allow = createLimiter(2, 1000)
    expect([allow('a', 0), allow('a', 10), allow('a', 20)]).toEqual([true, true, false])
    expect(allow('b', 30)).toBe(true)
    expect(allow('a', 2000)).toBe(true)
    expect(createLimiter(0, 1000)('a', 0)).toBe(true)
  })
})
