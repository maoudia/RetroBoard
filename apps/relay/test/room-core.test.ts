import { describe, expect, it } from 'vitest'
import { LIMITS } from '@retroboard/domain'
import { type Envelope, EPH_MAX, FRAME_MAX, MAX_FRAME_BYTES, type RelayFrame } from '@retroboard/protocol'
import type { Logger } from '../src/core/logger'
import { type Attachment, RoomCore, type RoomPort } from '../src/core/room'

const ROOM = 'Ab3dEfGhIjKlMnOpQrStUv'
const OTHER_ROOM = 'Zz3dEfGhIjKlMnOpQrStUv'
const env = (i: number, room = ROOM): Envelope => ({ v: 2, room, id: `01J${String(i).padStart(23, '0')}`, hlc: i, ct: 'AAAA' })

interface FakeSocket { out: RelayFrame[]; raw: string[]; closed: { code: number; reason?: string } | null; att: Attachment | null }

/** A port over plain objects: what a runtime adapter provides, with the attachment kept on the socket as in a hibernating object. */
function harness() {
  const live: FakeSocket[] = []
  const logs: { level: string; event: string; fields?: Record<string, unknown> }[] = []
  const log: Logger = { info: (event, fields) => logs.push({ level: 'info', event, fields }), warn: (event, fields) => logs.push({ level: 'warn', event, fields }) }
  const port: RoomPort<FakeSocket> = {
    sockets: () => live,
    send: (ws, text) => { ws.raw.push(text); ws.out.push(JSON.parse(text) as RelayFrame) },
    close: (ws, code, reason) => { ws.closed = { code, reason } },
    attachment: (ws) => ws.att,
    attach: (ws, att) => { ws.att = { ...att } },
  }
  let n = 0
  const core = new RoomCore<FakeSocket>(port, log, () => `conn${String(++n).padStart(4, '0')}`)
  const socket = (): FakeSocket => ({ out: [], raw: [], closed: null, att: null })
  const join = (now = 1000, room = ROOM): FakeSocket => {
    const ws = socket()
    live.push(ws)
    core.open(ws, 'rh01', room, now)
    return ws
  }
  const leave = (ws: FakeSocket) => { live.splice(live.indexOf(ws), 1); core.leave(ws) }
  const say = (ws: FakeSocket, frame: unknown, now = 1000) => core.message(ws, typeof frame === 'string' ? frame : JSON.stringify(frame), now)
  return { core, live, logs, join, leave, say, socket }
}

const last = (ws: FakeSocket) => ws.out[ws.out.length - 1]

describe('RoomCore admission', () => {
  it('welcomes with its own id among the sorted peers, then the history, and tells everyone the peers', () => {
    const h = harness()
    const a = h.join()
    expect(a.out).toEqual([
      { t: 'welcome', conn: 'conn0001', peers: ['conn0001'] },
      { t: 'hist', envs: [], done: true },
      { t: 'peers', peers: ['conn0001'] },
    ])
    const b = h.join()
    expect(b.out[0]).toEqual({ t: 'welcome', conn: 'conn0002', peers: ['conn0001', 'conn0002'] })
    expect(last(a)).toEqual({ t: 'peers', peers: ['conn0001', 'conn0002'] })
    expect(last(b)).toEqual({ t: 'peers', peers: ['conn0001', 'conn0002'] })
  })

  it('starts the budget window at the clock it is given', () => {
    const h = harness()
    expect(h.join(4242).att).toMatchObject({ rh: 'rh01', room: ROOM, conn: 'conn0001', windowStart: 4242, count: 0 })
  })

  it('replays what the room buffered to a late joiner', () => {
    const h = harness()
    const a = h.join()
    h.say(a, { t: 'pub', envs: [env(1), env(2)] })
    const late = h.join()
    expect(late.out[1]).toEqual({ t: 'hist', envs: [env(1), env(2)], done: true })
  })

  it('reports full at the connection limit and refuses with err full then 4008, outside the room', () => {
    const h = harness()
    for (let i = 0; i < LIMITS.maxConnections - 1; i++) h.join()
    expect(h.core.full()).toBe(false)
    h.join()
    expect(h.core.full()).toBe(true)
    const refused = h.socket()
    h.core.refuse(refused, 'rh01')
    expect(refused.out).toEqual([{ t: 'err', code: 'full' }])
    expect(refused.closed).toEqual({ code: 4008, reason: 'Board is full' })
    expect(h.live).toHaveLength(LIMITS.maxConnections)
    expect(h.live.every((s) => s.out.every((f) => f.t !== 'err'))).toBe(true)
  })

  it('tells the others who is left when a connection leaves', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const c = h.join()
    h.leave(b)
    expect(last(a)).toEqual({ t: 'peers', peers: ['conn0001', 'conn0003'] })
    expect(last(c)).toEqual({ t: 'peers', peers: ['conn0001', 'conn0003'] })
    expect(last(b)).toEqual({ t: 'peers', peers: ['conn0001', 'conn0002', 'conn0003'] })
  })

  it('leaves the leaving socket out of the peers it announces', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const before = b.out.length
    h.core.leave(a)
    expect(b.out.slice(before)).toEqual([{ t: 'peers', peers: ['conn0002'] }])
    expect(a.out.length).toBe(3 + 1)
  })
})

