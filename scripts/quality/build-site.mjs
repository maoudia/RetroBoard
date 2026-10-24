#!/usr/bin/env node
// Builds the quality site published on GitHub Pages from the CI artifacts of one main commit:
//   <in>/coverage            vitest coverage (html + coverage-summary.json)
//   <in>/unit/results.json   vitest JSON results
//   <in>/playwright-<proj>/  Playwright HTML report (+ results.json) per project
//   <in>/mutation/           Stryker HTML report, mutation.json, summary.json
// Output: <out>/index.html, summary.json, history.json (last 200 commits, fetched from Pages).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [inDir = 'artifacts', outDir = 'site'] = process.argv.slice(2)
const read = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
mkdirSync(outDir, { recursive: true })

// Unit tests and coverage.
const unitRaw = read(join(inDir, 'unit/results.json'))
const unit = unitRaw ? { total: unitRaw.numTotalTests, passed: unitRaw.numPassedTests, failed: unitRaw.numFailedTests, files: unitRaw.numTotalTestSuites } : null
const cov = read(join(inDir, 'coverage/coverage-summary.json'))
const coverage = cov ? Object.fromEntries(['lines', 'statements', 'functions', 'branches'].map((k) => [k, cov.total[k].pct])) : null
if (existsSync(join(inDir, 'coverage'))) cpSync(join(inDir, 'coverage'), join(outDir, 'coverage'), { recursive: true })
if (unitRaw) { mkdirSync(join(outDir, 'unit'), { recursive: true }); writeFileSync(join(outDir, 'unit/results.json'), JSON.stringify(unitRaw)) }

// E2E per Playwright project.
const e2e = {}
for (const dir of existsSync(inDir) ? readdirSync(inDir) : []) {
  const project = /^playwright-(.+)$/.exec(dir)?.[1]
  if (!project) continue
  const root = join(inDir, dir, 'playwright-report')
  if (!existsSync(root)) continue
  cpSync(root, join(outDir, 'e2e', project), { recursive: true })
  const s = read(join(root, 'results.json'))?.stats
  e2e[project] = s ? { passed: s.expected, failed: s.unexpected, flaky: s.flaky, skipped: s.skipped, durationS: Math.round(s.duration / 1000) } : { passed: null }
}

// Mutation.
const mutation = read(join(inDir, 'mutation/summary.json'))
if (existsSync(join(inDir, 'mutation'))) cpSync(join(inDir, 'mutation'), join(outDir, 'mutation'), { recursive: true })

const sha = process.env.GITHUB_SHA ?? 'local'
const run = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null
const summary = { commit: sha, at: new Date().toISOString(), run, unit, coverage, e2e, mutation: mutation ? { score: mutation.score, packages: Object.fromEntries(Object.entries(mutation.packages ?? {}).map(([k, v]) => [k, v.score])) } : null }
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))

// History: previous published history plus this commit.
let history = []
if (process.env.PAGES_URL) {
  try { const r = await fetch(`${process.env.PAGES_URL.replace(/\/$/, '')}/history.json`); if (r.ok) history = await r.json() } catch { /* first publish */ }
}
history = [...history.filter((h) => h.commit !== sha), { commit: sha, at: summary.at, unitPassed: unit?.passed ?? null, unitFailed: unit?.failed ?? null, lines: coverage?.lines ?? null, branches: coverage?.branches ?? null, mutation: mutation?.score ?? null, e2eFailed: Object.keys(e2e).length ? Object.values(e2e).reduce((n, p) => n + (p.failed ?? 0), 0) : null }].slice(-200)
writeFileSync(join(outDir, 'history.json'), JSON.stringify(history, null, 2))

