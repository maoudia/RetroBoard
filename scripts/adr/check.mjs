#!/usr/bin/env node
// Validates docs/adr: MADR structure of every ADR, numbering, supersession links, generated index.
// Prints GitHub annotations in CI. Usage: pnpm adr:check
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkSet, renderIndex } from './lib.mjs'
import { ADR_DIR, loadAdrs } from './load.mjs'

const adrs = loadAdrs()
const problems = []
for (const a of adrs) for (const e of a.errors) problems.push({ file: `docs/adr/${a.file}`, message: e })
for (const e of checkSet(adrs)) problems.push({ file: 'docs/adr', message: e })
let index = ''
try { index = readFileSync(join(ADR_DIR, 'README.md'), 'utf8') } catch { /* reported below */ }
if (index !== renderIndex(adrs)) problems.push({ file: 'docs/adr/README.md', message: 'index is out of date: run pnpm adr:index' })

const ci = !!process.env.GITHUB_ACTIONS
for (const p of problems) console.log(ci ? `::error file=${p.file}::${p.message}` : `${p.file}: ${p.message}`)
console.log(`${adrs.length} ADRs checked, ${problems.length} problem(s)`)
process.exit(problems.length ? 1 : 0)
