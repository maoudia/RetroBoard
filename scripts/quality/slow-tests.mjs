#!/usr/bin/env node
// Lists the slowest Playwright tests from playwright-report/results.json as a step summary and
// GitHub annotations, so a slow browser or test is visible without downloading the report.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const file = process.argv[2] ?? 'playwright-report/results.json'
if (!existsSync(file)) { console.log(`${file} not found`); process.exit(0) }
const report = JSON.parse(readFileSync(file, 'utf8'))
const tests = []
const walk = (suite, path) => {
  for (const s of suite.suites ?? []) walk(s, [...path, s.title])
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const ms = (t.results ?? []).reduce((n, r) => n + (r.duration ?? 0), 0)
      tests.push({ title: [...path, spec.title].filter(Boolean).join(' > '), project: t.projectName, ms, retries: Math.max(0, (t.results?.length ?? 1) - 1), status: t.status })
    }
  }
}
for (const s of report.suites ?? []) walk(s, [])
tests.sort((a, b) => b.ms - a.ms)
const top = tests.slice(0, 10)
const total = tests.reduce((n, t) => n + t.ms, 0)
const lines = [`## Slowest e2e tests (${tests[0]?.project ?? '?'}, ${Math.round(total / 1000)} s in tests)`, '', '| Test | Time | Retries | Status |', '|---|---|---|---|',
  ...top.map((t) => `| ${t.title} | ${(t.ms / 1000).toFixed(1)} s | ${t.retries} | ${t.status} |`)]
console.log(lines.join('\n'))
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n', { flag: 'a' })
if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Slowest e2e tests::${top.map((t) => `${(t.ms / 1000).toFixed(1)}s ${t.title}`).join(' %0A')}`)
