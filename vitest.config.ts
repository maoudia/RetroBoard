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
      ...Object.fromEntries(['domain', 'application', 'protocol', 'exporters', 'crypto', 'sync', 'i18n', 'themes', 'testkit']
        .map((p) => [`@retroboard/${p}`, `${root}packages/${p}/src/index.ts`])),
    },
  },
  test: {
    // Raw Allure results for the aggregated report; off unless the CI sets ALLURE_RESULTS_DIR (Stryker runs untouched).
    ...(process.env.ALLURE_RESULTS_DIR ? { setupFiles: ['allure-vitest/setup'], reporters: ['default', 'json', ['allure-vitest/reporter', { resultsDir: process.env.ALLURE_RESULTS_DIR }]], outputFile: { json: 'reports/unit/results.json' } } : {}),
    include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts', 'scripts/*/test/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: undefined,
    coverage: {
      provider: 'v8',
      include: ['apps/relay/src/**', 'packages/*/src/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      // Ratchet: every statement, branch, function and line of the sources is covered. Never lower it. A line that cannot be
      // reached is dead code and is removed; nothing is excluded to hide a gap.
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})
