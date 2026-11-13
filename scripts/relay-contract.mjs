#!/usr/bin/env node
// Relay protocol contract: node scripts/relay-contract.mjs http://127.0.0.1:8787
// Opens real sockets on one room (or several) of any base URL and asserts the frame sequences and close codes of the
// `relay-core` spec (openspec/changes/portable-relay-core). Every adapter (wrangler dev, the Node adapter, a container)
// must pass it unchanged. It sends nothing but fresh random rooms and encrypted-looking envelopes, and leaves nothing behind.
// `runContract` takes the WebSocket class as a dependency so the checks are unit tested (apps/relay/test/node.test.ts).
import { randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'

/**
 * The relay limits the checks lean on, mirrored from packages/domain (LIMITS) and packages/protocol (budgets, envelope).
 * apps/relay/test/node.test.ts fails when they drift.
 */
export const LIMITS = { maxConnections: 30, boardFrames: 80, liveFrames: 60, maxFrameBytes: 256 * 1024 }

const WAIT_MS = 5000
/** How long a frame that must NOT arrive is waited for, after a marker proved the relay had the time to send it. */
const QUIET_MS = 150

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const randomRoom = () => randomBytes(16).toString('base64url')
const envelope = (room, ct = randomBytes(24).toString('base64url')) => ({ v: 2, room, id: randomBytes(12).toString('hex'), hlc: Date.now(), ct })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** One relay connection recording every frame it receives and how it ended. */
function connect(WS, base, room, waitMs) {
  const frames = []
  const waiters = []
  const state = { closed: null }
  const socket = new WS(`${base.replace(/^http/, 'ws')}/ws2?room=${room}`, { headers: { Origin: new URL(base).origin } })
  const settle = () => { for (const w of waiters.splice(0)) w() }
  socket.onmessage = (ev) => {
    const text = String(ev.data)
    if (text === 'pong') frames.push({ t: 'pong' })
    else try { frames.push(JSON.parse(text)) } catch { frames.push({ t: 'not-json', text }) }
    settle()
  }
  socket.onerror = () => { state.closed ??= { code: 0, reason: 'error' }; settle() }
  socket.onclose = (ev) => { state.closed = { code: ev.code, reason: ev.reason }; settle() }
  /** Resolves true as soon as the recorded frames satisfy `test` (or the socket closed with `allowClosed`), false after waitMs. */
  const until = (test) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), waitMs)
    const look = () => {
      if (test(frames, state)) { clearTimeout(timer); resolve(true) } else if (state.closed) { clearTimeout(timer); resolve(false) } else waiters.push(look)
    }
    look()
  })
  const closed = () => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), waitMs)
    const look = () => { if (state.closed) { clearTimeout(timer); resolve(state.closed) } else waiters.push(look) }
    look()
  })
  return {
    socket, frames, until, closed,
    send: (frame) => socket.send(typeof frame === 'string' ? frame : JSON.stringify(frame)),
    /** How the socket ended, null while it is open. */
    get ended() { return state.closed },
    /** The connection id from the welcome frame. */
    get conn() { return frames.find((f) => f.t === 'welcome')?.conn },
    /** Frames received after the welcome, up to and including the `done` history frame. */
    get history() { const end = frames.findIndex((f) => f.t === 'hist' && f.done); return end < 0 ? [] : frames.slice(1, end + 1) },
    /** True once the history is complete. */
    open: () => until((fs) => fs.some((f) => f.t === 'hist' && f.done)),
    close: () => { try { socket.close() } catch { /* closed */ } },
  }
}

