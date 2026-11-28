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
// 2026-11-12: entry raised from 45 to 48 kB and total from 346 to 352 kB for signed snapshots (ADR-0037): snapshot schemas, the
// verifier, the log base and the transport side of the snapshot join (46.7 kB entry and 347.2 kB total measured on top of the move to a fresh link).
// 2026-11-13: entry raised from 48 to 50 kB for the prerendered landing (ADR-0038): the hydration of the server-rendered hero and the
// post-hydration language and theme settings joined the entry (47.5 to 49.7 kB measured, total 348.6 to 350.9 kB). The first and the
// largest contentful paint no longer wait for it: Lighthouse mobile on the landing went from 90 to 100, LCP from 3.6 s to 1.1 s.
// 2026-11-14: total raised from 352 to 356 kB for the minor-and-patch dependency group (vue 3.5.45, @nuxt/icon 2.6.2, @mcp-b/global 6.2.0):
// 352.8 kB measured, 351.8 kB before, no source change.
// The captain allows up to 400 kB.
// 2026-11-14: entry raised from 50 to 51 kB and total from 356 to 360 kB for the board library (user-drive-storage, group 1): the sealed
// vault object format, the IndexedDB target, the library store and list, the migration and their fr/en strings (50.2 kB entry and
// 359.5 kB total measured, 352.8 kB before). The Argon2id derivation is a lazy import that nothing loads yet, so it is not in these figures.
// 2026-11-14: total raised from 360 to 398 kB for folder sync (user-drive-storage, group 2): the vault engine and its merge rules, the
// folder adapter, the use cases and codecs, the scheduler, the Argon2id derivation (a lazy chunk, now loaded when a password is typed),
// Preferences > Sync, the status chip and their fr/en strings (398.3 kB total measured after the rebase on the landing section, 361.3 kB before). The entry stays under 51 kB
// (50.8 measured): the engine and the interface load only when a folder is connected or chosen.
// Raise it only on purpose.
// 2026-11-19: total raised from 360 to 362 kB for the landing's open-code section and five feature cards (landing-v2-and-product-video,
// tasks 2.1 and 2.3): 26 fr/en strings, +1.8 kB measured over 359.5 (361.3 kB after). The entry stays at 50.2 kB.
// 2026-11-19: entry raised from 51 to 52 kB for OneDrive sync (user-drive-storage, group 3): its English strings and the sign-in route are in the
// entry (51.9 kB measured, 50.8 before). The total stays at the owner's 400 kB cap.
// 2026-11-20: entry raised from 52 to 56 kB for the format pages (public-launch, group 1): four prerendered routes (/formats/, /formats/<id>/ and their
// /en twins) and the shared pieces they pull into the entry (55.2 kB measured, 51.9 before); the total stays far under the owner's 400 kB cap (387.3 kB).
// 2026-11-21: total raised from 400 to 500 kB by decision of the owner, for the poker seam of the shared code (change scrum-poker, task 1.2, ADR-0042)
// and the room of the next groups: the kind-aware ledger fold with the estimation reducer, and the poker command schema of the signed event
// (400.7 kB measured, 399.8 kB before, +0.9 kB; the entry moved from 55.8 to 56.0 kB). The poker pages, strings, decks and statistics are not in
// this figure yet.
// 2026-11-21: entry raised from 56 to 56.5 kB for the launch of Scrum Poker in every build (change scrum-poker, tasks 1.1 and 2.1): the two routes of the
// router table, the redirect of a poker link opened as a board (a notice of the board transport and store) and nothing else (56.3 kB measured, 56.0 before).
// The poker pages, their strings, decks and statistics are lazy chunks counted in the total (414.2 kB of 500 with them); the landing page chunk carries the
// three entry labels. Raise it only on purpose.
// 2026-11-21: entry raised from 56.5 to 56.6 kB (56.5 measured at the limit before) for the help of the profile dialog (change poker-design-v2, the shell of the
// poker pages): the dialog that every page shares gets the guide of the page and the feedback links, and the entry carries only the lazy wrapper of that
// component (about 0.1 kB; the component, the guide link and the feedback links are a lazy chunk). The poker bar reuses the toolbar's mark, its light or dark
// button (which reads the variant from the root, so that the theme store does not move into the entry) and the avatar.
// 2026-11-28: entry raised from 56.6 to 56.8 kB (56.7 measured) for the fr/en strings of the simple creation page (change simple-mode-ux-pass, groups 1 and 2).
const BUDGET = { entryKb: 56.8, totalKb: 500 }
const OPT_IN = [/initializeWebModelContext/]
// A small chunk is opt-in only by an exact marker (the size guard below protects the big ones from a stray match). 2026-11-19, user-drive-storage:
// the chunks that load only once a person connects a sync target are opt-in like the WebMCP polyfill, so they are reported and not counted: the
// vault runtime (scheduler, engine wiring, folder access; marker: the Web Lock name), the Argon2id worker (marker: its failure code) and the
// OneDrive sign-in with the page side of its worker (marker: the sessionStorage key of a pending sign-in). The Preferences > Sync screen, the
// library and everything the entry imports statically stay counted.
// 2026-11-20, group-colors-menu-and-scope: the colour palette dialog (marker: its "more shades" test id) is a lazy chunk fetched at the first opening;
// the cluster panel (marker: its recolour test id) is lazy too, fetched when a cluster is first opened.
const OPT_IN_SMALL = [/retroboard:oauth:/, /retroboard-vault-/, /derivation-failed/, /palette-more/, /cluster-recolor/]

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
  const text = raw.toString('utf8')
  if ((raw.length > 100_000 && OPT_IN.some((re) => re.test(text))) || OPT_IN_SMALL.some((re) => re.test(text))) { optIn.push(`${file} ${kb(size)} kB`); continue }
  total += size
}
console.log(`entry ${entry}: ${kb(entrySize)} kB (budget ${BUDGET.entryKb}), all eager-capable JS: ${kb(total)} kB (budget ${BUDGET.totalKb})`)
if (optIn.length) console.log(`opt-in chunks not counted: ${optIn.join(', ')}`)
const over = [kb(entrySize) > BUDGET.entryKb && 'entry', kb(total) > BUDGET.totalKb && 'total'].filter(Boolean)
if (over.length) { console.error(`Bundle budget exceeded: ${over.join(', ')}`); process.exit(1) }
