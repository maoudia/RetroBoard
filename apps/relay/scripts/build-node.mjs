#!/usr/bin/env node
// Bundles the Node adapter to apps/relay/dist/node.mjs. `ws` stays external: the container image installs it next to the bundle.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const result = await build({
  entryPoints: [fileURLToPath(new URL('src/adapters/node.ts', root).href)],
  outfile: fileURLToPath(new URL('dist/node.mjs', root).href),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['ws'],
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
})
const bytes = Object.values(result.metafile.outputs).reduce((sum, o) => sum + o.bytes, 0)
console.log(`apps/relay/dist/node.mjs: ${(bytes / 1024).toFixed(1)} kB`)