/** Runs every scenario against `base` and returns the failed messages. */
export async function runContract(base, deps = {}) {
  const { WebSocket: WS = WebSocket, log = console.log, waitMs = WAIT_MS, quietMs = QUIET_MS } = deps
  const failures = []
  const check = (ok, message) => { log(`${ok ? 'ok  ' : 'FAIL'} ${message}`); if (!ok) failures.push(message) }
  const clients = []
  const join = (room) => { const c = connect(WS, base, room, waitMs); clients.push(c); return c }
  const types = (c) => c.frames.map((f) => f.t).join(', ') || 'nothing'
  const sorted = (ids) => same(ids, [...ids].sort())

  // Welcome of a new connection, then of a second one: peers include the connection itself, sorted, announced to everyone.
  {
    const room = randomRoom()
    const a = join(room)
    const aOpen = await a.open()
    const welcome = a.frames[0]
    check(aOpen && welcome?.t === 'welcome' && same(welcome.peers, [welcome.conn]), `a first connection gets welcome with its own id, then history ending with done (got ${types(a)})`)
    check(a.history.length > 0 && a.history.every((f) => f.t === 'hist' && Array.isArray(f.envs)) && a.history.at(-1)?.done === true, 'the history is hist frames, the last one marked done')
    const b = join(room)
    const bOpen = await b.open()
    const ids = b.frames[0]?.peers ?? []
    const both = a.conn && b.conn ? [a.conn, b.conn].sort() : []
    check(bOpen && b.frames[0]?.t === 'welcome' && sorted(ids) && same(ids, both), 'a second welcome lists both connection ids, sorted, its own included')
    check(await a.until((fs) => fs.some((f) => f.t === 'peers' && same(f.peers, both))) && await b.until((fs) => fs.some((f) => f.t === 'peers' && same(f.peers, both))), 'both connections receive a peers frame with the same sorted ids')

    // Peer leaves.
    const left = b.conn
    b.close()
    check(await a.until((fs) => fs.some((f) => f.t === 'peers' && !f.peers.includes(left) && f.peers.includes(a.conn))), 'a closed connection is dropped from the peers frame of the others')
  }

  // Board frame fan-out and buffering: forwarded once, buffered once, replayed to a late joiner, never echoed.
  {
    const room = randomRoom()
    const [a, b] = [join(room), join(room)]
    await Promise.all([a.open(), b.open()])
    const env = envelope(room)
    a.send({ t: 'pub', envs: [env] })
    const forwarded = await b.until((fs) => fs.some((f) => f.t === 'env' && f.envs.length === 1 && f.envs[0].id === env.id))
    check(forwarded, 'a pub frame reaches the other connection as one env frame')
    const fresh = envelope(room)
    a.send({ t: 'pub', envs: [env, fresh] })
    check(await b.until((fs) => fs.some((f) => f.t === 'env' && f.envs.some((e) => e.id === fresh.id))), 'a pub frame with a seen and a new envelope goes on')
    const forwards = b.frames.filter((f) => f.t === 'env').flatMap((f) => f.envs.map((e) => e.id))
    check(same(forwards, [env.id, fresh.id]) && !a.frames.some((f) => f.t === 'env'), 'an envelope seen before is not forwarded again, and the sender gets no echo')
    const late = join(room)
    await late.open()
    const replay = late.history.flatMap((f) => f.envs.map((e) => e.id))
    check(same(replay, [env.id, fresh.id]), 'a late joiner gets each buffered envelope once in its history')
  }

  // Live frames: fan-out without the sender, never buffered.
  {
    const room = randomRoom()
    const [a, b] = [join(room), join(room)]
    await Promise.all([a.open(), b.open()])
    const env = envelope(room)
    a.send({ t: 'eph', env })
    check(await b.until((fs) => fs.some((f) => f.t === 'eph' && f.env.id === env.id)), 'an eph frame reaches the other connection')
    b.send({ t: 'eph', env: envelope(room) })
    await a.until((fs) => fs.some((f) => f.t === 'eph'))
    check(!a.frames.some((f) => f.t === 'eph' && f.env.id === env.id), 'the sender of an eph frame does not receive it')
    const late = join(room)
    await late.open()
    check(late.history.every((f) => f.envs.length === 0), 'an eph frame is not buffered for a late joiner')
  }

  // Signalling: to one connection with the sender id; unknown and own target dropped silently.
  {
    const room = randomRoom()
    const [a, b, c] = [join(room), join(room), join(room)]
    await Promise.all([a.open(), b.open(), c.open()])
    const env = envelope(room)
    a.send({ t: 'sig', to: b.conn, env })
    const got = await b.until((fs) => fs.some((f) => f.t === 'sig' && f.from === a.conn && f.env.id === env.id))
    check(got, 'a sig frame reaches its target carrying the sender connection id')
    a.send({ t: 'sig', to: 'ZZZZZZZZZZZZ', env: envelope(room) })
    a.send({ t: 'sig', to: a.conn, env: envelope(room) })
    // The marker travels after the dropped frames: once it arrived, anything they would have caused has arrived too.
    b.send({ t: 'eph', env: envelope(room) })
    const marked = await a.until((fs) => fs.some((f) => f.t === 'eph')) && await c.until((fs) => fs.some((f) => f.t === 'eph'))
    await wait(quietMs)
    check(marked && !a.frames.some((f) => f.t === 'sig') && c.frames.filter((f) => f.t === 'sig').length === 0 && b.frames.filter((f) => f.t === 'sig').length === 1, 'a sig to a third party, to an unknown id or to the sender itself reaches nobody else')
    const late = join(room)
    await late.open()
    check(late.history.every((f) => f.envs.length === 0), 'a sig frame is not buffered')
  }

  // Wrong room and invalid frames: an error to the sender, nothing forwarded.
  {
    const room = randomRoom()
    const [a, b] = [join(room), join(room)]
    await Promise.all([a.open(), b.open()])
    a.send({ t: 'pub', envs: [envelope(randomRoom())] })
    check(await a.until((fs) => fs.some((f) => f.t === 'err' && f.code === 'wrong-room')), 'an envelope of another room is answered with err wrong-room')
    a.send({ t: 'eph', env: envelope(randomRoom()) })
    a.send('this is not a client frame')
    check(await a.until((fs) => fs.some((f) => f.t === 'err' && f.code === 'invalid')), 'text that is not a client frame is answered with err invalid')
    a.send({ t: 'nope' })
    check(await a.until((fs) => fs.filter((f) => f.t === 'err' && f.code === 'invalid').length >= 2), 'a frame of an unknown type is answered with err invalid')
    b.send({ t: 'eph', env: envelope(room) })
    await a.until((fs) => fs.some((f) => f.t === 'eph'))
    check(!b.frames.some((f) => f.t === 'env' || f.t === 'eph') && a.frames.filter((f) => f.t === 'err' && f.code === 'wrong-room').length === 2 && !a.ended, 'the refused frames reached nobody and the sender stays connected')
  }

  // Ping: pong, and it does not count against the board budget.
  {
    const room = randomRoom()
    const [a, b] = [join(room), join(room)]
    await Promise.all([a.open(), b.open()])
    a.send('ping')
    check(await a.until((fs) => fs.some((f) => f.t === 'pong')), 'the text ping is answered with the text pong')
    for (let i = 0; i < LIMITS.boardFrames + 20; i++) a.send('ping')
    const env = envelope(room)
    a.send({ t: 'pub', envs: [env] })
    check(await b.until((fs) => fs.some((f) => f.t === 'env' && f.envs[0].id === env.id)) && !a.ended, 'pings are not counted against the board frame budget')
  }

  // Message too large: close 1009.
  {
    const room = randomRoom()
    const [a, b] = [join(room), join(room)]
    await Promise.all([a.open(), b.open()])
    a.send('x'.repeat(LIMITS.maxFrameBytes + 1))
    const end = await a.closed()
    check(end?.code === 1009, `a message over the frame limit closes the connection with 1009 (got ${end?.code ?? 'no close'})`)
    check(await b.until((fs) => fs.some((f) => f.t === 'peers' && f.peers.length === 1)), 'the other connection is told and stays open')
  }

  // Budgets: board frames over budget close with 1008, live frames over budget are dropped and the socket stays open.
  {
    const room = randomRoom()
    const [a, b, c] = [join(room), join(room), join(room)]
    await Promise.all([a.open(), b.open(), c.open()])
    for (let i = 0; i < LIMITS.liveFrames + 15; i++) a.send({ t: 'eph', env: envelope(room) })
    a.send({ t: 'pub', envs: [envelope(room)] })
    // The pub is a board frame with its own budget: it follows every eph, so every eph that gets through is already counted.
    const marked = await b.until((fs) => fs.some((f) => f.t === 'env'))
    const ephs = b.frames.filter((f) => f.t === 'eph').length
    check(marked && ephs === LIMITS.liveFrames && !a.ended, `live frames over budget are dropped without closing the sender (${ephs} of ${LIMITS.liveFrames + 15} forwarded)`)
    for (let i = 0; i < LIMITS.boardFrames + 10; i++) c.send({ t: 'pub', envs: [envelope(room)] })
    const end = await c.closed()
    check(end?.code === 1008, `board frames over budget close the connection with 1008 (got ${end?.code ?? 'no close'})`)
    b.send({ t: 'eph', env: envelope(room) })
    check(await a.until((fs) => fs.filter((f) => f.t === 'eph').length >= 1) && !b.ended, 'the other connections are unaffected')
  }

  // A full room: err full then 4008 for the next socket, which is never counted.
  {
    const room = randomRoom()
    const members = Array.from({ length: LIMITS.maxConnections }, () => join(room))
    const opened = (await Promise.all(members.map((m) => m.open()))).every(Boolean)
    check(opened, `${LIMITS.maxConnections} connections fit in one room`)
    const extra = join(room)
    const end = await extra.closed()
    check(same(extra.frames, [{ t: 'err', code: 'full' }]) && end?.code === 4008, `the next connection gets err full then close 4008, nothing else (got ${types(extra)}, ${end?.code ?? 'no close'})`)
    check(members.every((m) => m.frames.filter((f) => f.t === 'peers').every((f) => f.peers.length <= LIMITS.maxConnections)), 'the refused connection is never announced as a peer')
    members[0].close()
    await members[0].closed()
    const next = join(room)
    check(await next.open() && next.frames[0]?.t === 'welcome', 'a freed seat is taken by the next connection')
  }

  for (const c of clients) c.close()
  return failures
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = (process.argv[2] ?? '').replace(/\/$/, '')
  if (!base) { console.error('usage: relay-contract.mjs <base-url>'); process.exit(2) }
  const failures = await runContract(base)
  if (failures.length) { console.error(`${failures.length} relay contract check(s) failed`); process.exit(1) }
  process.exit(0)
}
