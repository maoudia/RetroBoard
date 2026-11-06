#!/usr/bin/env node
// Runs the e2e specs that are NOT in the push gate (tests/e2e/core.json): together with `pnpm e2e:core` they are the
// whole suite, each test once. Quality runs this sharded and non-gating so the Allure report shows every test.
// Extra arguments go to Playwright:  pnpm e2e:rest --project=chromium --shard=1/5
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'

const DIR = new URL('../tests/e2e/', import.meta.url)

/** Spec files of `dir` that the core gate does not run, sorted. */
export function restSpecs(all, core) {
  const gate = new Set(core.map((s) => `${s}.spec.ts`))
  return all.filter((f) => f.endsWith('.spec.ts') && !gate.has(f)).sort()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { specs } = JSON.parse(readFileSync(new URL('core.json', DIR), 'utf8'))
  const files = restSpecs(readdirSync(DIR), specs).map((f) => `tests/e2e/${f}`)
  const run = spawnSync('pnpm', ['exec', 'playwright', 'test', ...files, ...process.argv.slice(2)], { stdio: 'inherit' })
  process.exit(run.status ?? 1)
}
