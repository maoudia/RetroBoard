#!/usr/bin/env node
// Lighthouse on 4 pages in light and dark against quality/lighthouse-budgets.json (change quality-gates-v2).
// Needs `pnpm generate` and a running site: `pnpm dev:worker` (http://127.0.0.1:8787). Usage: pnpm lighthouse [baseUrl]
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { evaluate, renderTable } from './lighthouse-budget.mjs'

const base = process.argv[2] ?? 'http://127.0.0.1:8787'
const budgets = JSON.parse(readFileSync(new URL('../../quality/lighthouse-budgets.json', import.meta.url), 'utf8'))
const PAGES = [['landing', '/'], ['new', '/new'], ['accessibility', '/accessibility'], ['privacy', '/privacy']]
const { default: lighthouse } = await import('lighthouse')
const { launch } = await import('chrome-launcher')
const results = []
for (const variant of ['light', 'dark']) {
  // Dark is forced at the browser level so prefers-color-scheme follows the board variant.
  const flags = ['--headless=new', '--no-sandbox', ...(variant === 'dark' ? ['--blink-settings=preferredColorScheme=1'] : [])]
  const chrome = await launch({ chromePath: process.env.CHROME_PATH ?? chromium.executablePath(), chromeFlags: flags })
  try {
    for (const [page, path] of PAGES) {
      const run = await lighthouse(`${base}${path}`, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: Object.keys(budgets) })
      const c = run.lhr.categories
      results.push({ page, variant, scores: Object.fromEntries(Object.keys(budgets).map((k) => [k, c[k]?.score ?? 0])) })
    }
  } finally { await chrome.kill() }
}
const failures = evaluate(results, budgets)
console.log(renderTable(results, failures))
process.exit(failures.length ? 1 : 0)
