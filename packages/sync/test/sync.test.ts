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

describe('HybridClock floor', () => {
  it('a device whose clock is far behind still stamps after what its log holds', () => {
    const clock = new HybridClock(() => 1_000)
    clock.receive(1_000 + 3_600_000) // learned, but capped at wall + MAX_DRIFT_MS
    expect(clock.tick(3_600_000)).toBe(3_600_001)
    expect(clock.tick(3_600_000)).toBe(3_600_002)
  })

  it('without a floor the stamp follows the wall clock as before', () => {
    const clock = new HybridClock(() => 5_000)
    expect(clock.tick()).toBe(5_000)
    expect(clock.tick(0)).toBe(5_001)
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

describe('order of events, exactly', () => {
  it('sorts by clock first, by id only on a tie, and calls the same event equal', () => {
    expect(compareEvents({ at: 1, id: 'z' }, { at: 4, id: 'a' })).toBe(-3)
    expect(compareEvents({ at: 4, id: 'a' }, { at: 1, id: 'z' })).toBe(3)
    expect(compareEvents({ at: 2, id: 'a' }, { at: 2, id: 'b' })).toBe(-1)
    expect(compareEvents({ at: 2, id: 'b' }, { at: 2, id: 'a' })).toBe(1)
    expect(compareEvents({ at: 2, id: 'a' }, { at: 2, id: 'a' })).toBe(0)
  })
})

describe('version vectors, exactly', () => {
  it('keeps the very same vector when the author is already at that clock or beyond', () => {
    const vv = { a: 5 }
    expect(observe(vv, 'a', 5)).toBe(vv)
    expect(observe(vv, 'a', 3)).toBe(vv)
    expect(observe(vv, 'a', 6)).toEqual({ a: 6 })
    expect(observe(vv, 'b', 0)).toEqual({ a: 5, b: 0 })
  })

  it('merges to the highest clock per author and never invents an author the other side has not seen', () => {
    expect(merge({ a: 1, b: 9 }, { a: 4, c: 2 })).toEqual({ a: 4, b: 9, c: 2 })
    expect(merge({ a: 5 }, { a: 5 })).toEqual({ a: 5 })
    expect(merge({}, { a: -1 })).toEqual({})
  })

  it('says a vector dominates another only when it has seen every author up to its clock', () => {
    expect(dominates({ a: 2, b: 1 }, { a: 2 })).toBe(true)
    expect(dominates({ a: 2 }, { a: 2, b: 0 })).toBe(false)
    expect(dominates({ a: 1 }, { a: 2 })).toBe(false)
    expect(dominates({}, { x: 0 })).toBe(false)
    expect(dominates({}, { x: 1 })).toBe(false)
    expect(dominates({}, {})).toBe(true)
    expect(dominates({ a: 0 }, {})).toBe(true)
  })

  it('lists the authors I am ahead on, with the clock to send from (exclusive; -1 for an author they have not seen)', () => {
    expect(ahead({ a: 5, b: 2 }, { a: 3, b: 2 })).toEqual({ a: 3 })
    expect(ahead({ a: 5 }, {})).toEqual({ a: -1 })
    expect(ahead({ a: 0 }, {})).toEqual({ a: -1 })
    expect(ahead({ a: 0 }, { a: 0 })).toEqual({})
    expect(ahead({}, { a: 9 })).toEqual({})
  })
})