describe('RoomCore frames', () => {
  it('buffers fresh envelopes and forwards them once to everyone but the sender', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const sent = a.out.length
    h.say(a, { t: 'pub', envs: [env(1), env(2)] })
    expect(last(b)).toEqual({ t: 'env', envs: [env(1), env(2)] })
    expect(a.out.length).toBe(sent)
    h.say(b, { t: 'pub', envs: [env(2), env(3)] })
    expect(last(a)).toEqual({ t: 'env', envs: [env(3)] })
    const quiet = a.out.length
    h.say(b, { t: 'pub', envs: [env(1), env(3)] })
    expect(a.out.length).toBe(quiet)
  })

  it('serialises a fan-out once: the same text goes to every other socket', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const c = h.join()
    h.say(a, { t: 'pub', envs: [env(1)] })
    expect(b.raw[b.raw.length - 1]).toBe(c.raw[c.raw.length - 1])
  })

  it('fans out eph frames to the others and buffers nothing', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const sent = a.out.length
    h.say(a, { t: 'eph', env: env(1) })
    expect(last(b)).toEqual({ t: 'eph', env: env(1) })
    expect(a.out.length).toBe(sent)
    expect(h.join().out[1]).toEqual({ t: 'hist', envs: [], done: true })
  })

  it('routes sig to its target only, with the sender as origin', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const c = h.join()
    const [nb, nc] = [b.out.length, c.out.length]
    h.say(a, { t: 'sig', to: 'conn0002', env: env(1) })
    expect(last(b)).toEqual({ t: 'sig', from: 'conn0001', env: env(1) })
    expect(c.out.length).toBe(nc)
    expect(b.out.length).toBe(nb + 1)
  })

  it('drops a sig to an unknown id or to the sender itself, silently', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const [na, nb] = [a.out.length, b.out.length]
    h.say(a, { t: 'sig', to: 'nobody123', env: env(1) })
    h.say(a, { t: 'sig', to: 'conn0001', env: env(1) })
    expect([a.out.length, b.out.length]).toEqual([na, nb])
    expect(a.closed).toBeNull()
  })

  it('answers wrong-room to every frame kind carrying another room, and forwards nothing', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const nb = b.out.length
    h.say(a, { t: 'pub', envs: [env(1), env(2, OTHER_ROOM)] })
    expect(last(a)).toEqual({ t: 'err', code: 'wrong-room' })
    h.say(a, { t: 'eph', env: env(3, OTHER_ROOM) })
    expect(last(a)).toEqual({ t: 'err', code: 'wrong-room' })
    h.say(a, { t: 'sig', to: 'conn0002', env: env(4, OTHER_ROOM) })
    expect(last(a)).toEqual({ t: 'err', code: 'wrong-room' })
    expect(a.out.filter((f) => f.t === 'err')).toHaveLength(3)
    expect(b.out.length).toBe(nb)
    expect(h.join().out[1]).toEqual({ t: 'hist', envs: [], done: true })
  })

  it('answers invalid to text that is not a client frame, and keeps the socket', () => {
    const h = harness()
    const a = h.join()
    h.say(a, 'not json')
    expect(last(a)).toEqual({ t: 'err', code: 'invalid' })
    h.say(a, { t: 'nope' })
    expect(a.out.filter((f) => f.t === 'err')).toHaveLength(2)
    expect(a.closed).toBeNull()
  })

  it('ignores a message on a socket without an attachment', () => {
    const h = harness()
    const ghost = h.socket()
    h.say(ghost, { t: 'pub', envs: [env(1)] })
    expect(ghost.out).toEqual([])
    expect(ghost.closed).toBeNull()
  })

  it('keeps going when a socket throws on send', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const c = h.join()
    b.raw.push = () => { throw new Error('gone') }
    h.say(a, { t: 'pub', envs: [env(1)] })
    expect(last(c)).toEqual({ t: 'env', envs: [env(1)] })
  })
})

