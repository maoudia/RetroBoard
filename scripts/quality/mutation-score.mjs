#!/usr/bin/env node
// Mutation ratchet. Reads Stryker's JSON report (mutation-testing-report-schema), computes the
// score per package and overall, compares with the floor in quality/mutation-baseline.json and
// with the previous main run published on GitHub Pages, then writes reports/mutation/summary.json.
// Fails (exit 1) when the overall score or a package score drops beyond the tolerance.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const REPORT = process.argv[2] ?? 'reports/mutation/mutation.json'
const OUT = 'reports/mutation/summary.json'
const BASELINE = 'quality/mutation-baseline.json'
const TOLERANCE = 0.5 // percentage points: absorbs timeout noise, catches real regressions
const gh = !!process.env.GITHUB_ACTIONS
const note = (level, msg) => console.log(gh ? `::${level}::${msg}` : `${level}: ${msg}`)

const DETECTED = new Set(['Killed', 'Timeout'])
const UNDETECTED = new Set(['Survived', 'NoCoverage'])

export function score(files) {
  const byPkg = {}
  const total = { detected: 0, undetected: 0, survived: 0, noCoverage: 0, ignored: 0 }
  for (const [path, file] of Object.entries(files)) {
    const pkg = /packages\/([^/]+)\//.exec(path)?.[1] ?? 'other'
    const acc = (byPkg[pkg] ??= { detected: 0, undetected: 0, survived: 0, noCoverage: 0, ignored: 0 })
    for (const m of file.mutants ?? []) {
      for (const a of [acc, total]) {
        if (DETECTED.has(m.status)) a.detected++
        else if (UNDETECTED.has(m.status)) { a.undetected++; if (m.status === 'Survived') a.survived++; else a.noCoverage++ }
        else a.ignored++
      }
    }
  }
  const pct = (a) => (a.detected + a.undetected ? Math.round((a.detected / (a.detected + a.undetected)) * 10000) / 100 : 100)
  return {
    score: pct(total),
    totals: total,
    packages: Object.fromEntries(Object.entries(byPkg).sort().map(([k, v]) => [k, { score: pct(v), ...v }])),
  }
}

async function previous() {
  const base = process.env.PAGES_URL
  if (!base) return null
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/mutation/summary.json`, { headers: { 'cache-control': 'no-cache' } })
    return res.ok ? await res.json() : null
  } catch { return null }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(REPORT)) { note('error', `${REPORT} not found: Stryker did not produce a JSON report`); process.exit(1) }
  const current = score(JSON.parse(readFileSync(REPORT, 'utf8')).files)
  const floor = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : { score: 0, packages: {} }
  const prev = await previous()
  const failures = []

  if (current.score < floor.score) failures.push(`overall ${current.score}% is below the floor ${floor.score}% (${BASELINE})`)
  for (const [pkg, f] of Object.entries(floor.packages ?? {})) {
    const s = current.packages[pkg]?.score
    if (s !== undefined && s < f) failures.push(`${pkg} ${s}% is below its floor ${f}%`)
  }
  if (prev?.score !== undefined && current.score < prev.score - TOLERANCE) {
    failures.push(`overall ${current.score}% regressed from ${prev.score}% on the previous main run (${prev.commit?.slice(0, 7) ?? '?'})`)
  }
  for (const [pkg, p] of Object.entries(prev?.packages ?? {})) {
    const s = current.packages[pkg]?.score
    if (s !== undefined && s < p.score - TOLERANCE) failures.push(`${pkg} ${s}% regressed from ${p.score}%`)
  }

  const summary = { ...current, commit: process.env.GITHUB_SHA ?? null, at: new Date().toISOString(), previous: prev ? { score: prev.score, commit: prev.commit } : null, floor: floor.score }
  writeFileSync(OUT, JSON.stringify(summary, null, 2))

  const delta = prev?.score !== undefined ? ` (${current.score - prev.score >= 0 ? '+' : ''}${(current.score - prev.score).toFixed(2)} vs previous)` : ''
  const lines = [`## Mutation score: ${current.score}%${delta}`, '', '| Package | Score | Survived | No coverage |', '|---|---|---|---|',
    ...Object.entries(current.packages).map(([k, v]) => `| ${k} | ${v.score}% | ${v.survived} | ${v.noCoverage} |`)]
  console.log(lines.join('\n'))
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n', { flag: 'a' })
  if (current.score > floor.score + 2) note('notice', `Mutation score ${current.score}% is well above the floor ${floor.score}%: raise ${BASELINE}.`)
  for (const f of failures) note('error', `Mutation regression: ${f}`)
  process.exit(failures.length ? 1 : 0)
}
