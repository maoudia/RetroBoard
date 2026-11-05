#!/usr/bin/env node
// Contrast report (change quality-gates-v2): merges the per-theme results written by tests/e2e/theme-contrast.spec.ts
// into one markdown table. Usage: node scripts/quality/contrast-report.mjs [dir] > report.md
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** rows: [{ theme, variant, violations: [{ id, nodes, target }] }] -> markdown table, worst first. */
export function renderReport(rows) {
  const sorted = [...rows].sort((a, b) => b.violations.length - a.violations.length || `${a.theme}${a.variant}`.localeCompare(`${b.theme}${b.variant}`))
  const failing = sorted.filter((r) => r.violations.length)
  const lines = [
    '# Contrast report (axe color-contrast, WCAG 2.2 AA)',
    '',
    `${rows.length} theme and variant combinations, ${failing.length} with a violation.`,
    '',
    '| Theme | Variant | Result | First offenders |',
    '|---|---|---|---|',
    ...sorted.map((r) => `| ${r.theme} | ${r.variant} | ${r.violations.length ? `${r.violations.length} fail` : 'pass'} | ${r.violations.slice(0, 3).map((v) => `\`${v.target}\``).join(', ') || '-'} |`),
  ]
  return lines.join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] ?? 'test-results/contrast'
  const rows = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))) : []
  console.log(renderReport(rows))
  process.exit(rows.some((r) => r.violations.length) ? 1 : 0)
}
