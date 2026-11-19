import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const alias = Object.fromEntries(['domain', 'application', 'protocol'].map((p) => [`@retroboard/${p}`, `${root}packages/${p}/src/index.ts`]))

/**
 * Change user-drive-storage, task 2.4: the adapter contract suite (`runSyncTargetContract`) runs once in real Chromium, against
 * the folder adapter over a directory of the origin private file system, so the swap-file write, the listing and the names are
 * proved on the real File System Access implementation and not only on the fake directory handle.
 */
test('the folder adapter passes the contract suite on the origin private file system of Chromium', async ({ browser, browserName }) => {
  test.skip(browserName === 'webkit', "Playwright's WebKit has no origin private file system in its ephemeral contexts: navigator.storage.getDirectory() throws UnknownError there, so the folder stub has nothing to hand out")
  test.setTimeout(120_000)
  const bundle = await build({
    stdin: {
      contents: `
        import { contractChecks } from './packages/testkit/src/contract.ts'
        import { createFolderTarget } from './apps/web/app/adapters/sync/folder-target.ts'
        window.runFolderContract = async () => {
          const top = await (await navigator.storage.getDirectory()).getDirectoryHandle('contract-' + Date.now(), { create: true })
          const results = []
          for (const [i, check] of contractChecks.entries()) {
            const dir = await top.getDirectoryHandle('run' + i, { create: true })
            try { await check.run({ target: createFolderTarget(dir) }); results.push({ name: check.name, ok: true }) } catch (e) { results.push({ name: check.name, ok: false, error: String(e) }) }
          }
          return results
        }`,
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2023',
    alias: { ...alias, vitest: `${root}tests/e2e/support/expect-shim.ts` },
  })
  // The page's CSP forbids an injected script; this context lifts it for the test only.
  const ctx = await browser.newContext({ bypassCSP: true })
  const page = await ctx.newPage()
  await page.goto('/privacy')
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text })
  const results = await page.evaluate(() => (window as unknown as { runFolderContract: () => Promise<{ name: string; ok: boolean; error?: string }[]> }).runFolderContract())
  expect(results.length).toBeGreaterThan(8)
  expect(results.filter((r) => !r.ok)).toEqual([])
  await ctx.close()
})
