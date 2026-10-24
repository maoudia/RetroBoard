#!/usr/bin/env node
/**
 * Relay load test (protocol v2). Simulates participants that send what a real browser sends:
 * cursor frames (eph) at up to 4 Hz while "moving", board events (pub), and measures what the
 * others receive: delivery ratio and latency. Payloads are random bytes of realistic sizes:
 * the relay never decrypts, so ciphertext content does not matter.
 *
 *   node scripts/load/relay-load.mjs --clients 30 --boards 1 --seconds 30
 *   node scripts/load/relay-load.mjs --url wss://retroboard-dev.example/ws2 --origin https://retroboard-dev.example
 *
 * Local numbers (wrangler dev) show relay CPU per message and fan-out behaviour; production
 * latency also depends on the distance to the Durable Object's location.
 */
import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'
import WebSocket from 'ws'

const { values: o } = parseArgs({
  options: {
    url: { type: 'string', default: 'ws://127.0.0.1:8787/ws2' },
    origin: { type: 'string', default: 'http://127.0.0.1:8787' },
    clients: { type: 'string', default: '10' },
    boards: { type: 'string', default: '1' },
    seconds: { type: 'string', default: '20' },
    hz: { type: 'string', default: '4' },
    moving: { type: 'string', default: '0.5' },
    eventsPerMin: { type: 'string', default: '6' },
    json: { type: 'boolean', default: false },
  },
})
const N = Number(o.clients), B = Number(o.boards), SECONDS = Number(o.seconds), HZ = Number(o.hz)
const MOVING = Number(o.moving), EPM = Number(o.eventsPerMin)

const b64 = (buf) => buf.toString('base64url')
const ALNUM = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ulid = () => Array.from(randomBytes(26), (b) => ALNUM[b % 32]).join('')
const roomId = () => b64(randomBytes(16))
let hlc = Date.now() * 1000

/** ct: 8-byte send time (for latency), then padding to a realistic encrypted size. */
function ct(size) {
  const buf = randomBytes(size)
  buf.writeDoubleBE(performance.timeOrigin + performance.now(), 0)
  return b64(buf)
}
const envelope = (room, size) => ({ v: 2, room, id: ulid(), hlc: hlc++, ct: ct(size) })

const rooms = Array.from({ length: B }, roomId)
const lat = { eph: [], env: [] }
const stats = { open: 0, refused: 0, closed: 0, closeCodes: {}, err: 0, sentEph: 0, sentPub: 0, gotEph: 0, gotEnv: 0 }
const clients = []

function connect(i) {
  const room = rooms[i % B]
  return new Promise((resolve) => {
    const ws = new WebSocket(`${o.url}?room=${room}`, { headers: { Origin: o.origin } })
    const c = { ws, room, timers: [], ready: false }
    ws.on('unexpected-response', (_req, res) => { stats.refused++; resolve(null); void res })
    ws.on('error', () => { stats.err++; resolve(null) })
    ws.on('close', (code) => { if (c.ready) { stats.closed++; stats.closeCodes[code] = (stats.closeCodes[code] ?? 0) + 1 } })
    ws.on('message', (data) => {
      const now = performance.timeOrigin + performance.now()
      const f = JSON.parse(String(data))
      if (f.t === 'welcome') { c.ready = true; stats.open++; resolve(c) }
      else if (f.t === 'eph' && c.measuring) { stats.gotEph++; lat.eph.push(now - Buffer.from(f.env.ct, 'base64url').readDoubleBE(0)) }
      else if (f.t === 'env' && c.measuring) for (const e of f.envs) { stats.gotEnv++; lat.env.push(now - Buffer.from(e.ct, 'base64url').readDoubleBE(0)) }
      else if (f.t === 'err') stats.err++
    })
    clients.push(c)
  })
}

function start(c) {
  c.measuring = true
  // Cursor: 4 Hz while moving, silent otherwise (the browser sends only while the pointer moves).
  let moving = Math.random() < MOVING
  c.timers.push(setInterval(() => { moving = Math.random() < MOVING }, 2_000))
  c.timers.push(setInterval(() => {
    if (!moving || c.ws.readyState !== 1) return
    c.ws.send(JSON.stringify({ t: 'eph', env: envelope(c.room, 120) }))
    stats.sentEph++
  }, 1000 / HZ))
  // Focus heartbeat every 15 s.
  c.timers.push(setInterval(() => { if (c.ws.readyState === 1) { c.ws.send(JSON.stringify({ t: 'eph', env: envelope(c.room, 100) })); stats.sentEph++ } }, 15_000))
  // Board events: a signed note or a vote, ~400 bytes of ciphertext.
  if (EPM > 0) c.timers.push(setInterval(() => { if (c.ws.readyState === 1) { c.ws.send(JSON.stringify({ t: 'pub', envs: [envelope(c.room, 400)] })); stats.sentPub++ } }, 60_000 / EPM * (0.5 + Math.random())))
}

const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]) }

// Join one by one, like people arriving.
for (let i = 0; i < N; i++) await connect(i)
const live = clients.filter((c) => c.ready)
for (const c of live) start(c)
await new Promise((r) => setTimeout(r, SECONDS * 1000))
for (const c of clients) { for (const t of c.timers) clearInterval(t); c.ws.close(1000) }

// Each frame should reach every other participant of its board.
const perBoard = live.length / B
const expectedEph = stats.sentEph * (perBoard - 1)
const expectedEnv = stats.sentPub * (perBoard - 1)
const report = {
  clients: N, boards: B, seconds: SECONDS, connected: stats.open, refused: stats.refused, droppedDuringRun: stats.closed, closeCodes: stats.closeCodes, errors: stats.err,
  sent: { eph: stats.sentEph, pub: stats.sentPub, inPerSecondPerBoard: Math.round((stats.sentEph + stats.sentPub) / SECONDS / B) },
  delivered: { eph: expectedEph ? +(stats.gotEph / expectedEph).toFixed(3) : null, env: expectedEnv ? +(stats.gotEnv / expectedEnv).toFixed(3) : null, outPerSecondPerBoard: Math.round((stats.gotEph + stats.gotEnv) / SECONDS / B) },
  latencyMs: { eph: { p50: pct(lat.eph, 50), p95: pct(lat.eph, 95), p99: pct(lat.eph, 99) }, env: { p50: pct(lat.env, 50), p95: pct(lat.env, 95), p99: pct(lat.env, 99) } },
}
console.log(o.json ? JSON.stringify(report) : JSON.stringify(report, null, 2))
setTimeout(() => process.exit(0), 200)
