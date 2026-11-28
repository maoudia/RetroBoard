import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { archivedIds, evaluate, GATE_IDS, lowestPerformance, renderReport, streakOf } from '../readiness.mjs'
import gates from '../gates.json'

const root = join(__dirname, '..', '..', '..')
const passing = { streak: 14, lighthouse: 0.97, axe: true, archived: [...gates.archived], guide: true, skipped: [] }
const rows = (over: Record<string, unknown> = {}) => evaluate({ ...passing, ...over }, gates) as { id: string; ok: boolean; detail: string }[]

describe('the launch readiness gates', () => {
  it('a passing run is green on every gate and the report says ready', () => {
    expect(rows().map((r) => r.id)).toEqual(GATE_IDS)
    expect(rows().every((r) => r.ok)).toBe(true)
    const report = renderReport(rows(), '2026-12-12') as string
    expect(report).toContain('on 2026-12-12')
    expect(report).toContain('Verdict: **ready**')
    expect(report).not.toContain('RED')
  })
  it('a failing run names each red gate and the report says not ready', () => {
    const r = rows({ streak: 9, lighthouse: 0.91, axe: false, archived: ['brand-identity'], guide: false })
    expect(r.filter((x) => !x.ok).map((x) => x.id)).toEqual(GATE_IDS)
    expect(r[0]!.detail).toBe('9 of 14')
    expect(r[1]!.detail).toBe('lowest median 91')
    expect(r[3]!.detail).toBe('still open: landing-v2-and-product-video')
    expect(renderReport(r, '2026-12-01')).toContain('Verdict: **not ready**, 5 gate(s) red.')
  })
  it('a gate that was not measured or was skipped is never a pass', () => {
    expect(rows({ streak: null })[0]).toMatchObject({ ok: false, detail: 'not measured' })
    expect(rows({ skipped: ['lighthouse'] })[1]).toMatchObject({ ok: false, detail: 'skipped, not measured' })
  })
  it('the landing at exactly the budget passes', () => expect(rows({ lighthouse: 0.95 })[1]!.ok).toBe(true))

  it('reads the Lighthouse table and keeps the lowest performance of the page', () => {
    const table = ['| Form factor | Page | Variant | performance | accessibility |', '|---|---|---|---|---|', '| mobile | landing | light | 97 | 100 |', '| mobile | landing | dark | 94 FAIL | 100 |', '| mobile | new | light | 70 | 100 |', '| desktop | landing | light | 99 | 100 |'].join('\n')
    expect(lowestPerformance(table, 'mobile', 'landing')).toBe(0.94)
    expect(lowestPerformance(table, 'desktop', 'landing')).toBe(0.99)
    expect(lowestPerformance(table, 'mobile', 'format')).toBeNull()
    expect(lowestPerformance('', 'mobile', 'landing')).toBeNull()
  })
  it('reads the streak line and the archive', () => {
    expect(streakOf('12 green night(s) in a row (target 14); last 30 scheduled runs: green')).toBe(12)
    expect(streakOf('')).toBeNull()
    expect(archivedIds(['2026-11-20-brand-identity', 'other'], gates.archived)).toEqual(['brand-identity'])
  })
})

describe('docs/roadmap.md quotes the gate values', () => {
  const roadmap = readFileSync(join(root, 'docs/roadmap.md'), 'utf8')
  it('the streak, the Lighthouse floor and the gates', () => {
    expect(roadmap).toContain(`${gates.streak.target} green nights in a row`)
    expect(roadmap).toContain(`Lighthouse ${gates.lighthouse.formFactor} above ${Math.round(gates.lighthouse.performance * 100)} on the ${gates.lighthouse.page}`)
    expect(roadmap).toContain('axe without violation on the public pages')
    expect(roadmap).toContain('pnpm launch:check')
  })
})
