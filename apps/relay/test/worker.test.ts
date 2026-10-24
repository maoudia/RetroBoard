import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ROOM_ID_RE } from '@retroboard/protocol'
import { buildCsp, originTrialToken, withSecurityHeaders } from '../src/headers'
import { roomHash } from '../src/logger'
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
