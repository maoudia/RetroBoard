#!/usr/bin/env node
// The spec gate of a pull request: every feature, fix or performance change names the OpenSpec change it implements
// ("Change: <name>" in the body, the change being open or archived). The `no-spec` label is only for pull requests that
// change no behaviour: docs, tests, build, CI, chores, refactors, style, reverts. A `feat`, `fix`, `perf` or breaking
// pull request cannot opt out. Reads TITLE, BODY and LABELS (comma separated) from the environment.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'

/** Types that change what the product does: they need a spec. */
export const SPEC_TYPES = new Set(['feat', 'fix', 'perf'])

/** What a pull request needs: { need: 'change' | 'optional', change?, problem? }. Pure. */
export function decide({ title, body, labels }) {
  const m = /^(?<type>[a-z]+)(?:\([^)]*\))?(?<bang>!)?:/.exec(String(title).trim())
  const type = m?.groups?.type ?? ''
  const behaviour = SPEC_TYPES.has(type) || !!m?.groups?.bang
  const change = /Change: *([a-z0-9-]+)/.exec(String(body ?? ''))?.[1]
  // Dependabot labels its pull requests: dependency updates change no product behaviour either.
  const exempt = String(labels ?? '').split(',').map((l) => l.trim()).some((l) => ['no-spec', 'dependencies', 'github_actions'].includes(l))
  if (change) return { need: 'change', change }
  if (behaviour) {
    return { need: 'change', problem: `A ${type}${m?.groups?.bang ? ' (breaking)' : ''} pull request changes the product and needs an OpenSpec change: write the proposal first (/opsx:propose), then add "Change: <openspec-change>" to the pull request body. The no-spec label does not apply to ${[...SPEC_TYPES].join(', ')} or breaking changes.` }
  }
  if (exempt) return { need: 'optional' }
  return { need: 'optional', problem: `Add "Change: <openspec-change>" to the pull request body, or the no-spec label (allowed for docs, test, build, ci, chore, style, refactor and revert pull requests).` }
}

/** Where a change lives: open under openspec/changes, or archived with a date prefix. */
export function changeState(name, root = 'openspec/changes') {
  if (existsSync(`${root}/${name}`)) return 'open'
  if (existsSync(`${root}/archive`) && readdirSync(`${root}/archive`).some((d) => d.replace(/^\d{4}-\d{2}-\d{2}-/, '') === name)) return 'archived'
  return 'unknown'
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const d = decide({ title: process.env.TITLE ?? '', body: process.env.BODY ?? '', labels: process.env.LABELS ?? '' })
  if (d.problem) { console.log(`::error::${d.problem}`); process.exit(1) }
  if (!d.change) { console.log('no-spec: nothing to validate'); process.exit(0) }
  const state = changeState(d.change)
  if (state === 'unknown') { console.log(`::error::Unknown OpenSpec change "${d.change}"`); process.exit(1) }
  if (state === 'archived') { console.log(`Change ${d.change} is archived.`); process.exit(0) }
  process.exit(spawnSync('pnpm', ['exec', 'openspec', 'validate', d.change, '--strict'], { stdio: 'inherit' }).status ?? 1)
}
