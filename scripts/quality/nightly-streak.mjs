#!/usr/bin/env node
// The nightly gate of docs/roadmap.md, as a number: how many scheduled nightly runs in a row, newest first, were green.
// A night is green when every job outside WebKit succeeded after the retries (WebKit still runs and reports, it does not
// gate; quarantined specs do not fail their job, see quarantine-reporter.mjs). Anything else is red: a failed, cancelled
// or skipped job, or a run that never started its jobs.
//   node scripts/quality/nightly-streak.mjs [--target=14] [--repo owner/name]   (needs the gh CLI; exit 1 below the target)
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const isWebkit = (job) => /^Playwright \(webkit /.test(job.name)

/** True when the jobs of one finished run make a green night. */
export function greenNight(jobs) {
  const gating = jobs.filter((j) => !isWebkit(j))
  return gating.length > 0 && gating.every((j) => j.conclusion === 'success')
}

/** Green nights in a row from the newest: `nights` is a list of booleans, newest first. */
export function streak(nights) {
  const red = nights.indexOf(false)
  return red === -1 ? nights.length : red
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const arg = (name) => process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
  const repo = process.argv.includes('--repo') ? process.argv[process.argv.indexOf('--repo') + 1] : 'maoudia/RetroBoard'
  const target = Number(arg('target') ?? 14)
  const gh = (path) => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  const runs = gh(`repos/${repo}/actions/workflows/nightly.yml/runs?event=schedule&status=completed&per_page=30`).workflow_runs
  const nights = runs.map((r) => greenNight(gh(`repos/${repo}/actions/runs/${r.id}/jobs?per_page=100`).jobs))
  const n = streak(nights)
  console.log(`${n} green night(s) in a row (target ${target}); last ${nights.length} scheduled runs: ${nights.map((g) => (g ? 'green' : 'red')).join(' ')}`)
  if (n < target) process.exit(1)
}
