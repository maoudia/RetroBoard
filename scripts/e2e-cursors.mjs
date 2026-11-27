#!/usr/bin/env node
// The flag-on run of the cursor specs (change cursors-off-for-now): shared pointers are paused by default, so this builds the site
// with NUXT_PUBLIC_CURSORS_ENABLED=true and runs the specs that exercise pointers with E2E_CURSORS=1, so they do not rot.
//   pnpm e2e:cursors [--project=chromium]     (set E2E_SKIP_GENERATE=1 when the flag-on site is already generated)
// It leaves the flag-on site in apps/web/.output: run `pnpm generate` again before the normal e2e.
import { spawnSync } from 'node:child_process'

const env = { ...process.env, NUXT_PUBLIC_CURSORS_ENABLED: 'true', E2E_CURSORS: '1' }
if (!process.env.E2E_SKIP_GENERATE) {
  const gen = spawnSync('pnpm', ['generate'], { stdio: 'inherit', env })
  if (gen.status !== 0) process.exit(gen.status ?? 1)
}
const specs = ['presence', 'takeover', 'presenter-focus', 'sharing', 'landing-basics'].map((s) => `tests/e2e/${s}.spec.ts`)
const run = spawnSync('pnpm', ['exec', 'playwright', 'test', ...specs, ...process.argv.slice(2)], { stdio: 'inherit', env })
process.exit(run.status ?? 1)
