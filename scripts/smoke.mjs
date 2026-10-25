#!/usr/bin/env node
// Production smoke test: node scripts/smoke.mjs https://retroboard.maoudia.com
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

const board = await fetch(`${base}/board`)
check(board.ok, 'SPA fallback serves /board')

// Node's WebSocket (undici) accepts headers, so we can present a foreign Origin.
const wsUrl = `${base.replace(/^http/, 'ws')}/ws?room=${'x'.repeat(22)}`
const opened = await new Promise((resolve) => {
  const socket = new WebSocket(wsUrl, { headers: { Origin: 'https://evil.example' } })
  socket.onopen = () => { socket.close(); resolve(true) }
  socket.onerror = () => resolve(false)
  setTimeout(() => resolve(false), 5000)
})
check(!opened, 'relay rejects foreign origins')

if (failures.length) { console.error(`${failures.length} smoke check(s) failed`); process.exit(1) }