// Index page: self-contained, no external resources.
const status = (ok) => (ok ? '<span class="ok">pass</span>' : '<span class="ko">fail</span>')
const pct = (v) => (v === null || v === undefined ? '-' : `${v}%`)
const spark = (key, fmt = (v) => v) => {
  const pts = history.map((h) => h[key]).filter((v) => typeof v === 'number')
  if (pts.length < 2) return ''
  const min = Math.min(...pts), max = Math.max(...pts), w = 160, h = 32
  const xy = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${max === min ? h / 2 : h - ((v - min) / (max - min)) * h}`).join(' ')
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="trend ${fmt(pts[0])} to ${fmt(pts.at(-1))}"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${xy}"/></svg>`
}
const e2eRows = Object.entries(e2e).sort().map(([p, s]) => `<tr><td><a href="e2e/${esc(p)}/index.html">${esc(p)}</a></td><td>${status(!s.failed)}</td><td>${s.passed ?? '-'}</td><td>${s.failed ?? '-'}</td><td>${s.flaky ?? '-'}</td><td>${s.durationS ?? '-'} s</td></tr>`).join('')
const mutPackages = read(join(inDir, 'mutation/summary.json'))?.packages ?? {}
const mutRows = Object.entries(mutPackages).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${pct(v.score)}</td><td>${v.survived}</td><td>${v.noCoverage}</td></tr>`).join('')
const recent = history.slice(-15).reverse().map((h) => `<tr><td><code>${esc(h.commit.slice(0, 7))}</code></td><td>${esc(h.at.slice(0, 16).replace('T', ' '))}</td><td>${h.unitPassed ?? '-'}${h.unitFailed ? ` (${h.unitFailed} failed)` : ''}</td><td>${pct(h.lines)}</td><td>${pct(h.mutation)}</td><td>${h.e2eFailed ?? '-'}</td></tr>`).join('')

writeFileSync(join(outDir, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>RetroBoard quality</title><meta name="robots" content="noindex">
<style>
:root { color-scheme: light dark; --bg: #fbfbfd; --fg: #1d1d1f; --muted: #555; --line: #d2d2d7; --ok: #1b7f3b; --ko: #b42318; }
@media (prefers-color-scheme: dark) { :root { --bg: #111113; --fg: #f2f2f4; --muted: #b0b0b8; --line: #34343a; --ok: #4ade80; --ko: #f87171; } }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
main { max-width: 980px; margin: 0 auto; padding: 24px 16px 64px; }
h1 { margin: 0 0 4px; font-size: 1.6rem; } h2 { margin-top: 2rem; font-size: 1.15rem; }
.meta { color: var(--muted); } a { color: inherit; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 16px; }
.card { padding: 14px 16px; border: 1px solid var(--line); border-radius: 12px; }
.card b { display: block; font-size: 1.6rem; } .card small { color: var(--muted); }
table { width: 100%; border-collapse: collapse; } th, td { padding: 6px 8px; border-bottom: 1px solid var(--line); text-align: left; }
.ok { color: var(--ok); font-weight: 600; } .ko { color: var(--ko); font-weight: 600; }
.wrap { overflow-x: auto; }
</style></head><body><main>
<h1>RetroBoard quality</h1>
<p class="meta">Commit <code>${esc(sha.slice(0, 7))}</code> on main, ${esc(summary.at.replace('T', ' ').slice(0, 16))} UTC${run ? ` - <a href="${esc(run)}">CI run and raw artifacts</a>` : ''}</p>
<div class="cards">
  <div class="card"><small>Unit tests</small><b>${unit ? `${unit.passed}/${unit.total}` : '-'}</b>${spark('unitPassed')}</div>
  <div class="card"><small>Line coverage</small><b>${pct(coverage?.lines)}</b>${spark('lines', pct)}</div>
  <div class="card"><small>Mutation score</small><b>${pct(mutation?.score)}</b>${spark('mutation', pct)}</div>
  <div class="card"><small>E2E failures</small><b>${Object.keys(e2e).length ? Object.values(e2e).reduce((n, p) => n + (p.failed ?? 0), 0) : '-'}</b>${spark('e2eFailed')}</div>
</div>
<h2>End-to-end (Playwright)</h2>
<div class="wrap"><table><thead><tr><th>Project</th><th>Status</th><th>Passed</th><th>Failed</th><th>Flaky</th><th>Duration</th></tr></thead><tbody>${e2eRows || '<tr><td colspan="6">No report</td></tr>'}</tbody></table></div>
<h2>Unit tests and coverage</h2>
<p>${coverage ? `Lines ${pct(coverage.lines)}, statements ${pct(coverage.statements)}, functions ${pct(coverage.functions)}, branches ${pct(coverage.branches)}.` : 'No coverage report.'} <a href="coverage/index.html">Coverage report</a> - <a href="unit/results.json">raw results</a></p>
<h2>Mutation testing (Stryker)</h2>
<p>${mutation?.previous ? `Previous main run: ${pct(mutation.previous.score)}. ` : ''}Floor: ${pct(mutation?.floor)}. <a href="mutation/index.html">Mutation report</a></p>
<div class="wrap"><table><thead><tr><th>Package</th><th>Score</th><th>Survived</th><th>No coverage</th></tr></thead><tbody>${mutRows || '<tr><td colspan="4">No report</td></tr>'}</tbody></table></div>
<h2>Recent commits</h2>
<div class="wrap"><table><thead><tr><th>Commit</th><th>When (UTC)</th><th>Unit passed</th><th>Lines</th><th>Mutation</th><th>E2E failed</th></tr></thead><tbody>${recent}</tbody></table></div>
<p class="meta"><a href="summary.json">summary.json</a> - <a href="history.json">history.json</a></p>
</main></body></html>
`)
console.log(`site written to ${outDir}: ${Object.keys(e2e).length} e2e report(s), unit ${unit ? 'yes' : 'no'}, mutation ${mutation ? 'yes' : 'no'}`)
