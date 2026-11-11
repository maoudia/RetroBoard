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
// 2026-10-31: total raised from 270 to 300 kB on the owner's request, for the facilitation and presentation
// features of 1.6 to 1.9 (focus, voted ideas walk-through, phase stepper, key caps, name conflicts; 267.1 kB measured).
// 2026-11-02: entry raised from 40 to 44 kB and total from 300 to 330 kB for the phone layout (one column per
// screen, dots), the resizable columns and writing field, the shared board display and the edit-by-facilitator
// flow (41.3 and 299.3 kB measured). Splitting the board dialogs into lazy chunks is tracked in quality-gates-v2.
// 2026-11-09: total raised from 330 to 335 kB for team sharing (encrypted team link, .retroteam file, join dialog,
// fr/en strings; +4.8 kB measured over 327.3). The entry stays at 43.3 kB: the sharing UI is lazy but every chunk is counted.
// 2026-11-11: total raised from 335 to 337 kB for touch drag and drop (long press lifts a note or a cluster, +1.1 kB
// measured over 334.9, 336 kB after). The base was already within 0.1 kB of the old budget.
// 2026-11-11: total raised from 337 to 342 kB for the export hub: file preview before saving (table, folded JSON,
// Markdown renderer, sandboxed frame), the optional Slack webhook and their fr/en strings (about 336 kB before,
// +3.3 kB for the hub, 340.3 kB measured on top of the composer change). The captain allows up to 400 kB; the entry is unchanged.
// 2026-11-11: entry raised from 44 to 45 kB and total from 342 to 346 kB for the move to a fresh link (remove dialog, signed
// and sealed hand-off, removed and closed pages, fr/en strings; entry 44.6 kB measured).
// Raise it only on purpose.
const BUDGET = { entryKb: 45, totalKb: 346 }
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
