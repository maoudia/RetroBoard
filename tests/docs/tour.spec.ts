import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { demoRunner, FIXED_TIME, maskLocalOrigin } from './demo'
import { CHAPTERS, imageName } from './manifest'

/**
 * The tour: walks the guide manifest on a seeded demo board and photographs every step, once for each language and each
 * variant. Pictures go to `.guide-tmp/shots/<locale>/<variant>/<chapter>-<step>.png`; `scripts/docs/tour.mjs` turns them
 * into the optimised images of the guide. Only invented names and notes appear (nothing real, nothing personal).
 */
const OUT = process.env.GUIDE_SHOTS ?? '.guide-tmp/shots'

for (const locale of ['fr', 'en'] as const) {
  for (const variant of ['light', 'dark'] as const) {
    test.describe(`${locale} ${variant}`, () => {
      test.use({
        locale: locale === 'fr' ? 'fr-FR' : 'en-US',
        colorScheme: variant,
        storageState: { cookies: [], origins: [{ origin: `http://127.0.0.1:${Number(process.env.E2E_PORT ?? 8788)}`, localStorage: [{ name: 'retroboard:settings', value: JSON.stringify({ uiMode: 'advanced', variant, locale: 'auto' }) }] }] },
      })

      test('the guide tour', async ({ page, browser }) => {
        if (!process.env.GUIDE_NO_CLOCK) await page.clock.setFixedTime(FIXED_TIME)
        const dir = join(OUT, locale, variant)
        mkdirSync(dir, { recursive: true })
        const demo = demoRunner(page, browser, locale)

        for (const chapter of CHAPTERS) {
          for (const step of chapter.steps) {
            for (const op of step.ops) await demo.run(op)
            await maskLocalOrigin(page)
            for (const a of step.anchors) await expect(page.getByTestId(a).first(), `${chapter.id}/${step.id}: anchor ${a}`).toBeVisible()
            const file = join(dir, imageName(chapter, step).replace(/\.webp$/, '.png'))
            if (step.shoot) await page.getByTestId(step.shoot).first().screenshot({ path: file, animations: 'disabled' })
            else await page.screenshot({ path: file, animations: 'disabled' })
          }
        }
        await demo.close()
      })
    })
  }
}
