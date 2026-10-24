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

export function withSecurityHeaders(res: Response, csp: string): Response {
  const out = new Response(res.body, res)
  const type = out.headers.get('content-type') ?? ''
  if (type.includes('text/html')) {
    out.headers.set('Content-Security-Policy', csp)
    out.headers.set('Cache-Control', 'no-cache')
  }
  out.headers.set('X-Frame-Options', 'DENY')
  out.headers.set('X-Content-Type-Options', 'nosniff')
  out.headers.set('Referrer-Policy', 'no-referrer')
  out.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  out.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()')
  out.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return out
}
