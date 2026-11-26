import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { budgetFor, categories, evaluate, forFormFactor, median, renderTable, runsFor } from '../lighthouse-budget.mjs'

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
  it('a page can add a category of its own (the format page: SEO), and every run scores it', () => {
    const withSeo = { ...budgets, pages: { format: { performance: 0.95, seo: 0.9 } } }
    expect(categories(withSeo)).toEqual(['performance', 'accessibility', 'seo'])
    expect(budgetFor(withSeo, 'format')).toEqual({ performance: 0.95, accessibility: 0.95, seo: 0.9 })
    expect(evaluate([{ page: 'format', variant: 'light', scores: { performance: 1, accessibility: 1, seo: 0.5 } }], withSeo)).toEqual([{ page: 'format', variant: 'light', category: 'seo', score: 0.5, min: 0.9 }])
  })
  it('a page can raise its own minimums (the landing: the launch gate), the other pages keep the global ones', () => {
    const withPages = { ...budgets, pages: { landing: { performance: 0.95 } } }
    expect(categories(withPages)).toEqual(['performance', 'accessibility'])
    expect(budgetFor(withPages, 'landing')).toEqual({ performance: 0.95, accessibility: 0.95 })
    expect(budgetFor(withPages, 'new')).toEqual(budgets)
    const results = [
      { page: 'landing', variant: 'light', scores: { performance: 0.9, accessibility: 1 } },
      { page: 'new', variant: 'light', scores: { performance: 0.9, accessibility: 1 } },
    ]
    expect(evaluate(results, withPages)).toEqual([{ page: 'landing', variant: 'light', category: 'performance', score: 0.9, min: 0.95 }])
  })
  it('keeps the median of several runs, so one slow run does not decide', () => {
    expect(median([{ performance: 0.65, accessibility: 1 }, { performance: 0.97, accessibility: 1 }, { performance: 0.98, accessibility: 0.9 }])).toEqual({ performance: 0.97, accessibility: 1 })
    expect(median([{ performance: 0.5 }, { performance: 0.7 }])).toEqual({ performance: 0.6 })
    expect(median([{ performance: 0.8 }])).toEqual({ performance: 0.8 })
  })
  it('a form factor has its own budgets and an unknown one is refused', () => {
    const file = { mobile: { performance: 0.8, pages: { landing: { performance: 0.95 } } }, desktop: { performance: 0.9 } }
    expect(forFormFactor(file, 'mobile')).toBe(file.mobile)
    expect(budgetFor(forFormFactor(file, 'desktop'), 'landing')).toEqual({ performance: 0.9 })
    expect(() => forFormFactor(file, 'tablet')).toThrow('tablet')
  })
  it('the committed file budgets the landing at 0.95 performance on mobile, and the other pages keep theirs', async () => {
    const file = (await import('../../../quality/lighthouse-budgets.json')).default
    expect(budgetFor(forFormFactor(file, 'mobile'), 'landing').performance).toBe(0.95)
    expect(budgetFor(forFormFactor(file, 'mobile'), 'new').performance).toBe(0.8)
    expect(budgetFor(forFormFactor(file, 'desktop'), 'new').performance).toBe(0.8)
  })
  it('a landing median under 0.95 on mobile fails and the failure and the table name the form factor', () => {
    const file = { mobile: { performance: 0.8, accessibility: 0.95, pages: { landing: { performance: 0.95 } } } }
    const runs = [{ performance: 0.9, accessibility: 1 }, { performance: 0.97, accessibility: 1 }, { performance: 0.91, accessibility: 1 }]
    const results = [{ page: 'landing', variant: 'light', formFactor: 'mobile', scores: median(runs) }]
    const failures = evaluate(results, forFormFactor(file, 'mobile'))
    expect(failures).toEqual([{ page: 'landing', variant: 'light', formFactor: 'mobile', category: 'performance', score: 0.91, min: 0.95 }])
    const table = renderTable(results, failures)
    expect(table).toContain('| Form factor | Page | Variant |')
    expect(table).toContain('| mobile | landing | light | 91 FAIL | 100 |')
  })
  it('scores the landing on mobile three times, the other pages once, and an explicit --runs wins', () => {
    expect(runsFor({ page: 'landing', formFactor: 'mobile' })).toBe(3)
    expect(runsFor({ page: 'landing', formFactor: 'mobile', fallback: 5 })).toBe(5)
    expect(runsFor({ page: 'landing', formFactor: 'desktop' })).toBe(1)
    expect(runsFor({ page: 'new', formFactor: 'mobile' })).toBe(1)
    expect(runsFor({ page: 'new', formFactor: 'mobile', fallback: 5 })).toBe(5)
    expect(runsFor({ page: 'landing', formFactor: 'mobile', explicit: 1, fallback: 5 })).toBe(1)
    expect(runsFor({ page: 'new', formFactor: 'desktop', explicit: 7 })).toBe(7)
  })
})
