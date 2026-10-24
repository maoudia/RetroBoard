import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~~': root,
      '~': `${root}app`,
      '#shared': `${root}shared`,
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'app/**/*.test.ts', 'shared/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: undefined,
    coverage: { provider: 'v8', include: ['shared/**', 'app/**', 'apps/relay/src/**', 'packages/*/src/**'] },
  },
})
