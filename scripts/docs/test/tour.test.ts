import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { listShots, webpCommand } from '../tour.mjs'

describe('the guide tour output', () => {
  it('converts a PNG to a lossy WebP without metadata, with cwebp or with ffmpeg', () => {
    const [cmd, args] = webpCommand('cwebp', 'a.png', 'a.webp') as [string, string[]]
    expect(cmd).toBe('cwebp')
    expect(args.slice(-3)).toEqual(['a.png', '-o', 'a.webp'])
    expect(args[args.indexOf('-metadata') + 1]).toBe('none')
    const [cmd2, args2] = webpCommand('ffmpeg', 'a.png', 'a.webp') as [string, string[]]
    expect(cmd2).toBe('ffmpeg')
    expect(args2).toContain('libwebp')
    expect(args2[args2.indexOf('-i') + 1]).toBe('a.png')
    expect(args2.at(-1)).toBe('a.webp')
  })

  it('lists the shots by language, variant and file, in a stable order, PNG only', () => {
    const root = mkdtempSync(join(tmpdir(), 'shots-'))
    for (const [l, v, f] of [['fr', 'light', 'b.png'], ['en', 'dark', 'a.png'], ['en', 'light', 'z.png'], ['en', 'light', 'a.png'], ['en', 'light', 'note.txt']]) {
      mkdirSync(join(root, l!, v!), { recursive: true })
      writeFileSync(join(root, l!, v!, f!), '')
    }
    expect(listShots(root)).toEqual([
      { locale: 'en', variant: 'dark', file: 'a.png' },
      { locale: 'en', variant: 'light', file: 'a.png' },
      { locale: 'en', variant: 'light', file: 'z.png' },
      { locale: 'fr', variant: 'light', file: 'b.png' },
    ])
    expect(listShots(join(root, 'missing'))).toEqual([])
  })
})
