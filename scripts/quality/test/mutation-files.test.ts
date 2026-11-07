import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { split } from '../mutation-files.mjs'

const f = (path: string, size: number) => ({ path, size })

describe('mutation shards of a package', () => {
  it('covers every file exactly once', () => {
    const files = Array.from({ length: 11 }, (_, i) => f(`f${i}.ts`, (i + 1) * 100))
    const shards: string[][] = split(files, 3)
    expect(shards.flat().sort()).toEqual(files.map((x) => x.path).sort())
  })

  it('balances by size, the biggest file first', () => {
    const shards: string[][] = split([f('big.ts', 100), f('a.ts', 30), f('b.ts', 30), f('c.ts', 30), f('d.ts', 10)], 2)
    expect(shards).toEqual([['big.ts'], ['a.ts', 'b.ts', 'c.ts', 'd.ts']].map((s) => s.sort()))
  })

  it('is stable and keeps one shard whole', () => {
    const files = [f('b.ts', 5), f('a.ts', 5)]
    expect(split(files, 2)).toEqual(split([...files].reverse(), 2))
    expect(split(files, 1)).toEqual([['a.ts', 'b.ts']])
  })
})
