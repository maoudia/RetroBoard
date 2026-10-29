#!/usr/bin/env node
// Validates Conventional Commits headers.
//   node scripts/commits/check.mjs --file .git/COMMIT_EDITMSG     (commit-msg hook)
//   node scripts/commits/check.mjs --range <base>..<head>         (CI, local pre-push)
//   node scripts/commits/check.mjs --title "feat(web): thing"      (pull request title)
// Without arguments it checks the commits not yet on origin/main.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { checkMessage } from './lib.mjs'

const args = process.argv.slice(2)
const arg = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1] }
const ci = !!process.env.GITHUB_ACTIONS
const ZERO = /^0+$/

const items = []
if (arg('--file')) {
  // Comment lines (starting with #) are not part of the message.
  const text = readFileSync(arg('--file'), 'utf8').split('\n').filter((l) => !l.startsWith('#')).join('\n')
  items.push({ label: 'commit message', message: text })
} else if (arg('--title') !== null) {
  items.push({ label: 'pull request title', message: arg('--title') })
} else {
  let range = arg('--range') ?? 'origin/main..HEAD'
  // A new branch or a force push reports an all-zero base: check the last commit only.
  if (range.split('..')[0].match(ZERO)) range = 'HEAD~1..HEAD'
  const log = (r) => execFileSync('git', ['log', '--format=%H%x1f%B%x1e', r], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  let out
  // A force push can leave the old base unknown: fall back to the last commit.
  try { out = log(range) } catch { out = log('HEAD~1..HEAD') }
  for (const rec of out.split('\x1e')) {
    const [sha, message] = rec.trim().split('\x1f')
    if (sha) items.push({ label: sha.slice(0, 7), message })
  }
}

let failed = 0
for (const it of items) {
  for (const p of checkMessage(it.message)) {
    failed++
    console.log(ci ? `::error title=Conventional Commits (${it.label})::${p}` : `${it.label}: ${p}`)
  }
}
console.log(`${items.length} message(s) checked, ${failed} problem(s)`)
process.exit(failed ? 1 : 0)
