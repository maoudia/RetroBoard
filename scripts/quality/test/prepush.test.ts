import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { gate, STEPS } from '../prepush.mjs'

describe('local gate', () => {
  it('runs every step in order and stops at the first failure', () => {
    const seen: string[] = []
    const result = gate(STEPS, (cmd: string[]) => { seen.push(cmd.join(' ')); return cmd[1] === 'size' ? 1 : 0 })
    expect(result).toMatchObject({ ok: false, failed: 'size' })
    expect(seen).toEqual(['pnpm verify', 'pnpm generate', 'pnpm size'])
  })

  it('skips the core e2e with --fast only', () => {
    const names = (fast: boolean) => gate(STEPS, () => 0, { fast }).ran.map((r: { name: string }) => r.name)
    expect(names(false)).toContain('e2e:core')
    expect(names(true)).not.toContain('e2e:core')
  })

  it('fails on an over-budget bundle: the gate must catch it before the push', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bundle-'))
    mkdirSync(join(dir, '_nuxt'))
    writeFileSync(join(dir, 'index.html'), '<script src="/_nuxt/entry.js"></script>')
    writeFileSync(join(dir, '_nuxt', 'entry.js'), randomBytes(400_000)) // does not compress: about 390 kB gzip
    const run = spawnSync('node', [new URL('../../check-bundle-size.mjs', import.meta.url).pathname, dir], { encoding: 'utf8' })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('Bundle budget exceeded')
  })
})
