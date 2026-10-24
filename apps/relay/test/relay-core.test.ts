import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Envelope } from '@retroboard/protocol'
import { allow, chunk, EnvelopeBuffer } from '../src/relay-core'

const env = (i: number, ct = 'AAAA'): Envelope => ({ v: 2, room: 'Ab3dEfGhIjKlMnOpQrStUv', id: `01J${String(i).padStart(23, '0')}`, hlc: i, ct })

describe('EnvelopeBuffer', () => {
  it('dedups by id and returns only fresh envelopes', () => {
    const b = new EnvelopeBuffer()
    expect(b.add([env(1), env(2)])).toHaveLength(2)
    expect(b.add([env(2), env(3)]).map((e) => e.hlc)).toEqual([3])
    expect(b.size).toBe(3)
  })

  it('evicts the oldest past the count and byte budgets', () => {
    const b = new EnvelopeBuffer(3, 10_000)
    b.add([1, 2, 3, 4, 5].map((i) => env(i)))
    expect(b.history()[0]).toMatchObject({ t: 'hist', done: true })
    expect((b.history()[0] as { envs: Envelope[] }).envs.map((e) => e.hlc)).toEqual([3, 4, 5])
    const small = new EnvelopeBuffer(100, 300)
    small.add([env(1, 'A'.repeat(100)), env(2, 'A'.repeat(100))])
    expect(small.size).toBe(1)
  })

  it('pages history and always ends with done', () => {
    expect(new EnvelopeBuffer().history()).toEqual([{ t: 'hist', envs: [], done: true }])
    const b = new EnvelopeBuffer()
    b.add(Array.from({ length: 450 }, (_, i) => env(i)))
    const pages = b.history()
    expect(pages.map((p) => (p as { envs: unknown[] }).envs.length)).toEqual([200, 200, 50])
    expect(pages.map((p) => (p as { done: boolean }).done)).toEqual([false, false, true])
  })
})

describe('chunk and rate', () => {
  it('splits by bytes', () => {
    expect(chunk([env(1, 'A'.repeat(600)), env(2, 'A'.repeat(600))], 1000)).toHaveLength(2)
  })
  it('limits frames per window', () => {
    const w = { windowStart: 0, count: 0 }
    expect([1, 2, 3].map(() => allow(w, 10, 2, 1000))).toEqual([true, true, false])
    expect(allow(w, 2000, 2, 1000)).toBe(true)
  })
})

describe('no server-side storage (docs/PLAN.md 5.3)', () => {
  it('the v2 relay never references the storage API', () => {
    for (const f of ['relay-room.ts', 'relay-core.ts']) {
      const src = readFileSync(fileURLToPath(new URL(`../src/${f}`, import.meta.url).href), 'utf8')
      expect(src.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')).not.toMatch(/\bstorage\b|\bsetAlarm\b|\bKV\b|\bD1\b|\bR2\b/)
    }
  })
})

describe('admit (per-socket budgets)', () => {
  it('closes on board-frame abuse but only drops excess live frames', async () => {
    const { admit, EPH_MAX, FRAME_MAX } = await import('../src/relay-core')
    const b = { windowStart: 0, count: 0 }
    const live = Array.from({ length: EPH_MAX + 5 }, () => admit(b, true, 1_000, 10_000))
    expect(live.filter((v) => v === 'ok')).toHaveLength(EPH_MAX)
    expect(live.at(-1)).toBe('drop')
    // Live traffic does not eat the board budget.
    const frames = Array.from({ length: FRAME_MAX + 1 }, () => admit(b, false, 1_000, 10_000))
    expect(frames.filter((v) => v === 'ok')).toHaveLength(FRAME_MAX)
    expect(frames.at(-1)).toBe('close')
    // A new window resets both.
    expect([admit(b, true, 12_000, 10_000), admit(b, false, 12_000, 10_000)]).toEqual(['ok', 'ok'])
  })
})
