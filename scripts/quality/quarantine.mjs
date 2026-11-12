#!/usr/bin/env node
// Nightly quarantine ratchet (change agentic-delivery-harness, task 2.1).
// tests/e2e/quarantine.json lists the specs whose failures do not turn the nightly red: they still run, still report
// (HTML, JSON, Allure) and are still listed as failed, but `quarantine-reporter.mjs` does not let them fail the job.
// Every entry has a spec file that exists and a reason. The list only shrinks: `pnpm verify` fails above the ceiling in
// quality/quarantine-baseline.json; when the count drops, lower the ceiling. Never delete a spec to empty the list.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { verdict } from './wip-check.mjs'

/** Projects of playwright.config.ts that run in the nightly (webkit reports but never gates). */
export const PROJECTS = ['chromium', 'firefox', 'phone', 'tv', 'w360', 'w768', 'w1440', 'webkit']

/** True when a failure of `file` (a path) in `project` is quarantined. `projects: ["*"]` stands for every project. */
export function isQuarantined(entries, file, project) {
  return entries.some((e) => file.replaceAll('\\', '/').endsWith(`/${e.spec}`) && (e.projects.includes('*') || e.projects.includes(project)))
}

/** What is wrong with the list: a message per defect, none when it is sound. `exists(spec)` says whether the spec file is there. */
export function problems(entries, exists) {
  const out = []
  const seen = new Set()
  for (const e of entries) {
    if (!/^[\w.-]+\.spec\.ts$/.test(e.spec ?? '')) out.push(`entry ${JSON.stringify(e.spec)}: "spec" must be a file name such as toolbar-fold.spec.ts`)
    else if (!exists(e.spec)) out.push(`${e.spec}: the spec file does not exist (a quarantined spec is fixed or kept, never deleted)`)
    if (seen.has(e.spec)) out.push(`${e.spec}: listed twice`)
    seen.add(e.spec)
    if (!Array.isArray(e.projects) || !e.projects.length || e.projects.some((p) => p !== '*' && !PROJECTS.includes(p))) out.push(`${e.spec}: "projects" is a list of ${PROJECTS.join(', ')} or "*"`)
    if (typeof e.reason !== 'string' || e.reason.trim().length < 20) out.push(`${e.spec}: "reason" must say why it fails and what fixes it`)
  }
  return out
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { entries } = JSON.parse(readFileSync('tests/e2e/quarantine.json', 'utf8'))
  const baseline = JSON.parse(readFileSync('quality/quarantine-baseline.json', 'utf8'))
  const bad = problems(entries, (spec) => existsSync(join('tests/e2e', spec)))
  if (bad.length) {
    console.error(`tests/e2e/quarantine.json:\n${bad.map((b) => `  - ${b}`).join('\n')}`)
    process.exit(1)
  }
  const v = verdict(entries.length, baseline)
  if (v === 'fail') {
    console.error(`${entries.length} quarantined specs, the ceiling is ${baseline.ceiling}. The quarantine only shrinks: fix a spec instead of adding one.`)
    process.exit(1)
  }
  console.log(`${entries.length} quarantined specs (ceiling ${baseline.ceiling}, target ${baseline.target}).`)
  if (v === 'lower') console.log(`notice: lower "ceiling" in quality/quarantine-baseline.json to ${entries.length}.`)
}
