import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~~': `${root}apps/web`,
      '~': `${root}apps/web/app`,
    },
  },
  test: {
    include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: undefined,
    coverage: { provider: 'v8', include: ['apps/web/app/**', 'apps/relay/src/**', 'packages/*/src/**'] },
  },
})
