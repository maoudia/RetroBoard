#!/usr/bin/env node
// Mutation-tests only the source files that changed against a base, and fails when any mutant of them survives.
// The whole run is slow; this one is proportional to the change, so it can run before every push and on every pull request.
//   pnpm mutation:changed                 files changed since the merge base with origin/main (and the working tree)
//   pnpm mutation:changed --base <ref>    another base
//   pnpm mutation:changed <file>...       exactly these files (whole)
// Files found through git are mutated on the lines the change touches, not whole: a module of top-level declarations (a wire
// schema) has hundreds of mutants that each rerun the whole suite, and one edited line must not cost the hour they take.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'

/** What stryker.config.json mutates, as a predicate: package sources, minus declarations, templates and ports. */
export function isMutated(path) {
  if (!/^packages\/(domain|application|protocol|crypto|exporters|sync)\/src\/.+\.ts$/.test(path)) return false
  if (path.endsWith('.d.ts')) return false
  if (/^packages\/domain\/src\/catalogue\/templates(\.en)?\.ts$/.test(path)) return false
  if (path.startsWith('packages/application/src/ports/')) return false
  return true
}

/** Mutants of one report that no test detected, as "file:line mutator". */
export function undetected(report) {
  const out = []
  for (const [file, info] of Object.entries(report.files ?? {})) {
    for (const m of info.mutants ?? []) {
      if (m.status === 'Survived' || m.status === 'NoCoverage') out.push(`${file}:${m.location.start.line} ${m.mutatorName} (${m.status})`)
    }
  }
  return out.sort()
}

/** The added or changed line ranges of a zero-context diff, as "a-b" strings. A pure deletion has no mutant to test. */
export function hunkRanges(diff) {
  const out = []
  for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const count = m[2] === undefined ? 1 : Number(m[2])
    if (count > 0) out.push(`${m[1]}-${Number(m[1]) + count - 1}`)
  }
  return out
}

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout.split('\n').filter(Boolean)

function changedFiles(base) {
  const mergeBase = git('merge-base', base, 'HEAD')[0] ?? base
  return [...new Set([...git('diff', '--name-only', '--diff-filter=d', mergeBase), ...git('ls-files', '--others', '--exclude-standard')])]
}

/** What to hand to stryker for a changed file: the file with its changed ranges, or the bare file when it is new or the diff says nothing. */
function target(file, base) {
  const mergeBase = git('merge-base', base, 'HEAD')[0] ?? base
  if (!git('ls-tree', mergeBase, '--', file).length) return [file]
  const ranges = hunkRanges(spawnSync('git', ['diff', '-U0', mergeBase, '--', file], { encoding: 'utf8' }).stdout)
  return ranges.map((r) => `${file}:${r}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const baseAt = args.indexOf('--base')
  const base = baseAt >= 0 ? args[baseAt + 1] : (git('rev-parse', '--verify', '--quiet', 'origin/main').length ? 'origin/main' : 'HEAD~1')
  const named = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--base')
  const files = (named.length ? named : changedFiles(base)).filter(isMutated).filter((f) => existsSync(f))
  if (!files.length) { console.log('mutation:changed: no mutated source file changed'); process.exit(0) }
  const targets = named.length ? files : files.flatMap((f) => target(f, base))
  if (!targets.length) { console.log('mutation:changed: the changes hold no line to mutate'); process.exit(0) }
  console.log(`mutation:changed: ${files.length} file(s)\n  ${targets.join('\n  ')}`)
  // A report left by an earlier run must never be mistaken for this one.
  rmSync('reports/mutation/mutation.json', { force: true })
  const run = spawnSync('pnpm', ['exec', 'stryker', 'run', '--mutate', targets.join(','), '--reporters', 'json', '--force', '--concurrency', '4'], { stdio: 'inherit' })
  if (run.status !== 0 || !existsSync('reports/mutation/mutation.json')) { console.error('Stryker failed or did not write a report'); process.exit(run.status || 1) }
  const left = undetected(JSON.parse(readFileSync('reports/mutation/mutation.json', 'utf8')))
  if (left.length) { console.error(`\n${left.length} mutant(s) survived. Kill each with a test, or waive an equivalent one with "// Stryker disable next-line <Mutator>: <reason>":\n  ${left.join('\n  ')}`); process.exit(1) }
  console.log('mutation:changed: every mutant of the changed files is detected')
}
