import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** Design system guard (docs/design-system.md): type and small radii come from the shared scales. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.(vue|css)$/.test(n) ? [p] : []
  })
}
const root = join(__dirname, '..', 'app')
const all = files(root).map((f) => ({ f, s: readFileSync(f, 'utf8') }))

const decl = (prop: string) => all.flatMap(({ f, s }) => [...s.matchAll(new RegExp(`${prop}: *([^;}]+)(?=[;}])`, 'g'))].map((m) => ({ f: f.replace(`${root}/`, ''), v: m[1]!.trim() })))

describe('design tokens', () => {
  it('font sizes use the type scale, a fluid clamp or inherit', () => {
    const bad = decl('font-size').filter(({ v }) => !/^(var\(--fs-(xs|sm|md|lg|xl|2xl|3xl)\)|inherit|clamp\(.*\)|calc\(.*\)|[\d.]+em|[\d.]+%|larger|smaller)$/.test(v))
    expect(bad, 'use var(--fs-*) from base.css').toEqual([])
  })

  it('radii use the radius tokens (pills, circles and hairline bars stay literal; marketing pages are exempt)', () => {
    const marketing = /^(components\/Landing|pages\/index\.vue)/
    const one = /^(0|50%|999px|[1-4]px|var\(--[\w-]+(, *[^)]+)?\)|calc\(.+\)|[\d.]+%|inherit)$/
    const parts = (v: string) => v.replace(/var\([^)]*\)|calc\([^)]*\)/g, (m) => m.replace(/ /g, '')).split(/ +/)
    const bad = decl('border-radius').filter(({ f, v }) => !marketing.test(f) && !v.startsWith('calc(') && !parts(v).every((x) => one.test(x)))
    expect(bad.map((b) => `${b.f}: ${b.v}`), 'use var(--r-xs|--r-sm|--r-control|--r-card)').toEqual([])
  })

  it('the shared scales exist in base.css', () => {
    const base = readFileSync(join(root, 'assets/css/base.css'), 'utf8')
    for (const t of ['--fs-xs', '--fs-sm', '--fs-md', '--fs-lg', '--fs-xl', '--fs-2xl', '--fs-3xl', '--r-xs', '--r-sm', '--sp-1', '--dur-base']) expect(base).toContain(`${t}:`)
  })
})
