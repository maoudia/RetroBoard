#!/usr/bin/env node
// Production smoke test: node scripts/smoke.mjs https://retroboard.maoudia.com
import http from 'node:http'
import https from 'node:https'
import { randomBytes } from 'node:crypto'

const base = (process.argv[2] ?? '').replace(/\/$/, '')
if (!base) { console.error('usage: smoke.mjs <base-url>'); process.exit(2) }

const failures = []
const check = (ok, message) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`); if (!ok) failures.push(message) }

const health = await fetch(`${base}/healthz`)
check(health.ok && (await health.text()) === 'ok', '/healthz answers ok')

const home = await fetch(`${base}/`)
const csp = home.headers.get('content-security-policy') ?? ''
check(home.ok, 'landing page answers 200')
check(csp.includes("default-src 'none'") && !csp.includes('unsafe-'), 'strict CSP on HTML')
check(home.headers.get('x-content-type-options') === 'nosniff', 'nosniff header')
const hsts = home.headers.get('strict-transport-security') ?? ''
check(Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0) >= 15552000, 'HSTS with max-age of at least 6 months')
if (base.startsWith('https://') && !/localhost|127\.0\.0\.1/.test(base)) {
  const plain = await fetch(base.replace(/^https:/, 'http:') + '/', { redirect: 'manual' })
  check([301, 302, 307, 308].includes(plain.status) && (plain.headers.get('location') ?? '').startsWith('https://'), 'plain HTTP redirects to HTTPS')
}
check((await home.text()).includes('<div id="__nuxt"'), 'Nuxt app shell served')

const board = await fetch(`${base}/boards`)
check(board.ok, 'SPA fallback serves /boards')

// The relay lives at /ws2. A foreign origin must be refused with 403 (a 404 would mean the route is gone), and the
// site's own origin must reach the room: the first frames are `welcome` then `hist` with done: true.
const room = randomBytes(16).toString('base64url')
const wsBase = `${base.replace(/^http/, 'ws')}/ws2?room=${room}`
const upgradeStatus = (origin) => new Promise((resolve) => {
  const url = new URL(`${base}/ws2?room=${room}`)
  const req = (url.protocol === 'https:' ? https : http).request(url, {
    headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64'), Origin: origin },
    timeout: 5000,
  })
  req.on('response', (res) => { res.resume(); resolve(res.statusCode) })
  req.on('upgrade', (res, socket) => { socket.destroy(); resolve(res.statusCode) })
  req.on('timeout', () => { req.destroy(); resolve(0) })
  req.on('error', () => resolve(0))
  req.end()
})
check((await upgradeStatus('https://evil.example')) === 403, 'relay answers 403 to a foreign origin on /ws2')

// Node's WebSocket (undici) accepts headers, so we can present the site's own Origin.
const frames = await new Promise((resolve) => {
  const seen = []
  const socket = new WebSocket(wsBase, { headers: { Origin: new URL(base).origin } })
  const finish = () => { try { socket.close() } catch { /* closed */ } resolve(seen) }
  socket.onmessage = (ev) => {
    try { const f = JSON.parse(String(ev.data)); seen.push(f.t); if (f.t === 'hist' && f.done) finish() } catch { /* not JSON */ }
  }
  socket.onerror = finish
  setTimeout(finish, 5000)
})
check(frames[0] === 'welcome' && frames.includes('hist'), `a board connection opens on /ws2 (welcome, then hist; got ${frames.join(', ') || 'nothing'})`)

if (failures.length) { console.error(`${failures.length} smoke check(s) failed`); process.exit(1) }
