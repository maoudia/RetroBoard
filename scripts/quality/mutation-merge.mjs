#!/usr/bin/env node
// Merges the mutation reports of the per-package shards of the Quality workflow into one report for the ratchet
// and the Pages site: <out>/mutation.json (every file), <out>/<package>/index.html (the Stryker report of each
// shard) and <out>/index.html (a short list of them with their scores).
//   node scripts/quality/mutation-merge.mjs <shards dir> <out dir> <expected shard count>
// Each shard is a directory "mutation-shard-<package>" holding mutation.json and index.html.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** One report with the files of all of them (a file belongs to one package, so none is listed twice). */
export function mergeReports(reports) {
  if (!reports.length) throw new Error('no mutation report to merge')
  return { ...reports[0], files: Object.assign({}, ...reports.map((r) => r.files ?? {})) }
}

/** What a partial run looks like: fewer shards than the workflow starts, or a package without any file in the report. */
export function incomplete(shardCount, expectedShards, report, packages) {
  const problems = []
  if (shardCount !== expectedShards) problems.push(`${shardCount} shard(s) found, ${expectedShards} expected (a shard failed or never ran)`)
  for (const pkg of packages) {
    if (!Object.keys(report.files ?? {}).some((f) => f.startsWith(`packages/${pkg}/`))) problems.push(`no file of packages/${pkg} in the report`)
  }
  return problems
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** Index page listing the report of each package with its score. */
export function indexHtml(shards) {
  const rows = shards.map(({ pkg, detected, undetected }) => {
    const total = detected + undetected
    const score = total ? Math.round((detected / total) * 10000) / 100 : 100
    return `<li><a href="${esc(pkg)}/index.html">${esc(pkg)}</a>: ${score}% (${undetected} undetected of ${total})</li>`
  }).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mutation testing</title></head><body><h1>Mutation testing</h1><ul>${rows}</ul></body></html>\n`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [shardsDir, outDir, expected] = process.argv.slice(2)
  const expectedShards = Number(expected)
  if (!shardsDir || !outDir || !(expectedShards >= 1)) { console.error('usage: mutation-merge.mjs <shards dir> <out dir> <expected shard count>'); process.exit(2) }
  const dirs = readdirSync(shardsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name.startsWith('mutation-shard-')).map((d) => d.name).sort()
  const reports = []
  const shards = []
  mkdirSync(outDir, { recursive: true })
  for (const name of dirs) {
    const pkg = name.slice('mutation-shard-'.length)
    const report = JSON.parse(readFileSync(join(shardsDir, name, 'mutation.json'), 'utf8'))
    reports.push(report)
    const mutants = Object.values(report.files ?? {}).flatMap((f) => f.mutants ?? [])
    const detected = mutants.filter((m) => m.status === 'Killed' || m.status === 'Timeout').length
    const undetected = mutants.filter((m) => m.status === 'Survived' || m.status === 'NoCoverage').length
    shards.push({ pkg, detected, undetected })
    if (existsSync(join(shardsDir, name, 'index.html'))) {
      mkdirSync(join(outDir, pkg), { recursive: true })
      copyFileSync(join(shardsDir, name, 'index.html'), join(outDir, pkg, 'index.html'))
    }
  }
  const merged = mergeReports(reports)
  const baseline = JSON.parse(readFileSync('quality/mutation-baseline.json', 'utf8'))
  const problems = incomplete(dirs.length, expectedShards, merged, Object.keys(baseline.packages ?? {}))
  if (problems.length) { console.error(`mutation-merge: the report is partial:\n  ${problems.join('\n  ')}`); process.exit(1) }
  writeFileSync(join(outDir, 'mutation.json'), JSON.stringify(merged))
  writeFileSync(join(outDir, 'index.html'), indexHtml(shards))
  console.log(`mutation-merge: ${dirs.length} shard(s): ${shards.map((s) => s.pkg).join(', ')}`)
}
