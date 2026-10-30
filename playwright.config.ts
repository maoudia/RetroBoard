import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 8787)

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  // One worker: on 2 cores Chromium is CPU bound, a second worker gained 12% and made tests flaky.
  // Every test uses its own room, so E2E_WORKERS=4 is safe on a bigger machine.
  fullyParallel: false,
  workers: Number(process.env.E2E_WORKERS ?? 1),
  retries: process.env.CI ? 1 : 0,
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
          { name: 'webkit', use: { ...devices['Desktop Safari'], contextOptions: { reducedMotion: 'reduce' } } },
          { name: 'phone', use: { ...devices['Pixel 7'] } },
          { name: 'tv', use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } } },
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
