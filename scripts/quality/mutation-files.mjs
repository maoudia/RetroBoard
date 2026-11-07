#!/usr/bin/env node
// The mutated source files of one package, balanced over N shards by size, as a comma-separated list for
// `stryker --mutate`. Shard i of n always gets the same files for the same tree, so parallel CI jobs cover every
// file exactly once.
//   node scripts/quality/mutation-files.mjs <package> <i>/<n>
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isMutated } from './mutation-changed.mjs'

/** Greedy balance: the biggest file goes to the lightest shard. Ties keep the order, so the split is stable. */
export function split(files, n) {
  const shards = Array.from({ length: n }, () => ({ weight: 0, files: [] }))
  for (const f of [...files].sort((a, b) => b.size - a.size || a.path.localeCompare(b.path))) {
    const lightest = shards.reduce((min, s) => (s.weight < min.weight ? s : min), shards[0])
    lightest.weight += f.size
    lightest.files.push(f.path)
  }
  return shards.map((s) => s.files.sort())
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [pkg, spec = '1/1'] = process.argv.slice(2)
  const [i, n] = spec.split('/').map(Number)
  if (!pkg || !(i >= 1 && i <= n)) { console.error('usage: mutation-files.mjs <package> <i>/<n>'); process.exit(2) }
  const listed = spawnSync('git', ['ls-files', `packages/${pkg}/src`], { encoding: 'utf8' }).stdout.split('\n').filter(Boolean)
  const files = listed.filter(isMutated).map((path) => ({ path, size: readFileSync(path, 'utf8').length }))
  if (!files.length) { console.error(`no mutated file in packages/${pkg}`); process.exit(1) }
  console.log(split(files, n)[i - 1].join(','))
}
