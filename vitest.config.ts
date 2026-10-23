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
    include: ['tests/unit/**/*.test.ts', 'app/**/*.test.ts', 'shared/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: undefined,
    coverage: { provider: 'v8', include: ['shared/**', 'app/**', 'worker/**'] },
  },
})
