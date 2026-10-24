import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~~': `${root}apps/web`,
      '~': `${root}apps/web/app`,
      // Resolve workspace packages to sources relative to this config, so mutation testing
      // (which copies the repo to a sandbox) runs the mutated copies, not the originals.
      ...Object.fromEntries(['domain', 'application', 'protocol', 'exporters', 'i18n', 'themes', 'testkit']
        .map((p) => [`@retroboard/${p}`, `${root}packages/${p}/src/index.ts`])),
    },
  },
  test: {
    include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: undefined,
    coverage: {
      provider: 'v8',
      include: ['apps/relay/src/**', 'packages/*/src/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // Ratchets: never lower them. Targets (docs/PLAN.md 10.1): domain 95, application 90, others 80.
      thresholds: {
        'packages/domain/src/**': { lines: 95 },
        'packages/application/src/**': { lines: 90 },
        'packages/protocol/src/**': { lines: 90 },
        'packages/exporters/src/**': { lines: 90 },
        'packages/i18n/src/**': { lines: 95 },
        'packages/themes/src/**': { lines: 60 },
        'apps/relay/src/**': { lines: 30 },
      },
    },
  },
})
