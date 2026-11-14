#!/usr/bin/env node
// Lighthouse (mobile profile, simulated 4G) on 4 pages in light and dark against quality/lighthouse-budgets.json (change quality-gates-v2;
// the landing has its own, higher minimums: the R2 launch gate, change landing-speed-and-accessibility).
// Needs `pnpm generate` and a running site: `pnpm dev:worker` (http://127.0.0.1:8787). Usage: pnpm lighthouse [baseUrl]
// LIGHTHOUSE_RUNS=n scores each page n times and keeps the median (the nightly job uses 5: a shared runner swings a single score by 30 points).
// A runner stays slow for minutes, so the pages are scored in rounds (page after page, not n times in a row) after one discarded warm-up round, and a page
// whose median misses its budget is scored LIGHTHOUSE_EXTRA_RUNS (default 10) more times: the verdict is the median of all its runs. A real regression stays
// under the budget at any sample size; a noisy neighbour does not.
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { categories, evaluate, median, renderTable } from './lighthouse-budget.mjs'

const base = process.argv[2] ?? 'http://127.0.0.1:8787'
const runs = Math.max(1, Number(process.env.LIGHTHOUSE_RUNS ?? 1))
const extraRuns = Math.max(0, Number(process.env.LIGHTHOUSE_EXTRA_RUNS ?? 10))
const budgets = JSON.parse(readFileSync(new URL('../../quality/lighthouse-budgets.json', import.meta.url), 'utf8'))
const PAGES = [['landing', '/'], ['new', '/new'], ['accessibility', '/accessibility'], ['privacy', '/privacy']]
// The Lighthouse 13 mobile defaults, pinned so an upgrade cannot move the measurement: simulated 4G, 4x CPU slowdown.
const SETTINGS = {
  formFactor: 'mobile',
  throttlingMethod: 'simulate',
  throttling: { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675, cpuSlowdownMultiplier: 4 },
}
const { default: lighthouse } = await import('lighthouse')
const { launch } = await import('chrome-launcher')
const cats = categories(budgets)

async function score(chrome, path) {
  const run = await lighthouse(`${base}${path}`, { ...SETTINGS, port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: cats })
  const c = run.lhr.categories
  return { scores: Object.fromEntries(cats.map((k) => [k, c[k]?.score ?? 0])), bench: run.lhr.environment?.benchmarkIndex }
}
const log = (page, variant, samples) => console.error(`${page} ${variant}: ${samples.length} runs, performance ${samples.map((s) => Math.round((s.scores.performance ?? 0) * 100)).join(' ')}, benchmarkIndex ${samples.map((s) => Math.round(s.bench ?? 0)).join(' ')}`)

const results = []
for (const variant of ['light', 'dark']) {
  // Dark is forced at the browser level so prefers-color-scheme follows the board variant.
  const flags = ['--headless=new', '--no-sandbox', ...(variant === 'dark' ? ['--blink-settings=preferredColorScheme=1'] : [])]
  const chrome = await launch({ chromePath: process.env.CHROME_PATH ?? chromium.executablePath(), chromeFlags: flags })
  try {
    for (const [, path] of PAGES) await score(chrome, path) // warm-up round: cold server and browser caches are not what a visitor sees twice
    const samples = new Map(PAGES.map(([page]) => [page, []]))
    for (let i = 0; i < runs; i++) for (const [page, path] of PAGES) samples.get(page).push(await score(chrome, path))
    for (const [page, path] of PAGES) {
      const mine = samples.get(page)
      const miss = () => evaluate([{ page, variant, scores: median(mine.map((s) => s.scores)) }], budgets).length > 0
      if (miss()) for (let i = 0; i < extraRuns; i++) mine.push(await score(chrome, path))
      log(page, variant, mine)
      results.push({ page, variant, scores: median(mine.map((s) => s.scores)) })
    }
  } finally { await chrome.kill() }
}
const failures = evaluate(results, budgets)
console.log(renderTable(results, failures))
process.exit(failures.length ? 1 : 0)
