import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { toAllure } from '../mutation-allure.mjs'

const m = (status: string, line = 1, mutatorName = 'EqualityOperator', replacement = 'a >= b') => ({ status, mutatorName, replacement, location: { start: { line } } })
const report = {
  files: {
    'packages/domain/src/a.ts': { mutants: [m('Killed'), m('Timeout'), m('Ignored'), m('Survived', 7), m('NoCoverage', 3, 'StringLiteral', '""')] },
    'packages/sync/src/b.ts': { mutants: [m('Killed')] },
  },
}
let n = 0
const run = () => toAllure(report, 1000, () => `id${n++}`) as { name: string; status: string; labels: { name: string; value: string }[]; statusDetails?: { message: string }; historyId: string }[]

describe('mutation report as Allure results', () => {
  it('has one result per package, failed when a mutant was not detected', () => {
    const results = run()
    const byName = Object.fromEntries(results.map((r) => [r.name, r]))
    expect(byName['domain: every mutant detected']!.status).toBe('failed')
    expect(byName['domain: every mutant detected']!.statusDetails!.message).toBe('50% (2 detected, 2 undetected of 4)')
    expect(byName['sync: every mutant detected']).toMatchObject({ status: 'passed', statusDetails: { message: '100% (1 detected, 0 undetected of 1)' } })
  })

  it('has one failed result per undetected mutant with its place and replacement, ordered by line', () => {
    const failed = run().filter((r) => !r.name.includes('every mutant'))
    expect(failed.map((r) => r.name)).toEqual(['packages/domain/src/a.ts:3 StringLiteral', 'packages/domain/src/a.ts:7 EqualityOperator'])
    expect(failed[0]!.statusDetails!.message).toBe('NoCoverage: StringLiteral at packages/domain/src/a.ts:3\nreplaced by: ""')
    expect(failed.every((r) => r.status === 'failed')).toBe(true)
  })

  it('groups results under Mutation testing by package, with a stable history id', () => {
    const [first] = run()
    expect(first!.labels).toContainEqual({ name: 'parentSuite', value: 'Mutation testing' })
    expect(first!.labels).toContainEqual({ name: 'suite', value: 'domain' })
    expect(run()[0]!.historyId).toBe(first!.historyId)
  })

  it('reports nothing for an empty report', () => {
    expect(toAllure({ files: {} })).toEqual([])
  })
})
