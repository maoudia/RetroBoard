import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { createBoard, join as joinBoard, noteByText, publishNote, settle } from '../e2e/helpers'
import { CHAPTERS, imageName, type Locale, type Op, text } from './manifest'

/**
 * The tour: walks the guide manifest on a seeded demo board and photographs every step, once for each language and each
 * variant. Pictures go to `.guide-tmp/shots/<locale>/<variant>/<chapter>-<step>.png`; `scripts/docs/tour.mjs` turns them
 * into the optimised images of the guide. Only invented names and notes appear (nothing real, nothing personal).
 */
const OUT = process.env.GUIDE_SHOTS ?? '.guide-tmp/shots'
const FIXED_TIME = new Date('2026-03-02T09:30:00Z')

const DEMO: Record<Locale, { alex: string; sam: string; notes: [number, string, 'alex' | 'sam'][] }> = {
  fr: {
    alex: 'Alex',
    sam: 'Sam',
    notes: [
      [0, 'Les démos de fin de sprint ont donné du rythme', 'alex'],
      [0, 'Le déploiement du vendredi s’est bien passé', 'sam'],
      [1, 'Trop de réunions le mercredi', 'alex'],
      [1, 'Les tickets manquent de contexte', 'sam'],
      [2, 'Programmer une session de pair programming', 'sam'],
    ],
  },
  en: {
    alex: 'Alex',
    sam: 'Sam',
    notes: [
      [0, 'The sprint demos gave us momentum', 'alex'],
      [0, 'Friday’s deployment went smoothly', 'sam'],
      [1, 'Too many meetings on Wednesday', 'alex'],
      [1, 'Tickets lack context', 'sam'],
      [2, 'Schedule a pair programming session', 'sam'],
    ],
  },
}

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
        const demo = DEMO[locale]
        const dir = join(OUT, locale, variant)
        mkdirSync(dir, { recursive: true })
        let sam: { close(): Promise<void> } | null = null

        const run = async (op: Op) => {
          if ('goto' in op) await page.goto(op.goto)
          else if ('demoBoard' in op) {
            await createBoard(page, { template: 'start-stop-continue', name: demo.alex, title: text('Sprint 24', locale), keepShare: true })
            const link = await page.getByTestId('share-url').inputValue()
            await page.keyboard.press('Escape')
            const side = await joinBoard(browser, link, demo.sam)
            sam = side.ctx
            for (const [col, note, who] of demo.notes) {
              const p = who === 'alex' ? page : side.page
              await publishNote(p, col, note)
            }
            await expect(noteByText(page, demo.notes[4]![1])).toBeVisible()
            // Two votes and one cluster, so the report and the guide show a board that has lived a little.
            const note = (i: number) => noteByText(page, demo.notes[i]![1])
            await note(1).locator('[data-testid^="vote-"]').first().click()
            await note(0).locator('[data-testid^="vote-"]').first().click()
            await note(3).dragTo(note(2))
            await settle(page)
          } else if ('click' in op) await page.getByTestId(op.click).first().click()
          else if ('press' in op) await page.keyboard.press(op.press)
          else if ('fill' in op) await page.getByTestId(op.fill[0]).fill(text(op.fill[1], locale))
          else if ('viewport' in op) await page.setViewportSize({ width: op.viewport[0], height: op.viewport[1] })
          await settle(page)
        }

        for (const chapter of CHAPTERS) {
          for (const step of chapter.steps) {
            for (const op of step.ops) await run(op)
            // Nothing local in a picture: the dev origin becomes the public host.
            await page.evaluate(() => {
              for (const el of document.querySelectorAll<HTMLInputElement>('input')) if (el.value.includes('127.0.0.1')) el.value = el.value.replace(/http:\/\/127\.0\.0\.1:\d+/, 'https://retroboard.maoudia.com')
            })
            for (const a of step.anchors) await expect(page.getByTestId(a).first(), `${chapter.id}/${step.id}: anchor ${a}`).toBeVisible()
            const file = join(dir, imageName(chapter, step).replace(/\.webp$/, '.png'))
            if (step.shoot) await page.getByTestId(step.shoot).first().screenshot({ path: file, animations: 'disabled' })
            else await page.screenshot({ path: file, animations: 'disabled' })
          }
        }
        await sam?.close()
      })
    })
  }
}
