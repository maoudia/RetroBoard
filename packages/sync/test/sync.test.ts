import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { ahead, compareEvents, dominates, HybridClock, MAX_DRIFT_MS, merge, observe, type VersionVector } from '../src'

describe('HybridClock', () => {
  it('is strictly increasing even when the wall clock stalls or goes back', () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 0, max: 1e6 }), { minLength: 1, maxLength: 50 }), (walls) => {
      let i = 0
      const clock = new HybridClock(() => walls[Math.min(i++, walls.length - 1)]!)
      const seen = walls.map(() => clock.tick())
      return seen.every((v, k) => k === 0 || v > seen[k - 1]!)
    }))
  })

  it('never goes behind a received event, but caps runaway remote clocks', () => {
    const clock = new HybridClock(() => 1_000)
    clock.receive(5_000)
    expect(clock.tick()).toBe(5_001)
    clock.receive(10 ** 12)
    expect(clock.current).toBe(1_000 + MAX_DRIFT_MS)
  })
})

describe('event order', () => {
  it('is a total order independent of arrival order', () => {
    const ev = fc.record({ at: fc.integer({ min: 0, max: 50 }), id: fc.string({ minLength: 1, maxLength: 4 }) })
    fc.assert(fc.property(fc.uniqueArray(ev, { selector: (e) => e.id, maxLength: 40 }), fc.integer(), (events, seed) => {
      const shuffled = [...events].sort(() => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - 0.5)
      return JSON.stringify([...events].sort(compareEvents)) === JSON.stringify(shuffled.sort(compareEvents))
    }))
  })
})

describe('version vectors', () => {
  const vv = fc.dictionary(fc.constantFrom('a', 'b', 'c', 'd'), fc.integer({ min: 0, max: 100 }))

  it('merge is commutative, associative, idempotent and dominates both sides', () => {
    fc.assert(fc.property(vv, vv, vv, (a, b, c) => {
      expect(merge(a, b)).toEqual(merge(b, a))
      expect(merge(merge(a, b), c)).toEqual(merge(a, merge(b, c)))
      expect(merge(a, a)).toEqual(a)
      return dominates(merge(a, b), a) && dominates(merge(a, b), b)
    }))
  })

  it('ahead lists exactly what the other side is missing', () => {
    fc.assert(fc.property(vv, vv, (mine, theirs) => {
      const gaps = ahead(mine, theirs)
      const patched: VersionVector = Object.keys(gaps).reduce((v, k) => observe(v, k, mine[k]!), theirs)
      return dominates(patched, mine) && Object.keys(gaps).every((k) => (theirs[k] ?? -1) < mine[k]!)
    }))
  })

  it('observe keeps the maximum', () => {
    expect(observe(observe({}, 'a', 5), 'a', 3)).toEqual({ a: 5 })
  })
})
