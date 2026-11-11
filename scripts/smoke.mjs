#!/usr/bin/env node
// Production smoke test: node scripts/smoke.mjs https://retroboard.maoudia.com
// `runSmoke` takes its network pieces as dependencies so the checks themselves are unit tested (scripts/ci/test/smoke.test.ts).
import http from 'node:http'
import https from 'node:https'
import { randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const WAIT_MS = 5000

/** HTTP status of a WebSocket upgrade request carrying the given Origin (0 when nothing answered). */
function upgradeStatus(base, room, origin) {
  return new Promise((resolve) => {
    const url = new URL(`${base}/ws2?room=${room}`)
    const req = (url.protocol === 'https:' ? https : http).request(url, {
      headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64'), Origin: origin },
      timeout: WAIT_MS,
    })
    req.on('response', (res) => { res.resume(); resolve(res.statusCode) })
    req.on('upgrade', (res, socket) => { socket.destroy(); resolve(res.statusCode) })
    req.on('timeout', () => { req.destroy(); resolve(0) })
    req.on('error', () => resolve(0))
    req.end()
  })
}

/** One relay connection that records the type of every frame it receives. */
function connect(WS, url, origin, waitMs) {
  const seen = []
  const waiters = []
  let failed = false
  const socket = new WS(url, { headers: { Origin: origin } })
  const settle = () => { for (const w of waiters.splice(0)) w() }
  socket.onmessage = (ev) => {
    try { const f = JSON.parse(String(ev.data)); seen.push(f); settle() } catch { /* not JSON */ }
  }
  socket.onerror = () => { failed = true; settle() }
  socket.onclose = () => { failed = true; settle() }
  /** Resolves true as soon as a recorded frame satisfies `test`, false after WAIT_MS or when the socket fails. */
  const until = (test) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), waitMs)
    const look = () => {
      if (seen.some(test)) { clearTimeout(timer); resolve(true) } else if (failed) { clearTimeout(timer); resolve(false) } else waiters.push(look)
    }
    look()
  })
  return { socket, seen, until, close: () => { try { socket.close() } catch { /* closed */ } } }
}

/** Runs every check against `base` and returns the failed messages. */
export async function runSmoke(base, deps = {}) {
  const { fetch: get = fetch, WebSocket: WS = WebSocket, upgrade = upgradeStatus, log = console.log, waitMs = WAIT_MS } = deps
  const failures = []
  const check = (ok, message) => { log(`${ok ? 'ok  ' : 'FAIL'} ${message}`); if (!ok) failures.push(message) }

  const health = await get(`${base}/healthz`)
  check(health.ok && (await health.text()) === 'ok', '/healthz answers ok')

  const home = await get(`${base}/`)
  const csp = home.headers.get('content-security-policy') ?? ''
  check(home.ok, 'landing page answers 200')
  check(csp.includes("default-src 'none'") && !csp.includes('unsafe-'), 'strict CSP on HTML')
  check(home.headers.get('x-content-type-options') === 'nosniff', 'nosniff header')
  const hsts = home.headers.get('strict-transport-security') ?? ''
  check(Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0) >= 15552000, 'HSTS with max-age of at least 6 months')
  if (base.startsWith('https://') && !/localhost|127\.0\.0\.1/.test(base)) {
    const plain = await get(base.replace(/^https:/, 'http:') + '/', { redirect: 'manual' })
    check([301, 302, 307, 308].includes(plain.status) && (plain.headers.get('location') ?? '').startsWith('https://'), 'plain HTTP redirects to HTTPS')
  }
  const html = await home.text()
  check(html.includes('<div id="__nuxt"'), 'Nuxt app shell served')

  // Hashed files are served by the asset layer without the Worker (ADR-0034). A missing one must be a real, uncacheable 404
  // (never the shell, never a cache header that would pin the error); a present one must still carry its security headers.
  const gone = await get(`${base}/_nuxt/${randomBytes(8).toString('hex')}.js`)
  check(gone.status === 404 && !gone.headers.get('cache-control') && !(gone.headers.get('content-type') ?? '').includes('text/html'), 'a missing /_nuxt/ file answers 404 without a cache header')
  const entry = html.match(/\/_nuxt\/[\w.-]+\.js/)?.[0]
  const script = entry ? await get(`${base}${entry}`) : null
  check(
    script?.status === 200 && /javascript/.test(script.headers.get('content-type') ?? '') && script.headers.get('x-content-type-options') === 'nosniff' && (script.headers.get('strict-transport-security') ?? '') !== '',
    `the entry script ${entry ?? '(not found in the landing page)'} answers 200 as JavaScript with nosniff and HSTS`,
  )

  const board = await get(`${base}/boards`)
  check(board.ok, 'SPA fallback serves /boards')

  // The relay lives at /ws2. A foreign origin must be refused with 403 (a 404 would mean the route is gone), the site's own
  // origin must reach the room (`welcome`, then `hist` with done: true), and a live frame must cross from one socket to another.
  const room = randomBytes(16).toString('base64url')
  const wsUrl = `${base.replace(/^http/, 'ws')}/ws2?room=${room}`
  const origin = new URL(base).origin
  check((await upgrade(base, room, 'https://evil.example')) === 403, 'relay answers 403 to a foreign origin on /ws2')

  const a = connect(WS, wsUrl, origin, waitMs)
  const opened = await a.until((f) => f.t === 'hist' && f.done === true)
  check(opened && a.seen[0]?.t === 'welcome', `a board connection opens on /ws2 (welcome, then hist; got ${a.seen.map((f) => f.t).join(', ') || 'nothing'})`)

  const b = connect(WS, wsUrl, origin, waitMs)
  const joined = await b.until((f) => f.t === 'hist' && f.done === true)
  const env = { v: 2, room, id: randomBytes(12).toString('hex'), hlc: Date.now(), ct: randomBytes(24).toString('base64url') }
  if (joined) a.socket.send(JSON.stringify({ t: 'eph', env }))
  check(joined && await b.until((f) => f.t === 'eph' && f.env?.id === env.id), 'a live frame crosses the relay between two connections')
  a.close()
  b.close()

  return failures
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = (process.argv[2] ?? '').replace(/\/$/, '')
  if (!base) { console.error('usage: smoke.mjs <base-url>'); process.exit(2) }
  const failures = await runSmoke(base)
  if (failures.length) { console.error(`${failures.length} smoke check(s) failed`); process.exit(1) }
}
