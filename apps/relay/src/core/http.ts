import type { ClientIpSettings } from './client-ip'
import { isUnknownAppPath, pickErrorResponse, wantsHtml } from './errors'
import { createLimiter, isMaintenance, maintenanceAction, RETRY_AFTER_SECONDS } from './guards'
import { type AssetsPort, buildCsp, httpsRedirect, loadCspHashes, originTrialToken, withSecurityHeaders } from './headers'
import { consoleLogger, roomHash } from './logger'
import { admitUpgrade } from './origin'

/** The deployment settings the HTTP handler reads. */
export interface Settings extends ClientIpSettings {
  /** Extra allowed WebSocket origins, comma separated (local dev with `nuxt dev`). */
  ALLOWED_ORIGINS?: string
  /** "1" switches the site to maintenance mode (503 + Retry-After). */
  MAINTENANCE?: string
  /** HTML navigations allowed per client and minute before the "too many requests" page. 0 disables. Default 300. */
  RATE_LIMIT_PER_MIN?: string
  /** "1" in the container image: TLS ends at a reverse proxy, so plain HTTP is not redirected to HTTPS. */
  SELF_HOSTED?: string
  /** Chrome origin trial tokens keyed by host (WebMCP). Public values, not secrets. */
  ORIGIN_TRIAL_TOKENS?: Record<string, string>
}

/** What a runtime provides to the handler. */
export interface HttpDeps {
  assets: AssetsPort
  settings: Settings
  /** The client address as the adapter resolved it (see clientIp); null when unknown. */
  clientIp: string | null
  /** Hand an admitted WebSocket upgrade to the room: `room` is the room id, `rh` its short hash. */
  relay: (request: Request, room: string, rh: string) => Promise<Response>
}

async function handleSocket(request: Request, deps: HttpDeps, url: URL): Promise<Response> {
  const verdict = admitUpgrade(request.headers.get('Upgrade'), request.headers.get('Origin'), url, deps.settings.ALLOWED_ORIGINS)
  if (!verdict.ok) {
    // Content-free (see logger.ts): the reason only, never the origin or the room id.
    if (verdict.reason !== 'upgrade') consoleLogger.warn('ws.reject', { reason: verdict.reason })
    return new Response(verdict.text, { status: verdict.status })
  }
  return deps.relay(request, verdict.room, await roomHash(verdict.room))
}

/** One counter per configured limit, in memory for the life of the process or isolate (the limit does not change while it runs). */
const limiters = new Map<number, ReturnType<typeof createLimiter>>()

/** Branded static page with a status and Retry-After, or plain text for non-browser clients. */
async function unavailable(request: Request, deps: HttpDeps, url: URL, status: number, page: string, text: string): Promise<Response> {
  const shell = await deps.assets.fetch(new Request(new URL(page, url), { headers: { Accept: 'text/html' } }))
  const res = pickErrorResponse(request, status, shell.ok ? shell : null, text)
  res.headers.set('Retry-After', String(RETRY_AFTER_SECONDS))
  return withSecurityHeaders(res, buildCsp(await loadCspHashes(deps.assets)), null)
}

/** The whole site over an assets port and a relay callback: redirect, health, maintenance, page limit, relay, assets, errors, headers. */
export async function handleHttp(request: Request, deps: HttpDeps): Promise<Response> {
  const { settings } = deps
  const url = new URL(request.url)
  const insecure = httpsRedirect(url, settings.SELF_HOSTED === '1')
  if (insecure) return insecure
  if (url.pathname === '/healthz') return new Response('ok', { headers: { 'Cache-Control': 'no-store' } })
  if (isMaintenance(settings.MAINTENANCE)) {
    const action = maintenanceAction(request, url.pathname)
    if (action !== 'pass') return unavailable(request, deps, url, 503, '/maintenance', 'Under maintenance')
  }
  if (wantsHtml(request) && !['/busy', '/maintenance'].includes(url.pathname)) {
    const limit = Number(settings.RATE_LIMIT_PER_MIN ?? 300)
    let limiter = limiters.get(limit)
    if (!limiter) limiters.set(limit, limiter = createLimiter(limit, 60_000))
    if (!limiter(deps.clientIp ?? 'unknown', Date.now())) return unavailable(request, deps, url, 429, '/busy', 'Too many requests')
  }
  // Protocol v1 (/ws, server-side storage) was removed; old clients get a 404.
  if (url.pathname === '/ws2') return handleSocket(request, deps, url)
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })

  const hashes = await loadCspHashes(deps.assets)
  const extra = (settings.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/^http/, 'ws')).filter(Boolean)
  let res = await deps.assets.fetch(request)
  // The asset layer answers 404 itself (not_found_handling "none"); an unknown path still gets the branded page.
  if (res.status === 404 || isUnknownAppPath(url.pathname, res)) {
    const shell = await deps.assets.fetch(new Request(new URL('/404.html', url), { headers: { Accept: 'text/html' } }))
    res = pickErrorResponse(request, 404, shell.ok ? shell : null, 'Not found')
  }
  return withSecurityHeaders(res, buildCsp(hashes, extra), originTrialToken(url.host, settings.ORIGIN_TRIAL_TOKENS))
}
