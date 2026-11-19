// Bundles the fake Graph server (TypeScript, workspace sources) and runs it: the Playwright `webServer` of the OneDrive e2e specs.
import { build } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const outfile = `${mkdtempSync(`${tmpdir()}/rb-fake-graph-`)}/server.mjs`
await build({
  entryPoints: [fileURLToPath(new URL('./fake-graph-server.ts', import.meta.url))],
  outfile, bundle: true, platform: 'node', format: 'esm', target: 'node22', logLevel: 'warning',
  // The workspace package is not linked at the root: resolve it to its sources, as the adapter contract spec does.
  alias: { '@retroboard/testkit': fileURLToPath(new URL('../../../packages/testkit/src/index.ts', import.meta.url)) },
})
const child = spawn(process.execPath, [outfile], { stdio: 'inherit' })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => process.exit(code ?? 0))
