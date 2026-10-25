#!/usr/bin/env node
// Runs the core e2e specs (tests/e2e/core.json). Extra arguments go to Playwright:
//   pnpm e2e:core --project=chromium --shard=1/3
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { specs } = JSON.parse(readFileSync(new URL('../tests/e2e/core.json', import.meta.url), 'utf8'))
const files = specs.map((s) => `tests/e2e/${s}.spec.ts`)
const run = spawnSync('pnpm', ['exec', 'playwright', 'test', ...files, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(run.status ?? 1)
