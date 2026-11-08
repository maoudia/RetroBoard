import { type Browser, expect, type Page } from '@playwright/test'
import { createBoard, join as joinBoard, noteByText, publishNote, settle } from '../e2e/helpers'
import { type Locale, type Op, text } from './manifest'

/**
 * The seeded demo board shared by the picture tour (tour.spec.ts) and the video tour (video.spec.ts): the same invented
 * names and notes, the same fixed clock, the same way of playing a manifest op. Nothing real, nothing personal.
 */
export const FIXED_TIME = new Date('2026-03-02T09:30:00Z')

export const DEMO: Record<Locale, { alex: string; sam: string; notes: [number, string, 'alex' | 'sam'][] }> = {
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

/** Nothing local in a picture or a video: the dev origin becomes the public host. */
export async function maskLocalOrigin(page: Page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLInputElement>('input')) if (el.value.includes('127.0.0.1')) el.value = el.value.replace(/http:\/\/127\.0\.0\.1:\d+/, 'https://retroboard.maoudia.com')
  })
}

/** Plays manifest ops on a page: `run(op)` for each op of a step, `close()` at the end (the second participant). */
export function demoRunner(page: Page, browser: Browser, locale: Locale) {
  const demo = DEMO[locale]
  let sam: { close(): Promise<void> } | null = null

  async function run(op: Op) {
    if ('goto' in op) await page.goto(op.goto)
    else if ('demoBoard' in op) {
      await createBoard(page, { template: 'start-stop-continue', name: demo.alex, title: text('Sprint 24', locale), keepShare: true })
      const link = await page.getByTestId('share-url').inputValue()
      await page.keyboard.press('Escape')
      const side = await joinBoard(browser, link, demo.sam)
      sam = side.ctx
      for (const [col, note, who] of demo.notes) await publishNote(who === 'alex' ? page : side.page, col, note)
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

  return { run, close: async () => { await sam?.close() } }
}

/** How long a step stays on screen in the video: time to read its caption, within bounds. */
export const holdMs = (caption: string): number => Math.min(6500, Math.max(2500, 1800 + caption.length * 45))

/** The highlight of the video: a ring (and a soft dim when the target is small) around the control being explained. Test page only. */
export async function highlight(page: Page, anchor: string) {
  await page.evaluate((id) => {
    document.getElementById('guide-highlight')?.remove()
    const target = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
    if (!target) return
    const r = target.getBoundingClientRect()
    const big = r.width * r.height > innerWidth * innerHeight * 0.6
    const ring = document.createElement('div')
    ring.id = 'guide-highlight'
    // CSSOM only: a style attribute written as markup would break the strict CSP of the page.
    Object.assign(ring.style, {
      position: 'fixed', left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px`,
      border: '3px solid #ff9500', borderRadius: '14px', boxShadow: big ? 'none' : '0 0 0 9999px rgba(0, 0, 0, 0.32)', pointerEvents: 'none', zIndex: '2147483647',
    })
    document.body.append(ring)
  }, anchor)
}

export const clearHighlight = (page: Page) => page.evaluate(() => document.getElementById('guide-highlight')?.remove())
