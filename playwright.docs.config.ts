import { defineConfig, devices } from '@playwright/test'

// The user guide tour (tests/docs, change user-manual-and-tutorials): not part of the e2e suite, run by `pnpm docs:tour`.
const port = Number(process.env.E2E_PORT ?? 8788)

export default defineConfig({
  testDir: 'tests/docs',
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  outputDir: '.guide-tmp/results',
  use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, baseURL: `http://127.0.0.1:${port}`, trace: 'off', video: 'off' },
  webServer: {
    // The guide shows what a deployment with OneDrive configured looks like (the id is a placeholder: the tour never signs in).
    command: `npx wrangler dev --port ${port} --ip 127.0.0.1 --var ONEDRIVE_CLIENT_ID:11111111-2222-4333-8444-555555555555`,
    url: `http://127.0.0.1:${port}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
