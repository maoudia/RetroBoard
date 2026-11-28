#!/usr/bin/env node
// `pnpm launch:check` (change public-launch, task 3.2): one line per gate of the R2 launch (docs/roadmap.md), non-zero exit when one is red, the result
// written to docs/launch/readiness.md. The gate values are in scripts/launch/gates.json; docs/roadmap.md quotes them (pinned by a test).
//   pnpm launch:check                 all gates; needs `pnpm dev:worker` for Lighthouse (about 10 minutes) and `gh` for the streak
//   pnpm launch:check --skip=lighthouse,axe   leaves those gates out of the run (they show as "skipped" and the report says so; never a pass)
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const REPORT = 'docs/launch/readiness.md'
export const GATE_IDS = ['streak', 'lighthouse', 'axe', 'archived', 'guide']

/** The Lighthouse table of scripts/quality/lighthouse.mjs: the lowest performance score of a page, across its variants (null when the page is not there). */
export function lowestPerformance(table, formFactor, page) {
  const lines = table.split('\n').filter((l) => l.startsWith('|'))
  const head = lines[0]?.split('|').map((c) => c.trim()).filter(Boolean) ?? []
  const col = head.indexOf('performance')
  const withFactor = head[0] === 'Form factor'
  const scores = lines.slice(2).map((l) => l.split('|').slice(1, -1).map((c) => c.trim())).filter((c) => c[withFactor ? 1 : 0] === page && (!withFactor || c[0] === formFactor)).map((c) => Number.parseInt(c[col] ?? '', 10))
  return scores.length && scores.every(Number.isFinite) ? Math.min(...scores) / 100 : null
}

/** The streak line of scripts/quality/nightly-streak.mjs: "<n> green night(s) in a row (target <t>)". */
export const streakOf = (line) => { const m = /^(\d+) green night/.exec(line.trim()); return m ? Number(m[1]) : null }

/**
 * Rows of the report from what was measured. `inputs`: { streak: number|null, lighthouse: number|null, axe: boolean|null, archived: string[] (ids archived),
 * guide: boolean, skipped: string[] }. A gate that was not measured (null, or skipped) is red: "not measured" never counts as a pass.
 */
export function evaluate(inputs, gates) {
  const skipped = new Set(inputs.skipped ?? [])
  const row = (id, label, ok, detail) => ({ id, label, ok: !skipped.has(id) && ok === true, detail: skipped.has(id) ? 'skipped, not measured' : detail })
  const floor = Math.round(gates.lighthouse.performance * 100)
  const pending = gates.archived.filter((c) => !(inputs.archived ?? []).includes(c))
  return [
    row('streak', `${gates.streak.target} green nights in a row`, inputs.streak != null && inputs.streak >= gates.streak.target, inputs.streak == null ? 'not measured' : `${inputs.streak} of ${gates.streak.target}`),
    row('lighthouse', `Lighthouse ${gates.lighthouse.formFactor} on the ${gates.lighthouse.page}, performance at least ${floor}`, inputs.lighthouse != null && inputs.lighthouse >= gates.lighthouse.performance, inputs.lighthouse == null ? 'not measured' : `lowest median ${Math.round(inputs.lighthouse * 100)}`),
    row('axe', 'axe without violation on the public pages', inputs.axe === true, inputs.axe == null ? 'not measured' : inputs.axe ? 'no violation' : 'violations found'),
    row('archived', `${gates.archived.join(' and ')} archived`, pending.length === 0, pending.length ? `still open: ${pending.join(', ')}` : 'archived'),
    row('guide', 'the guide is linked from the landing', inputs.guide === true, inputs.guide ? 'linked' : 'link missing'),
  ]
}

/** The markdown report: the date, one line per gate and the verdict. */
export function renderReport(rows, date) {
  const green = rows.every((r) => r.ok)
  return [
    '# Launch readiness',
    '',
    `Written by \`pnpm launch:check\` on ${date}. Gates: \`scripts/launch/gates.json\`; why: \`docs/roadmap.md\` (R2).`,
    '',
    '| Gate | Result | Detail |',
    '|---|---|---|',
    ...rows.map((r) => `| ${r.label} | ${r.ok ? 'green' : 'RED'} | ${r.detail} |`),
    '',
    green ? 'Verdict: **ready**, the posts of `docs/launch/README.md` can go out.' : `Verdict: **not ready**, ${rows.filter((r) => !r.ok).length} gate(s) red.`,
    '',
  ].join('\n')
}

/** Which change directories are archived: `openspec/changes/archive/<date>-<name>` or `<name>`. */
export const archivedIds = (names, wanted) => wanted.filter((id) => names.some((n) => n === id || n.endsWith(`-${id}`)))

function collect(gates, skipped) {
  const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const inputs = { skipped }
  if (!skipped.includes('streak')) {
    const r = run('node', ['scripts/quality/nightly-streak.mjs', `--target=${gates.streak.target}`])
    inputs.streak = streakOf(r.stdout ?? '')
  }
  if (!skipped.includes('lighthouse')) {
    const r = run('node', ['scripts/quality/lighthouse.mjs', gates.lighthouse.baseUrl, `--form-factor=${gates.lighthouse.formFactor}`, `--runs=${gates.lighthouse.runs}`])
    inputs.lighthouse = lowestPerformance(r.stdout ?? '', gates.lighthouse.formFactor, gates.lighthouse.page)
  }
  if (!skipped.includes('axe')) inputs.axe = run('pnpm', ['exec', 'playwright', 'test', '--project=chromium', ...gates.axe.specs]).status === 0
  const names = [...(existsSync('openspec/changes/archive') ? run('ls', ['openspec/changes/archive']).stdout.split('\n') : [])]
  inputs.archived = archivedIds(names, gates.archived)
  inputs.guide = readFileSync(gates.guide.source, 'utf8').includes(gates.guide.needle)
  return inputs
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const gates = JSON.parse(readFileSync(new URL('./gates.json', import.meta.url), 'utf8'))
  const skipped = (process.argv.find((a) => a.startsWith('--skip='))?.slice(7) ?? '').split(',').filter(Boolean)
  for (const s of skipped) if (!GATE_IDS.includes(s)) throw new Error(`unknown gate "${s}" (known: ${GATE_IDS.join(', ')})`)
  const rows = evaluate(collect(gates, skipped), gates)
  const report = renderReport(rows, new Date().toISOString().slice(0, 10))
  writeFileSync(REPORT, report)
  for (const r of rows) console.log(`${r.ok ? 'green' : 'RED  '}  ${r.label}: ${r.detail}`)
  console.log(`report written to ${REPORT}`)
  process.exit(rows.every((r) => r.ok) ? 0 : 1)
}
