// Lighthouse on 6 pages in light and dark against quality/lighthouse-budgets.json, which holds one budget object per form factor (changes quality-gates-v2
// and public-launch; the landing has its own, higher minimums: the R2 launch gate).
// Needs `pnpm generate` and a running site: `pnpm dev:worker` (http://127.0.0.1:8787).
// Usage: pnpm lighthouse [baseUrl] [--form-factor=mobile|desktop|both] [--runs=n]
//   --form-factor  mobile (default: simulated 4G, 4x CPU slowdown), desktop (no throttling, 1350x940), or both (twice the duration).
//   --runs         scores every page n times and keeps the median. Without it, LIGHTHOUSE_RUNS=n does the same (the nightly job uses 5: a shared runner swings
//                  a single score by 30 points) and the landing on mobile is still scored 3 times at least (a cold first run reads 13 to 16 points low).
// A runner stays slow for minutes, so the pages are scored in rounds (page after page, not n times in a row) after one discarded warm-up round, and a page
// whose median misses its budget is scored LIGHTHOUSE_EXTRA_RUNS (default 10) more times: the verdict is the median of all its runs. A real regression stays
// under the budget at any sample size; a noisy neighbour does not.
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { categories, evaluate, forFormFactor, median, renderTable, runsFor } from './lighthouse-budget.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const base = args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:8787'
const factorFlag = flag('form-factor') ?? 'mobile'
if (!['mobile', 'desktop', 'both'].includes(factorFlag)) throw new Error(`--form-factor must be mobile, desktop or both, got "${factorFlag}"`)
const FORM_FACTORS = factorFlag === 'both' ? ['mobile', 'desktop'] : [factorFlag]
const explicitRuns = flag('runs') === undefined ? undefined : Number(flag('runs'))
if (explicitRuns !== undefined && !(explicitRuns >= 1)) throw new Error(`--runs must be a number of at least 1, got "${flag('runs')}"`)
const envRuns = Number(process.env.LIGHTHOUSE_RUNS ?? 1)
const extraRuns = Math.max(0, Number(process.env.LIGHTHOUSE_EXTRA_RUNS ?? 10))
const file = JSON.parse(readFileSync(new URL('../../quality/lighthouse-budgets.json', import.meta.url), 'utf8'))
// SEO is scored on every page but gated only once the owner switches indexing on (apps/web/site.json): while the site is noindex the crawlable audit
// fails by design. From then on a format page and the What's new page must score 100 (change public-launch).
const site = JSON.parse(readFileSync(new URL('../../apps/web/site.json', import.meta.url), 'utf8'))
for (const ff of FORM_FACTORS) for (const page of ['format', 'whatsnew']) forFormFactor(file, ff).pages[page].seo = site.indexing === 'public' ? 1 : 0
const PAGES = [['landing', '/'], ['new', '/new'], ['accessibility', '/accessibility'], ['privacy', '/privacy'], ['format', '/formats/starfish/'], ['whatsnew', '/whats-new']]
// The Lighthouse 13 defaults of each form factor, pinned so an upgrade cannot move the measurement.
const SETTINGS = {
  mobile: {
    formFactor: 'mobile', throttlingMethod: 'simulate',
    throttling: { rttMs: 150, throughputKbps: 1638.4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675, cpuSlowdownMultiplier: 4 },
  },
  desktop: {
    formFactor: 'desktop', throttlingMethod: 'simulate',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: { rttMs: 40, throughputKbps: 10240, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0, cpuSlowdownMultiplier: 1 },
  },
}
const { default: lighthouse } = await import('lighthouse')
const { launch } = await import('chrome-launcher')

async function score(chrome, path, formFactor, cats) {
  const run = await lighthouse(`${base}${path}`, { ...SETTINGS[formFactor], port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: cats })
  const c = run.lhr.categories
  return { scores: Object.fromEntries(cats.map((k) => [k, c[k]?.score ?? 0])), bench: run.lhr.environment?.benchmarkIndex }
}
const log = (formFactor, page, variant, samples) => console.error(`${formFactor} ${page} ${variant}: ${samples.length} runs, performance ${samples.map((s) => Math.round((s.scores.performance ?? 0) * 100)).join(' ')}, benchmarkIndex ${samples.map((s) => Math.round(s.bench ?? 0)).join(' ')}`)

const results = []
const failures = []
for (const formFactor of FORM_FACTORS) {
  const budgets = forFormFactor(file, formFactor)
  const cats = categories(budgets)
  const runsOf = (page) => runsFor({ page, formFactor, explicit: explicitRuns, fallback: envRuns })
  const rounds = Math.max(...PAGES.map(([page]) => runsOf(page)))
  for (const variant of ['light', 'dark']) {
    // Dark is forced at the browser level so prefers-color-scheme follows the board variant.
    const flags = ['--headless=new', '--no-sandbox', ...(variant === 'dark' ? ['--blink-settings=preferredColorScheme=1'] : [])]
    const chrome = await launch({ chromePath: process.env.CHROME_PATH ?? chromium.executablePath(), chromeFlags: flags })
    try {
      for (const [, path] of PAGES) await score(chrome, path, formFactor, cats) // warm-up round: cold server and browser caches are not what a visitor sees twice
      const samples = new Map(PAGES.map(([page]) => [page, []]))
      for (let i = 0; i < rounds; i++) for (const [page, path] of PAGES) if (i < runsOf(page)) samples.get(page).push(await score(chrome, path, formFactor, cats))
      for (const [page, path] of PAGES) {
        const mine = samples.get(page)
        const row = () => ({ page, variant, formFactor, scores: median(mine.map((s) => s.scores)) })
        if (evaluate([row()], budgets).length > 0) for (let i = 0; i < extraRuns; i++) mine.push(await score(chrome, path, formFactor, cats))
        log(formFactor, page, variant, mine)
        results.push(row())
        failures.push(...evaluate([row()], budgets))
      }
    } finally { await chrome.kill() }
  }
}
console.log(renderTable(results, failures))
for (const f of failures) console.error(`FAIL ${f.formFactor} ${f.page} ${f.variant} ${f.category}: ${f.score === null ? 'missing' : Math.round(f.score * 100)} < ${Math.round(f.min * 100)}`)
process.exit(failures.length ? 1 : 0)
