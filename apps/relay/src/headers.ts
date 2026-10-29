export interface CspHashes {
  scripts: string[]
  styles: string[]
}

const EMPTY: CspHashes = { scripts: [], styles: [] }

/** Hashes of the inline scripts and styles Nuxt emits, written by scripts/csp-hashes.mjs at build time. */
let cache: Promise<CspHashes> | null = null
export function loadCspHashes(assets: Fetcher): Promise<CspHashes> {
  cache ??= assets
    .fetch('https://assets.invalid/_csp.json')
    .then((r) => (r.ok ? (r.json() as Promise<CspHashes>) : EMPTY))
    .catch(() => EMPTY)
  return cache
}

export function buildCsp(hashes: CspHashes, extraConnect: string[] = []): string {
  const src = (list: string[]) => list.map((h) => `'${h}'`).join(' ')
  return [
    "default-src 'none'",
    `script-src 'self' ${src(hashes.scripts)}`.trim(),
    `style-src 'self' ${src(hashes.styles)}`.trim(),
    "font-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self' ${extraConnect.join(' ')}`.trim(),
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}

/**
 * Origin trial tokens are bound to one origin, so each host gets its own token
 * (a token for another origin would be ignored by Chrome).
 */
export function originTrialToken(host: string, tokens: Record<string, string> | undefined): string | null {
  return tokens?.[host.toLowerCase()] ?? null
}

/** 6 months, the minimum required by the platform-security spec (browsers ignore HSTS over plain HTTP). */
export const HSTS = 'max-age=15552000'

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/

/**
 * Plain HTTP on a public host is redirected to HTTPS; local development hosts are left alone.
 * A self-hosted container sits behind a TLS-terminating proxy and sees plain HTTP: it sets SELF_HOSTED to skip the redirect.
 */
export function httpsRedirect(url: URL, selfHosted = false): Response | null {
  if (selfHosted || url.protocol !== 'http:' || LOCAL_HOST.test(url.hostname)) return null
  const target = new URL(url)
  target.protocol = 'https:'
  target.port = ''
  return new Response(null, { status: 308, headers: { Location: target.toString(), 'Cache-Control': 'no-store' } })
}

export function withSecurityHeaders(res: Response, csp: string, originTrial: string | null = null): Response {
  const out = new Response(res.body, res)
  const type = out.headers.get('content-type') ?? ''
  if (type.includes('text/html')) {
    out.headers.set('Content-Security-Policy', csp)
    out.headers.set('Cache-Control', 'no-cache')
    if (originTrial) out.headers.set('Origin-Trial', originTrial)
  }
  out.headers.set('Strict-Transport-Security', HSTS)
  out.headers.set('X-Frame-Options', 'DENY')
  out.headers.set('X-Content-Type-Options', 'nosniff')
  out.headers.set('Referrer-Policy', 'no-referrer')
  out.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  out.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()')
  out.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return out
}
