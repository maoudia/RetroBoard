import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { createBoard, publishNote } from '../e2e/helpers'
import { DEMO, FIXED_TIME } from './demo'

/**
 * The launch media (change public-launch, task 2.2), run by `scripts/launch/media.mjs` (`pnpm launch:media`): one invented demo board per theme in
 * light and dark (the same names and notes as the guide tour, never a real board), and the recording of the landing walkthrough that the script cuts
 * to 30 s. Writes `<LAUNCH_MEDIA>/board-<theme>-<variant>.png`, `raw.webm` and `timings.json`.
 */
const OUT = process.env.LAUNCH_MEDIA ?? '.guide-tmp/launch'
const THEMES = (process.env.LAUNCH_THEMES ?? 'studio').split(',')
const PORT = Number(process.env.E2E_PORT ?? 8788)
const ORIGIN = `http://127.0.0.1:${PORT}`
const SIZE = { width: 1280, height: 800 }

// One test per theme and variant, so each board starts from a fresh browser context (no remembered name, no earlier board).
for (const variant of ['light', 'dark'] as const) {
  test.describe(`demo boards ${variant}`, () => {
    test.use({
      locale: 'en-US',
      colorScheme: variant,
      viewport: SIZE,
      storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [{ name: 'retroboard:settings', value: JSON.stringify({ uiMode: 'advanced', variant, locale: 'auto' }) }] }] },
    })

    for (const theme of THEMES) {
      test(`the ${theme} demo board`, async ({ page }) => {
        test.setTimeout(120_000)
        await page.clock.setFixedTime(FIXED_TIME)
        mkdirSync(OUT, { recursive: true })
        await createBoard(page, { theme, template: 'start-stop-continue', name: DEMO.en.alex, title: 'Sprint 24' })
        for (const [col, note] of DEMO.en.notes) await publishNote(page, col, note)
        await expect(page.getByTestId('board')).toBeVisible()
        await page.screenshot({ path: join(OUT, `board-${theme}-${variant}.png`), animations: 'disabled' })
      })
    }
  })
}

test('the landing walkthrough recording', async ({ browser }) => {
  mkdirSync(OUT, { recursive: true })
  const context = await browser.newContext({ baseURL: ORIGIN, locale: 'en-US', colorScheme: 'light', reducedMotion: 'no-preference', viewport: SIZE, recordVideo: { dir: join(OUT, 'video'), size: SIZE } })
  const t0 = Date.now()
  const page = await context.newPage()
  await page.goto('/')
  const wt = page.getByTestId('walkthrough')
  await wt.scrollIntoViewIfNeeded()
  await expect(wt).toHaveAttribute('data-scene', '0')
  const startMs = Date.now() - t0
  // Five scenes of six seconds, and a margin for the cut.
  await page.waitForTimeout(31_000)
  const video = page.video()
  await context.close()
  renameSync(await video!.path(), join(OUT, 'raw.webm'))
  writeFileSync(join(OUT, 'timings.json'), JSON.stringify({ size: SIZE, startMs }, null, 2) + '\n')
})
