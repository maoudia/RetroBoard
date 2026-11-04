#!/usr/bin/env node
// Work-in-progress ratchet (change stabilise-main, task group 2).
// A change is "in progress" when its tasks.md has at least one ticked and at least one open task.
// `pnpm verify` fails when more changes are in progress than the ceiling in quality/wip-baseline.json.
// The ceiling only goes down: when the count drops, lower it. The target is 3 (AGENTS.md).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Names of the changes that are started but not finished. */
export function inProgress(changesDir) {
  const out = []
  for (const name of readdirSync(changesDir)) {
    const file = join(changesDir, name, 'tasks.md')
    if (name === 'archive' || !existsSync(file)) continue
    const lines = readFileSync(file, 'utf8').split('\n')
    const done = lines.filter((l) => /^\s*- \[x\]/i.test(l)).length
    const open = lines.filter((l) => /^\s*- \[ \]/.test(l)).length
    if (done > 0 && open > 0) out.push(name)
  }
  return out.sort()
}

/** Verdict for a count against the ratchet: `fail`, `lower` (the ceiling can drop) or `ok`. */
export function verdict(count, { ceiling, target }) {
  if (count > ceiling) return 'fail'
  if (count < ceiling && ceiling > target) return 'lower'
  return 'ok'
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const baseline = JSON.parse(readFileSync('quality/wip-baseline.json', 'utf8'))
  const names = inProgress('openspec/changes')
  const v = verdict(names.length, baseline)
  const list = names.map((n) => `  - ${n}`).join('\n')
  if (v === 'fail') {
    console.error(`${names.length} changes are in progress, the ceiling is ${baseline.ceiling} (target ${baseline.target}). Finish or split one before starting another:\n${list}`)
    process.exit(1)
  }
  console.log(`${names.length} changes in progress (ceiling ${baseline.ceiling}, target ${baseline.target}).`)
  if (v === 'lower') console.log(`notice: lower "ceiling" in quality/wip-baseline.json to ${names.length}.`)
}
