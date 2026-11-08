import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The guide pictures ship with the static site: every one is small, and together they stay under a fixed budget.
const IMG = 'apps/web/public/guide/img'
const files = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)])) : [])

describe('guide pictures', () => {
  const pictures = files(IMG)

  it('are WebP files, each at most 150 KB', () => {
    expect(pictures.length).toBeGreaterThan(0)
    for (const f of pictures) {
      expect(f.endsWith('.webp'), f).toBe(true)
      expect(statSync(f).size, f).toBeLessThanOrEqual(150 * 1024)
    }
  })

  it('weigh 3 MB in total at most (the entry bundle budget of `pnpm size` is untouched: pictures are static assets)', () => {
    expect(pictures.reduce((n, f) => n + statSync(f).size, 0)).toBeLessThanOrEqual(3 * 1024 * 1024)
  })
})
