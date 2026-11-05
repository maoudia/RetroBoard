import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { evaluate, renderTable } from '../lighthouse-budget.mjs'

const budgets = { performance: 0.8, accessibility: 0.95 }

describe('lighthouse budgets', () => {
  it('passes when every score meets its minimum', () => {
    expect(evaluate([{ page: 'landing', variant: 'light', scores: { performance: 0.9, accessibility: 1 } }], budgets)).toEqual([])
  })
  it('fails on a fixture under budget and names page, variant and category', () => {
    const results = [{ page: 'new', variant: 'dark', scores: { performance: 0.55, accessibility: 1 } }]
    const failures = evaluate(results, budgets)
    expect(failures).toEqual([{ page: 'new', variant: 'dark', category: 'performance', score: 0.55, min: 0.8 }])
    expect(renderTable(results, failures)).toContain('55 FAIL')
  })
  it('fails when a category is missing', () => {
    expect(evaluate([{ page: 'x', variant: 'light', scores: { performance: 1 } }], budgets)).toHaveLength(1)
  })
})
