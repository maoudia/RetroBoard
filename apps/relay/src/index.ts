import { ROOM_ID_RE } from '@retroboard/protocol'
import type { Env } from './env'
import { createLimiter, isMaintenance, maintenanceAction, RETRY_AFTER_SECONDS } from './guards'
import { isUnknownAppPath, pickErrorResponse, wantsHtml } from './errors'
import { buildCsp, loadCspHashes, originTrialToken, withSecurityHeaders } from './headers'
import { roomHash } from './logger'
import { isAllowedOrigin } from './origin'

export { RelayRoom } from './relay-room'

async function handleSocket(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 })
  if (!isAllowedOrigin(request.headers.get('Origin'), url, env.ALLOWED_ORIGINS)) {
    return new Response('Forbidden origin', { status: 403 })
  }
  const room = url.searchParams.get('room') ?? ''
  if (!ROOM_ID_RE.test(room)) return new Response('Invalid room', { status: 400 })

  const stub = env.RELAY.get(env.RELAY.idFromName(room))
  const headers = new Headers(request.headers)
  headers.set('x-room-hash', await roomHash(room))
  return stub.fetch(new Request(request.url, { headers, method: 'GET' }))
}

let limiter: ReturnType<typeof createLimiter> | null = null

/** Branded static page with a status and Retry-After, or plain text for non-browser clients. */
async function unavailable(request: Request, env: Env, url: URL, status: number, page: string, text: string): Promise<Response> {
  const shell = await env.ASSETS.fetch(new Request(new URL(page, url), { headers: { Accept: 'text/html' } }))
  const res = pickErrorResponse(request, status, shell.ok ? shell : null, text)
  res.headers.set('Retry-After', String(RETRY_AFTER_SECONDS))
  return withSecurityHeaders(res, buildCsp(await loadCspHashes(env.ASSETS)), null)
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/healthz') return new Response('ok', { headers: { 'Cache-Control': 'no-store' } })
    if (isMaintenance(env.MAINTENANCE)) {
      const action = maintenanceAction(request, url.pathname)
      if (action !== 'pass') return unavailable(request, env, url, 503, '/maintenance', 'Under maintenance')
    }
    if (wantsHtml(request) && !['/busy', '/maintenance'].includes(url.pathname)) {
      const limit = Number(env.RATE_LIMIT_PER_MIN ?? 300)
      limiter ??= createLimiter(limit, 60_000)
      if (!limiter(request.headers.get('CF-Connecting-IP') ?? 'unknown', Date.now())) return unavailable(request, env, url, 429, '/busy', 'Too many requests')
    }
    // Protocol v1 (/ws, server-side storage) was removed; old clients get a 404.
    if (url.pathname === '/ws2') return handleSocket(request, env, url)
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })

    const hashes = await loadCspHashes(env.ASSETS)
    const extra = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/^http/, 'ws')).filter(Boolean)
    let res = await env.ASSETS.fetch(request)
    if (isUnknownAppPath(url.pathname, res)) {
      const shell = await env.ASSETS.fetch(new Request(new URL('/404.html', url), { headers: { Accept: 'text/html' } }))
      res = pickErrorResponse(request, 404, shell.ok ? shell : null, 'Not found')
    }
    return withSecurityHeaders(res, buildCsp(hashes, extra), originTrialToken(url.host, env.ORIGIN_TRIAL_TOKENS))
  },
} satisfies ExportedHandler<Env>
