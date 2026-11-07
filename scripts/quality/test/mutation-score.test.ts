import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { failuresOf, score } from '../mutation-score.mjs'

const file = (...statuses: string[]) => ({ mutants: statuses.map((status) => ({ status })) })
const floor = { score: 100, packages: { domain: 100, sync: 100 } }

describe('mutation ratchet', () => {
  it('scores detected over detected plus undetected, ignoring the ignored ones', () => {
    const r = score({ 'packages/domain/src/a.ts': file('Killed', 'Timeout', 'Ignored'), 'packages/sync/src/b.ts': file('Killed', 'Survived', 'NoCoverage', 'CompileError') })
    expect(r.packages.domain.score).toBe(100)
    expect(r.packages.sync).toMatchObject({ score: 33.33, survived: 1, noCoverage: 1 })
    expect(r.score).toBe(60)
  })

  it('passes at 100 percent everywhere', () => {
    const current = score({ 'packages/domain/src/a.ts': file('Killed'), 'packages/sync/src/b.ts': file('Killed', 'Timeout') })
    expect(failuresOf(current, floor, null)).toEqual([])
  })

  it('fails on one surviving mutant, for the package and for the total', () => {
    const current = score({ 'packages/domain/src/a.ts': file(...Array(199).fill('Killed'), 'Survived'), 'packages/sync/src/b.ts': file('Killed') })
    const failures = failuresOf(current, floor, null)
    expect(failures).toHaveLength(2)
    expect(failures[0]).toContain('overall')
    expect(failures[1]).toContain('domain 99.5% is below its floor 100%')
  })

  it('fails on a mutant without coverage as on a survivor', () => {
    const current = score({ 'packages/domain/src/a.ts': file('Killed', 'NoCoverage'), 'packages/sync/src/b.ts': file('Killed') })
    expect(failuresOf(current, floor, null).some((f) => f.startsWith('domain'))).toBe(true)
  })

  it('fails on any drop from the previous main run, with no tolerance', () => {
    const current = score({ 'packages/domain/src/a.ts': file('Killed') })
    const prev = { score: 100, commit: 'abcdef123456', packages: { domain: { score: 100 } } }
    expect(failuresOf(current, { score: 0, packages: {} }, prev)).toEqual([])
    const worse = score({ 'packages/domain/src/a.ts': file(...Array(999).fill('Killed'), 'Survived') })
    const failures = failuresOf(worse, { score: 0, packages: {} }, prev)
    expect(failures[0]).toContain('regressed from 100% on the previous main run (abcdef1)')
    expect(failures[1]).toContain('domain 99.9% regressed from 100%')
  })
})