describe('RoomCore budgets and refusals', () => {
  it('closes with 1009 on a message over the frame limit and on a binary message', () => {
    const h = harness()
    const a = h.join()
    h.say(a, 'x'.repeat(MAX_FRAME_BYTES + 1))
    expect(a.closed).toEqual({ code: 1009, reason: 'Message too large' })
    const b = h.join()
    h.core.message(b, new ArrayBuffer(8), 1000)
    expect(b.closed).toEqual({ code: 1009, reason: 'Message too large' })
  })

  it('closes with 1008 when board frames exceed the budget, in the same window', () => {
    const h = harness()
    const a = h.join()
    for (let i = 0; i < FRAME_MAX; i++) h.say(a, { t: 'pub', envs: [env(i)] })
    expect(a.closed).toBeNull()
    h.say(a, { t: 'pub', envs: [env(FRAME_MAX + 1)] })
    expect(a.closed).toEqual({ code: 1008, reason: 'Rate limit' })
  })

  it('opens a new window once the rate window has passed', () => {
    const h = harness()
    const a = h.join(0)
    for (let i = 0; i < FRAME_MAX; i++) h.say(a, { t: 'pub', envs: [env(i)] }, 0)
    h.say(a, { t: 'pub', envs: [env(900)] }, LIMITS.rateWindowMs + 1)
    expect(a.closed).toBeNull()
  })

  it('drops eph frames over their budget without closing, and keeps other sockets served', () => {
    const h = harness()
    const a = h.join()
    const b = h.join()
    const base = b.out.length
    for (let i = 0; i < EPH_MAX + 10; i++) h.say(a, { t: 'eph', env: env(i) })
    expect(a.closed).toBeNull()
    expect(b.out.length - base).toBe(EPH_MAX)
    h.say(b, { t: 'eph', env: env(1) })
    expect(last(a)).toEqual({ t: 'eph', env: env(1) })
  })

  it('writes the attachment back after every frame so budgets survive an eviction', () => {
    const h = harness()
    const a = h.join()
    h.say(a, { t: 'pub', envs: [env(1)] })
    h.say(a, { t: 'pub', envs: [env(2)] })
    expect(a.att?.count).toBe(2)
    h.say(a, { t: 'eph', env: env(3) })
    expect(a.att?.eph?.count).toBe(1)
  })
})

describe('RoomCore logs', () => {
  it('log event names, the short room hash and counts only', () => {
    const h = harness()
    const a = h.join()
    h.say(a, { t: 'pub', envs: [env(1)] })
    h.say(a, 'x'.repeat(MAX_FRAME_BYTES + 1))
    h.core.refuse(h.socket(), 'rh01')
    expect(h.logs).toEqual([
      { level: 'info', event: 'ws.open', fields: { rh: 'rh01', v: 2 } },
      { level: 'info', event: 'env.ok', fields: { rh: 'rh01', n: 1 } },
      { level: 'warn', event: 'msg.too-large', fields: { rh: 'rh01' } },
      { level: 'warn', event: 'ws.full', fields: { rh: 'rh01' } },
    ])
    const text = JSON.stringify(h.logs)
    expect(text).not.toContain(ROOM)
    expect(text).not.toContain('conn0001')
  })

  it('log rate limiting as rate.limited', () => {
    const h = harness()
    const a = h.join()
    for (let i = 0; i <= FRAME_MAX; i++) h.say(a, { t: 'pub', envs: [env(i)] })
    expect(h.logs.some((l) => l.event === 'rate.limited')).toBe(true)
  })
})
