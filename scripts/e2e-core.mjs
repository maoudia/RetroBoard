#!/usr/bin/env node
// Runs the core e2e specs (tests/e2e/core.json). Extra arguments go to Playwright:
//   pnpm e2e:core --project=chromium --shard=1/3
// E2E_TARGET=node runs them against the Node adapter instead of `wrangler dev` (the default, E2E_TARGET=workerd).
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const { specs, needsWebRTC = [] } = JSON.parse(readFileSync(new URL('../tests/e2e/core.json', import.meta.url), 'utf8'))
const target = process.env.E2E_TARGET ?? 'workerd'
if (!['workerd', 'node'].includes(target)) { console.error(`e2e:core: E2E_TARGET must be workerd or node, got "${target}"`); process.exit(2) }
console.log(`e2e:core: relay target ${target}`)
const files = specs.map((s) => `tests/e2e/${s}.spec.ts`)
// WebRTC data channels do not open between two browsers on a laptop (they do on the CI runners): skip those specs locally,
// say so, and let CI run them. E2E_WEBRTC=1 forces them on.
const skip = !process.env.CI && !process.env.E2E_WEBRTC && needsWebRTC.length
const grep = skip ? ['--grep-invert', needsWebRTC.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')] : []
if (skip) console.log(`e2e:core: ${needsWebRTC.length} WebRTC spec(s) skipped on this machine (CI runs them; E2E_WEBRTC=1 forces them)`)
const run = spawnSync('pnpm', ['exec', 'playwright', 'test', ...files, ...grep, ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(run.status ?? 1)
