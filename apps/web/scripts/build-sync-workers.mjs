#!/usr/bin/env node
// Builds the provider worker scripts (change user-drive-storage, ADR-0039) to `public/sync/<provider>.js`: one self-contained,
// un-hashed file per provider, because the Worker serves each from a fixed path with a Content-Security-Policy of its own
// (apps/relay/src/core/headers.ts, SYNC_WORKER_ORIGINS) that names only that provider's origins. Nuxt copies `public/` into the
// site, so `generate` and `dev` both find it. The output is not committed.
import { build } from 'esbuild'
import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const web = fileURLToPath(new URL('../', import.meta.url))

const WORKERS = { onedrive: `${web}app/adapters/sync/workers/onedrive.ts` }

/** Builds every provider worker into `out` (default `public/sync`) and returns the path of each. */
export async function buildSyncWorkers(out = `${web}public/sync`) {
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const files = {}
  for (const [name, entry] of Object.entries(WORKERS)) {
    files[name] = `${out}/${name}.js`
    await buildOne(entry, files[name])
  }
  return files
}

async function buildOne(entry, outfile) {
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    // A classic worker, so `new Worker('/sync/onedrive.js')` works in every engine; `default-src 'none'` in its policy closes importScripts.
    format: 'iife',
    target: 'es2022',
    platform: 'browser',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    // The worker needs the port's error type and path rules, not the whole application package (use cases, and the domain behind them).
    alias: { '~': `${web}app`, '@retroboard/application': `${web}../../packages/application/src/ports/sync-target.ts` },
    logLevel: 'warning',
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildSyncWorkers()
