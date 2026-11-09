import { describe, expect, it } from 'vitest'
import { admit, allow, CLOSE_RATE_LIMIT, CLOSE_TOO_LARGE, checkFrame, EPH_MAX, FRAME_MAX, MAX_FRAME_BYTES, SIG_MAX } from '../src'

const ROOM = 'Ab3dEfGhIjKlMnOpQrStUv'
const env = (i: number) => ({ v: 2, room: ROOM, id: `01J${String(i).padStart(23, '0')}`, hlc: i, ct: 'AAAA' })
const pub = (i = 1) => JSON.stringify({ t: 'pub', envs: [env(i)] })
const eph = JSON.stringify({ t: 'eph', env: env(1) })
const sig = JSON.stringify({ t: 'sig', to: 'abcdef012345', env: env(1) })
const fresh = () => ({ windowStart: 0, count: 0 })

describe('allow', () => {
  it('limits frames per window and starts a new window after it', () => {
    const w = fresh()
    expect([1, 2, 3].map(() => allow(w, 10, 2, 1000))).toEqual([true, true, false])
    expect(allow(w, 1000, 2, 1000)).toBe(false) // exactly one window later is still the same window
    expect(allow(w, 1011, 2, 1000)).toBe(true)
    expect(w).toEqual({ windowStart: 1011, count: 1 })
  })
})

describe('admit (per-socket budgets)', () => {
  it('closes on board-frame abuse but only drops excess live frames', () => {
    const b = fresh()
    const live = Array.from({ length: EPH_MAX + 5 }, () => admit(b, 'live', 1_000, 10_000))
    expect(live.filter((v) => v === 'ok')).toHaveLength(EPH_MAX)
    expect(live.at(-1)).toBe('drop')
    // Live traffic does not eat the board budget.
    const frames = Array.from({ length: FRAME_MAX + 1 }, () => admit(b, 'board', 1_000, 10_000))
    expect(frames.filter((v) => v === 'ok')).toHaveLength(FRAME_MAX)
    expect(frames.at(-1)).toBe('close')
    // A new window resets both.
    expect([admit(b, 'live', 12_000, 10_000), admit(b, 'board', 12_000, 10_000)]).toEqual(['ok', 'ok'])
  })

  it('signalling has its own budget and is dropped, never fatal', () => {
    const b = fresh()
    const out = Array.from({ length: SIG_MAX + 1 }, () => admit(b, 'sig', 1_000, 10_000))
    expect(out.filter((v) => v === 'ok')).toHaveLength(SIG_MAX)
    expect(out.at(-1)).toBe('drop')
    expect(admit(b, 'board', 1_000, 10_000)).toBe('ok')
  })
})

describe('checkFrame', () => {
  it('closes with 1009 on a frame over the size limit, and on a binary frame', () => {
    expect(CLOSE_TOO_LARGE).toEqual({ code: 1009, reason: 'Message too large' })
    expect(checkFrame(fresh(), 'x'.repeat(MAX_FRAME_BYTES + 1), 0, 10_000)).toEqual({ verdict: 'close', code: 1009, reason: 'Message too large' })
    expect(checkFrame(fresh(), new ArrayBuffer(4), 0, 10_000)).toMatchObject({ verdict: 'close', code: 1009 })
  })

  it('the size limit itself is still accepted', () => {
    const exact = 'x'.repeat(MAX_FRAME_BYTES)
    expect(checkFrame(fresh(), exact, 0, 10_000)).toEqual({ verdict: 'ok', frame: null })
  })

  it('returns the parsed frame, or null for anything that is not a client frame', () => {
    expect(checkFrame(fresh(), pub(), 0, 10_000)).toMatchObject({ verdict: 'ok', frame: { t: 'pub' } })
    expect(checkFrame(fresh(), 'not json', 0, 10_000)).toEqual({ verdict: 'ok', frame: null })
    expect(checkFrame(fresh(), '{"t":"nope"}', 0, 10_000)).toEqual({ verdict: 'ok', frame: null })
  })

  it('counts a board frame, a live frame and a signalling frame against their own budgets', () => {
    const b = fresh()
    for (let i = 0; i < EPH_MAX; i++) expect(checkFrame(b, eph, 1_000, 10_000).verdict).toBe('ok')
    expect(checkFrame(b, eph, 1_000, 10_000)).toEqual({ verdict: 'drop' })
    const s = fresh()
    for (let i = 0; i < SIG_MAX; i++) expect(checkFrame(s, sig, 1_000, 10_000).verdict).toBe('ok')
    expect(checkFrame(s, sig, 1_000, 10_000)).toEqual({ verdict: 'drop' })
    expect(checkFrame(s, pub(), 1_000, 10_000).verdict).toBe('ok')
  })

  it('closes with 1008 above the board budget, and an invalid frame counts as a board frame', () => {
    expect(CLOSE_RATE_LIMIT).toEqual({ code: 1008, reason: 'Rate limit' })
    const b = fresh()
    for (let i = 0; i < FRAME_MAX; i++) expect(checkFrame(b, i % 2 ? 'junk' : pub(i), 1_000, 10_000).verdict).toBe('ok')
    expect(checkFrame(b, pub(), 1_000, 10_000)).toEqual({ verdict: 'close', code: 1008, reason: 'Rate limit' })
  })
})
