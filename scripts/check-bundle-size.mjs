#!/usr/bin/env node
// Bundle budget for the static site (gzip sizes). Fails CI when a budget is exceeded.
// Lazy chunks loaded only on opt-in (the WebMCP polyfill) are reported but not counted.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dir = process.argv[2] ?? 'apps/web/.output/public'
// 2026-10-25: total raised from 220 to 245 kB for the peer-to-peer mesh, presenter mode, filter,
// retro report, export by destination and talk time (+12 kB measured).
// 2026-10-25: total raised from 245 to 260 kB for sticky notes v2, board lifecycle, keyboard shortcuts
// and the phase-end popup (246.6 kB measured). Splitting chunks does not help: the budget counts all of them.
// 2026-10-30: total raised from 260 to 270 kB for activity rings, results charts, the ROTI vote, the cluster
// peek and the spring animation (260.7 kB measured, 9 kB of headroom kept on purpose). Lazy loading would not
// lower this metric because every chunk is counted. A metric based on the entry's static
// import graph (what really blocks first paint) is planned in quality-gates-v2.
// Raise it only on purpose.
const BUDGET = { entryKb: 40, totalKb: 270 }
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
