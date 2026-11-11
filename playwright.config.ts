import { availableParallelism } from 'node:os'
import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 8787)
// CI runners have 2 cores: Chromium is CPU bound there, a second worker gained 12% and made tests flaky, so CI keeps one.
// Every test uses its own room, so a developer machine runs a third of its cores (at most 4): the core gate takes a
// couple of minutes, not a quarter of an hour. E2E_WORKERS overrides both.
const workers = Number(process.env.E2E_WORKERS ?? (process.env.CI ? 1 : Math.min(4, Math.max(1, Math.floor(availableParallelism() / 3)))))

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers,
  // Parallel workers load the machine and the dev server: a test that fails once and passes again is reported as flaky.
  retries: process.env.CI || workers > 1 ? 1 : 0,
  // CI keeps everything for the quality site (GitHub Pages) and the run artifacts.
  reporter: process.env.CI
    ? [
        ['github'], ['html', { open: 'never' }], ['json', { outputFile: 'playwright-report/results.json' }], ['junit', { outputFile: 'playwright-report/junit.xml' }],
        // Raw Allure results, aggregated with the unit results into one report (quality.yml, change allure-report-aggregation).
        ...(process.env.ALLURE_RESULTS_DIR ? [['allure-playwright', { resultsDir: process.env.ALLURE_RESULTS_DIR, detail: false, suiteTitle: false }] as const] : []),
      ]
    : 'list',
  use: {
    locale: 'fr-FR',
    baseURL: `http://127.0.0.1:${port}`,
    // The suite exercises every option: start in advanced mode (the product default is simple, change simple-advanced-mode).
    storageState: { cookies: [], origins: [{ origin: `http://127.0.0.1:${port}`, localStorage: [{ name: 'retroboard:settings', value: JSON.stringify({ uiMode: 'advanced' }) }] }] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // E2E_NO_VIDEO: CI-like runs on machines without Playwright's ffmpeg.
    video: process.env.CI && !process.env.E2E_NO_VIDEO ? 'retain-on-failure' : 'off',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  // Locally only Chromium is installed. CI runs the other projects (see .github/workflows/e2e.yml).
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...(process.env.E2E_REDUCED_MOTION ? { contextOptions: { reducedMotion: 'reduce' as const } } : {}) } },
    ...(process.env.CI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          // WebKit on Linux CI renders in software: continuous effects (ambient canvas, blur,
          // infinite animations) made every test 4 to 5 times slower. Reduced motion is a
          // supported mode of the app, and Chromium/Firefox still cover the animated paths.
          // Slow software rendering on the Linux runners: the same checks, more time to see them, and two retries (a spec that needs one is reported flaky).
          { name: 'webkit', timeout: 90_000, retries: 2, expect: { timeout: 20_000 }, use: { ...devices['Desktop Safari'], contextOptions: { reducedMotion: 'reduce' } } },
          { name: 'phone', use: { ...devices['Pixel 7'] } },
          { name: 'tv', use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } } },
          // The remaining widths of the matrix (change agentic-delivery-harness, 2.1): desktop Chromium at a narrow, a tablet and a laptop width, nightly only.
          { name: 'w360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } } },
          { name: 'w768', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
          { name: 'w1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        ]
      : []),
  ],
  // Serves the generated site and the Durable Object exactly like production.
  webServer: {
    command: `npx wrangler dev --port ${port} --ip 127.0.0.1`,
    url: `http://127.0.0.1:${port}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
