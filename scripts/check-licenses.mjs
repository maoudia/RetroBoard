#!/usr/bin/env node
// Production dependency licenses must be compatible with AGPL-3.0 distribution.
// An "A OR B" expression passes when one option is allowed.
import { execFileSync } from 'node:child_process'

const ALLOWED = new Set([
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'BlueOak-1.0.0', 'CC0-1.0', 'Unlicense',
  'MPL-2.0', 'OFL-1.1', 'CC-BY-4.0', 'Python-2.0', 'LGPL-3.0-or-later', 'GPL-3.0-or-later', 'AGPL-3.0-only', 'AGPL-3.0-or-later',
])
const report = (msg) => console.error(process.env.GITHUB_ACTIONS ? `::error::${msg}` : msg)
let byLicense
try {
  byLicense = JSON.parse(execFileSync('pnpm', ['licenses', 'list', '--json', '--prod'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
} catch (e) {
  report(`pnpm licenses list failed: ${String(e.stderr || e.message).slice(0, 500)}`)
  process.exit(1)
}
const allowed = (expr) => expr.replace(/[()]/g, '').split(/\s+OR\s+/).some((l) => ALLOWED.has(l.trim()))
const bad = Object.entries(byLicense).filter(([license]) => !allowed(license))
for (const [license, pkgs] of bad) report(`Licence not allowed: ${license}: ${pkgs.map((p) => p.name).join(', ')}`)
console.log(`${Object.values(byLicense).flat().length} production packages, ${bad.length} license(s) not allowed`)
process.exit(bad.length ? 1 : 0)
