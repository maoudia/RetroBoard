#!/usr/bin/env node
/**
 * Argon2id timings for the vault password wrap (change user-drive-storage, task 1.4).
 * Usage: node quality/kdf-benchmark.mjs [--write]   (--write refreshes quality/kdf-benchmark.json)
 *
 * It runs the pure-JavaScript Argon2id of @noble/hashes the way the app does (async variant, one lane) on this machine.
 * A phone cannot be measured from here: open the same code in the phone's browser and copy the figures into the
 * "phone" entries of the JSON file by hand; until then they are an estimate, marked so.
 */
import { writeFileSync } from 'node:fs'
import { argon2idAsync } from '../packages/crypto/node_modules/@noble/hashes/argon2.js'

const CANDIDATES = [
  { name: '19 MiB x 2 (OWASP floor)', m: 19 * 1024, t: 2 },
  { name: '32 MiB x 3', m: 32 * 1024, t: 3 },
  { name: '64 MiB x 3', m: 64 * 1024, t: 3 },
]
const RUNS = 3

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const results = []
for (const c of CANDIDATES) {
  const times = []
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now()
    await argon2idAsync('correct horse battery staple', new Uint8Array(16).fill(i + 1), { t: c.t, m: c.m, p: 1, dkLen: 32, asyncTick: 10 })
    times.push(performance.now() - t0)
  }
  results.push({ ...c, desktopMs: Math.round(median(times)) })
  console.log(`${c.name.padEnd(28)} ${Math.round(median(times))} ms (median of ${RUNS})`)
}
if (process.argv.includes('--write')) {
  // Phone figures are an estimate (a mid-range Android browser is about 5 times slower than this machine in JavaScript)
  // until someone measures one: replace "estimatedMs" with "measuredMs" then.
  const PHONE_FACTOR = 5
  const out = {
    node: process.version, platform: `${process.platform}-${process.arch}`, runs: RUNS,
    results: results.map((r) => ({ ...r, phone: { estimatedMs: r.desktopMs * PHONE_FACTOR } })),
    default: { id: 'argon2id', m: 32768, t: 3, p: 1 },
    why: 'Targets: at most 1.5 s on a desktop and 4 s on a mid-range phone. 64 MiB x 3 fits on the desktop (about 0.6 s) but the phone figure is unmeasured, so the default is 32 MiB x 3; the parameters are stored with every wrap, so raising them later keeps old wraps unlockable.',
  }
  writeFileSync(new URL('./kdf-benchmark.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`)
}
