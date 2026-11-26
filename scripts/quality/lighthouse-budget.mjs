// Lighthouse budgets (change quality-gates-v2). Pure evaluator: scores in [0,1] against minimums.
/** The score categories of a budget file: the global keys and any category a page adds (the per-page overrides). */
export function categories(budgets) {
  const { pages = {}, ...global } = budgets
  return [...new Set([...Object.keys(global), ...Object.values(pages).flatMap((p) => Object.keys(p))])]
}

/** The middle score of each category over several runs of one page: one slow run on a shared runner does not fail the budget. */
export function median(runs) {
  const keys = Object.keys(runs[0] ?? {})
  return Object.fromEntries(keys.map((k) => {
    const sorted = runs.map((r) => r[k] ?? 0).sort((a, b) => a - b)
    const mid = sorted.length >> 1
    return [k, sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2]
  }))
}

/** Minimums for one page: the global ones, raised by the page's own entry (`pages`, change landing-speed-and-accessibility). */
export function budgetFor(budgets, page) {
  const { pages = {}, ...global } = budgets
  return { ...global, ...(pages[page] ?? {}) }
}

/** The budgets of one form factor ('mobile' or 'desktop'): the file holds one object per form factor (change public-launch, task 3.1). */
export function forFormFactor(file, formFactor) {
  const budgets = file[formFactor]
  if (!budgets) throw new Error(`no budgets for the form factor "${formFactor}" (known: ${Object.keys(file).join(', ')})`)
  return budgets
}

/** How many times a page is scored: `--runs` (explicit) wins; otherwise LIGHTHOUSE_RUNS (fallback), and the landing on mobile is scored at least 3 times (a cold first run reads 13 to 16 points low). */
export function runsFor({ page, formFactor, explicit, fallback = 1 }) {
  if (explicit !== undefined) return Math.max(1, Math.trunc(explicit))
  const base = Math.max(1, Math.trunc(fallback))
  return page === 'landing' && formFactor === 'mobile' ? Math.max(base, 3) : base
}

/** results: [{ page, variant, formFactor?, scores: { performance, accessibility, 'best-practices' } }] */
export function evaluate(results, budgets) {
  const failures = []
  for (const r of results) {
    for (const [category, min] of Object.entries(budgetFor(budgets, r.page))) {
      const score = r.scores[category]
      if (typeof score !== 'number' || score < min) failures.push({ page: r.page, variant: r.variant, ...(r.formFactor && { formFactor: r.formFactor }), category, score: score ?? null, min })
    }
  }
  return failures
}

export function renderTable(results, failures) {
  const key = (r) => `${r.formFactor ?? ''}|${r.page}|${r.variant}`
  const bad = new Set(failures.map((f) => `${key(f)}|${f.category}`))
  const withFactor = results.some((r) => r.formFactor)
  const cats = results.length ? Object.keys(results[0].scores) : []
  const cell = (r, c) => `${Math.round((r.scores[c] ?? 0) * 100)}${bad.has(`${key(r)}|${c}`) ? ' FAIL' : ''}`
  return [
    `| ${withFactor ? 'Form factor | ' : ''}Page | Variant | ${cats.join(' | ')} |`,
    `|${withFactor ? '---|' : ''}---|---|${cats.map(() => '---').join('|')}|`,
    ...results.map((r) => `| ${withFactor ? `${r.formFactor} | ` : ''}${r.page} | ${r.variant} | ${cats.map((c) => cell(r, c)).join(' | ')} |`),
  ].join('\n')
}
