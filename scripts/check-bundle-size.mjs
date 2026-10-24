#!/usr/bin/env node
// Bundle budget for the static site (gzip sizes). Fails CI when a budget is exceeded.
// Lazy chunks loaded only on opt-in (the WebMCP polyfill) are reported but not counted.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dir = process.argv[2] ?? 'apps/web/.output/public'
const BUDGET = { entryKb: 40, totalKb: 220 }
const OPT_IN = [/initializeWebModelContext/]

const assets = join(dir, '_nuxt')
const html = readFileSync(join(dir, 'index.html'), 'utf8')
const entry = html.match(/src="\/_nuxt\/([^"]+\.js)"/)?.[1]
const kb = (n) => Math.round(n / 102.4) / 10
let total = 0
let entrySize = 0
const optIn = []
for (const file of readdirSync(assets).filter((f) => f.endsWith('.js'))) {
  const raw = readFileSync(join(assets, file))
  const size = gzipSync(raw).length
  if (file === entry) entrySize = size
  if (raw.length > 100_000 && OPT_IN.some((re) => re.test(raw.toString('utf8')))) { optIn.push(`${file} ${kb(size)} kB`); continue }
  total += size
}
console.log(`entry ${entry}: ${kb(entrySize)} kB (budget ${BUDGET.entryKb}), all eager-capable JS: ${kb(total)} kB (budget ${BUDGET.totalKb})`)
if (optIn.length) console.log(`opt-in chunks not counted: ${optIn.join(', ')}`)
const over = [kb(entrySize) > BUDGET.entryKb && 'entry', kb(total) > BUDGET.totalKb && 'total'].filter(Boolean)
if (over.length) { console.error(`Bundle budget exceeded: ${over.join(', ')}`); process.exit(1) }
