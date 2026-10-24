import { ROOM_ID_RE } from '@retroboard/protocol'
import type { Env } from './env'
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

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    // Protocol v1 (/ws, server-side storage) was removed; old clients get a 404.
    if (url.pathname === '/ws2') return handleSocket(request, env, url)
    if (url.pathname === '/healthz') return new Response('ok', { headers: { 'Cache-Control': 'no-store' } })
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })

    const hashes = await loadCspHashes(env.ASSETS)
    const extra = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/^http/, 'ws')).filter(Boolean)
    const res = await env.ASSETS.fetch(request)
    return withSecurityHeaders(res, buildCsp(hashes, extra), originTrialToken(url.host, env.ORIGIN_TRIAL_TOKENS))
  },
} satisfies ExportedHandler<Env>
