#!/usr/bin/env node
// Converts the merged Stryker report into Allure results, so mutation testing sits in the same report as the unit and
// e2e tests: one result per package (failed when a mutant of it was not detected) and one failed result per undetected
// mutant, with its file, line, mutator and replacement.
//   node scripts/quality/mutation-allure.mjs <mutation.json> <results dir>
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DETECTED = new Set(['Killed', 'Timeout'])
const UNDETECTED = new Set(['Survived', 'NoCoverage'])
const md5 = (s) => createHash('md5').update(s).digest('hex')

/** Allure results (plain objects) for a Stryker mutation report. `now` and `uuid` are injectable for tests. */
export function toAllure(report, now = Date.now(), uuid = randomUUID) {
  const byPackage = new Map()
  for (const [path, file] of Object.entries(report.files ?? {})) {
    const pkg = /packages\/([^/]+)\//.exec(path)?.[1] ?? 'other'
    const acc = byPackage.get(pkg) ?? { detected: 0, left: [] }
    for (const m of file.mutants ?? []) {
      if (DETECTED.has(m.status)) acc.detected++
      else if (UNDETECTED.has(m.status)) acc.left.push({ path, line: m.location?.start?.line ?? 0, mutator: m.mutatorName, status: m.status, replacement: m.replacement ?? '' })
    }
    byPackage.set(pkg, acc)
  }
  const result = (name, fullName, pkg, status, message) => {
    const labels = [{ name: 'parentSuite', value: 'Mutation testing' }, { name: 'suite', value: pkg }, { name: 'framework', value: 'stryker' }]
    return { uuid: uuid(), historyId: md5(fullName), name, fullName, status, stage: 'finished', start: now, stop: now, labels, ...(message ? { statusDetails: { message } } : {}) }
  }
  const out = []
  for (const [pkg, { detected, left }] of [...byPackage].sort(([a], [b]) => a.localeCompare(b))) {
    const total = detected + left.length
    const score = total ? Math.round((detected / total) * 10000) / 100 : 100
    out.push(result(`${pkg}: every mutant detected`, `mutation.${pkg}`, pkg, left.length ? 'failed' : 'passed', `${score}% (${detected} detected, ${left.length} undetected of ${total})`))
    for (const m of left.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)) {
      const id = `${m.path}:${m.line} ${m.mutator}`
      out.push(result(id, `mutation.${pkg}.${id} ${m.replacement}`, pkg, 'failed', `${m.status}: ${m.mutator} at ${m.path}:${m.line}${m.replacement ? `\nreplaced by: ${m.replacement}` : ''}`))
    }
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [reportPath, outDir] = process.argv.slice(2)
  if (!reportPath || !outDir) { console.error('usage: mutation-allure.mjs <mutation.json> <results dir>'); process.exit(2) }
  const results = toAllure(JSON.parse(readFileSync(reportPath, 'utf8')))
  mkdirSync(outDir, { recursive: true })
  for (const r of results) writeFileSync(join(outDir, `${r.uuid}-result.json`), JSON.stringify(r))
  console.log(`mutation-allure: ${results.length} result(s) in ${outDir}`)
}
