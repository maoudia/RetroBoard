#!/usr/bin/env node
// Builds the site published on GitHub Pages from the CI artifacts of one main commit (change allure-report-aggregation):
//   <in>/allure/     aggregated Allure report (unit + every Playwright shard) and its history.jsonl  -> the site root
//   <in>/coverage/   Vitest coverage (html)                                                           -> <out>/coverage
//   <in>/mutation/   Stryker html report, mutation.json and summary.json (the ratchet reads it)      -> <out>/mutation
// The Allure report is the front page: results, failures with traces, history and flaky tests all come from it.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [inDir = 'artifacts', outDir = 'site'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const copy = (from, to) => {
  if (!existsSync(join(inDir, from))) return false
  cpSync(join(inDir, from), join(outDir, to), { recursive: true })
  return true
}

const hasAllure = copy('allure', '.') && existsSync(join(outDir, 'index.html'))
const hasCoverage = copy('coverage', 'coverage')
const hasMutation = copy('mutation', 'mutation')

if (!hasAllure) {
  // Nothing to aggregate (every test job failed before writing results): keep the site up with the reports that exist.
  const links = [hasCoverage && '<li><a href="coverage/index.html">Coverage</a></li>', hasMutation && '<li><a href="mutation/index.html">Mutation testing</a></li>'].filter(Boolean).join('')
  writeFileSync(join(outDir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RetroBoard quality</title><meta name="robots" content="noindex"></head><body><main><h1>RetroBoard quality</h1><p>No Allure report for this commit: no test job wrote results.</p><ul>${links}</ul></main></body></html>\n`)
}

// Links to the earlier /allure/ address keep working.
mkdirSync(join(outDir, 'allure'), { recursive: true })
writeFileSync(join(outDir, 'allure/index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=../"><title>RetroBoard quality</title><meta name="robots" content="noindex"></head><body><a href="../">RetroBoard quality</a></body></html>\n')

console.log(`site written to ${outDir}: allure ${hasAllure ? 'yes' : 'no'}, coverage ${hasCoverage ? 'yes' : 'no'}, mutation ${hasMutation ? 'yes' : 'no'}`)
