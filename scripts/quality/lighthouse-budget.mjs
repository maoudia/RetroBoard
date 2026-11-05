// Lighthouse budgets (change quality-gates-v2). Pure evaluator: scores in [0,1] against minimums.
/** results: [{ page, variant, scores: { performance, accessibility, 'best-practices' } }] */
export function evaluate(results, budgets) {
  const failures = []
  for (const r of results) {
    for (const [category, min] of Object.entries(budgets)) {
      const score = r.scores[category]
      if (typeof score !== 'number' || score < min) failures.push({ page: r.page, variant: r.variant, category, score: score ?? null, min })
    }
  }
  return failures
}

export function renderTable(results, failures) {
  const bad = new Set(failures.map((f) => `${f.page}|${f.variant}|${f.category}`))
  const cats = results.length ? Object.keys(results[0].scores) : []
  const cell = (r, c) => `${Math.round((r.scores[c] ?? 0) * 100)}${bad.has(`${r.page}|${r.variant}|${c}`) ? ' FAIL' : ''}`
  return [
    `| Page | Variant | ${cats.join(' | ')} |`,
    `|---|---|${cats.map(() => '---').join('|')}|`,
    ...results.map((r) => `| ${r.page} | ${r.variant} | ${cats.map((c) => cell(r, c)).join(' | ')} |`),
  ].join('\n')
}
