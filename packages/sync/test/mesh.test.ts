import { describe, expect, it } from 'vitest'
import { seederOf, chunks, FULL_MESH_MAX, isFullMesh, isInitiator, meshLinks, SeenSet } from '../src/mesh'

const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${String(i).padStart(3, '0')}`)

/** Breadth-first distances from one node over the links graph. */
function eccentricity(start: string, conns: string[]): number {
  const dist = new Map([[start, 0]])
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()!
    for (const nb of meshLinks(cur, conns)) if (!dist.has(nb)) { dist.set(nb, dist.get(cur)! + 1); queue.push(nb) }
  }
  return dist.size === conns.length ? Math.max(...dist.values()) : Infinity
}

describe('mesh topology', () => {
  it('links everybody to everybody up to 12 participants', () => {
    const c = ids(FULL_MESH_MAX)
    expect(meshLinks('c000', c)).toEqual(c.slice(1))
    expect(isFullMesh(12)).toBe(true)
    expect(isFullMesh(13)).toBe(false)
  })

  it('is the same graph from both ends, whatever the order of the list', () => {
    for (const n of [2, 5, 12, 13, 20, 30]) {
      const c = ids(n)
      const shuffled = [...c].reverse()
      for (const a of c) {
        expect(meshLinks(a, shuffled)).toEqual(meshLinks(a, c))
        for (const b of meshLinks(a, c)) expect(meshLinks(b, c)).toContain(a)
      }
    }
  })

  it('keeps big boards connected with few links per peer and a small diameter', () => {
    for (const n of [13, 20, 30]) {
      const c = ids(n)
      for (const a of c) expect(meshLinks(a, c).length).toBeLessThanOrEqual(2 * 3 + 2)
      expect(Math.max(...c.map((a) => eccentricity(a, c)))).toBeLessThanOrEqual(4)
    }
  })

  it('handles strangers, duplicates and tiny rooms', () => {
    expect(meshLinks('zz', ids(3))).toEqual([])
    expect(meshLinks('c000', ['c000'])).toEqual([])
    expect(meshLinks('c000', ['c001', 'c000', 'c001'])).toEqual(['c001'])
  })

  it('the lower id sends the offer', () => {
    expect([isInitiator('a', 'b'), isInitiator('b', 'a')]).toEqual([true, false])
  })
})

describe('seeder', () => {
  it('is the lowest id among the peers that hold the board, null when nobody does', () => {
    expect(seederOf([])).toBeNull()
    expect(seederOf(['c', 'a', 'b'])).toBe('a')
    expect(seederOf(['b'])).toBe('b')
  })
})

describe('helpers', () => {
  it('chunks lists', () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunks([], 3)).toEqual([])
    expect(chunks([1, 2], 0)).toEqual([[1], [2]])
  })

  it('remembers recent ids only, to forward each frame once', () => {
    const s = new SeenSet(2)
    expect([s.add('a'), s.add('a'), s.add('b'), s.add('c')]).toEqual([true, false, true, true])
    // 'a' was evicted by 'c'.
    expect(s.add('a')).toBe(true)
    expect(s.add('c')).toBe(false)
  })
})
