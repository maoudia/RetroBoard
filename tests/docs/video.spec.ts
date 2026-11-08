import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { clearHighlight, demoRunner, FIXED_TIME, highlight, holdMs, maskLocalOrigin } from './demo'
import { CHAPTERS } from './manifest'

/**
 * The tutorial video: the same tour as the pictures, recorded by Playwright with a highlight ring on the control that each
 * step explains. Writes `.guide-tmp/video/<locale>/raw.webm` and `timings.json` (when each step is on screen, in ms from
 * the start of the recording); `scripts/docs/video.mjs` encodes the video and builds the WebVTT captions from them.
 */
const OUT = process.env.GUIDE_VIDEO ?? '.guide-tmp/video'
const SIZE = { width: 1280, height: 800 }
test.setTimeout(300_000)

for (const locale of ['fr', 'en'] as const) {
  test(`the tutorial video ${locale}`, async ({ browser }) => {
    const dir = join(OUT, locale)
    mkdirSync(dir, { recursive: true })
    const context = await browser.newContext({
      baseURL: `http://127.0.0.1:${Number(process.env.E2E_PORT ?? 8788)}`,
      locale: locale === 'fr' ? 'fr-FR' : 'en-US',
      colorScheme: 'light',
      viewport: SIZE,
      storageState: { cookies: [], origins: [{ origin: `http://127.0.0.1:${Number(process.env.E2E_PORT ?? 8788)}`, localStorage: [{ name: 'retroboard:settings', value: JSON.stringify({ uiMode: 'advanced', variant: 'light', locale: 'auto' }) }] }] },
      recordVideo: { dir, size: SIZE },
    })
    const page = await context.newPage()
    const t0 = Date.now()
    await page.clock.setFixedTime(FIXED_TIME)
    const demo = demoRunner(page, browser, locale)
    const timings: { chapter: string; step: string; start: number; end: number }[] = []

    for (const chapter of CHAPTERS) {
      for (const step of chapter.steps) {
        await clearHighlight(page).catch(() => undefined)
        for (const op of step.ops) await demo.run(op)
        await maskLocalOrigin(page)
        for (const a of step.anchors) await expect(page.getByTestId(a).first(), `${chapter.id}/${step.id}: anchor ${a}`).toBeVisible()
        await highlight(page, step.shoot ?? step.anchors[0]!)
        const start = Date.now() - t0
        await page.waitForTimeout(holdMs(step.caption[locale]))
        timings.push({ chapter: chapter.id, step: step.id, start, end: Date.now() - t0 })
      }
    }
    await demo.close()
    const video = page.video()
    await context.close()
    renameSync(await video!.path(), join(dir, 'raw.webm'))
    writeFileSync(join(dir, 'timings.json'), JSON.stringify({ locale, size: SIZE, timings }, null, 2) + '\n')
  })
}
