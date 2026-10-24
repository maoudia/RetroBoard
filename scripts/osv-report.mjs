#!/usr/bin/env node
// Turns osv-scanner JSON output into GitHub annotations; exits 1 when any vulnerability remains.
// Ignores from osv-scanner.toml are already applied by the scanner.
import { existsSync, readFileSync } from 'node:fs'

const file = process.argv[2] ?? 'osv-results.json'
const gh = !!process.env.GITHUB_ACTIONS
const report = (level, msg) => console.log(gh ? `::${level}::${msg}` : `${level}: ${msg}`)

if (!existsSync(file)) { report('error', `${file} not found: the scanner did not run`); process.exit(1) }
const { results = [] } = JSON.parse(readFileSync(file, 'utf8'))
let count = 0
for (const r of results) {
  for (const p of r.packages ?? []) {
    for (const v of p.vulnerabilities ?? []) {
      count++
      const aliases = (v.aliases ?? []).join(', ')
      report('error', `${p.package.name}@${p.package.version}: ${v.id}${aliases ? ` (${aliases})` : ''} ${v.summary ?? ''}`.trim())
    }
  }
}
console.log(`${count} vulnerability finding(s)`)
process.exit(count ? 1 : 0)
