import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { restSpecs } from '../../e2e-rest.mjs'

describe('e2e specs outside the push gate', () => {
  it('are every spec file that core.json does not list, sorted, and nothing else', () => {
    expect(restSpecs(['b.spec.ts', 'a.spec.ts', 'core.json', 'helpers.ts', 'c.spec.ts'], ['c'])).toEqual(['a.spec.ts', 'b.spec.ts'])
    expect(restSpecs([], [])).toEqual([])
  })

  it('together with the core gate cover the whole suite, with no spec in both', () => {
    const dir = join(import.meta.dirname, '../../../tests/e2e')
    const all = readdirSync(dir).filter((f) => f.endsWith('.spec.ts'))
    const core = (JSON.parse(readFileSync(join(dir, 'core.json'), 'utf8')) as { specs: string[] }).specs.map((s) => `${s}.spec.ts`)
    const rest = restSpecs(readdirSync(dir), (JSON.parse(readFileSync(join(dir, 'core.json'), 'utf8')) as { specs: string[] }).specs)
    expect(core.every((f) => all.includes(f))).toBe(true)
    expect([...core, ...rest].sort()).toEqual(all.sort())
    expect(rest.filter((f) => core.includes(f))).toEqual([])
  })
})
