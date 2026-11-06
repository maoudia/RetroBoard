#!/usr/bin/env node
// Local gate (change quality-gates-v2): every check that blocks main, except the cross-browser nightly,
// in the order that fails fastest. Stops at the first failure and prints what ran and how long it took.
//   pnpm prepush              verify, generate, bundle budget, commit messages, core e2e (about 15 minutes)
//   pnpm prepush --fast       same without the core e2e (about 4 minutes), for work in progress
import { spawnSync } from 'node:child_process'

/** The steps, cheapest first. `e2e` marks the ones --fast skips. */
export const STEPS = [
  { name: 'verify', cmd: ['pnpm', 'verify'] },
  { name: 'generate', cmd: ['pnpm', 'generate'] },
  { name: 'size', cmd: ['pnpm', 'size'] },
  { name: 'commits', cmd: ['pnpm', 'commits:check'] },
  { name: 'mutation', cmd: ['pnpm', 'mutation:changed'] },
  { name: 'e2e:core', cmd: ['pnpm', 'e2e:core'], e2e: true },
]

/** Runs the steps with `run(cmd) -> exit status`; returns { ok, failed, ran }. */
export function gate(steps, run, { fast = false } = {}) {
  const ran = []
  for (const s of steps) {
    if (fast && s.e2e) continue
    const status = run(s.cmd)
    ran.push({ name: s.name, status })
    if (status !== 0) return { ok: false, failed: s.name, ran }
  }
  return { ok: true, failed: null, ran }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fast = process.argv.includes('--fast')
  const started = Date.now()
  const result = gate(STEPS, ([bin, ...args]) => {
    console.log(`\n=== ${[bin, ...args].join(' ')}`)
    return spawnSync(bin, args, { stdio: 'inherit' }).status ?? 1
  }, { fast })
  const min = ((Date.now() - started) / 60000).toFixed(1)
  if (result.ok) console.log(`\nprepush OK (${result.ran.map((r) => r.name).join(', ')}) in ${min} min`)
  else console.error(`\nprepush FAILED at "${result.failed}" after ${min} min: nothing is pushed`)
  process.exit(result.ok ? 0 : 1)
}
