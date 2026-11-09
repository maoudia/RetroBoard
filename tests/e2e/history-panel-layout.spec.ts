import { expect, test, type Page } from '@playwright/test'
import { axe, createBoard, noteByText, publishNote, settle } from './helpers'

const LONG = 'Supercalifragilisticexpialidocious_and_more_letters_without_any_space'

/** Deleting is what fills the history (one restorable action each). */
async function seedHistory(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const text = i === 0 ? LONG : `Entry number ${i}`
    await publishNote(page, 0, text)
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await expect(async () => {
      await noteByText(page, text).locator('[data-testid^="note-menu-"]').click()
      await page.getByRole('menuitem', { name: 'Supprimer' }).click({ timeout: 2000 })
    }).toPass({ timeout: 10_000 })
    await expect(noteByText(page, text)).toHaveCount(0)
  }
}

async function openHistory(page: Page) {
  const show = page.getByTestId('chrome-show')
  if (await show.isVisible()) await show.click()
  await page.getByTestId('btn-history').click()
  const panel = page.locator('.dd-panel:popover-open')
  await expect(panel).toBeVisible()
  await settle(page)
  return panel
}

test.describe('history panel on a phone (history-panel-phone-layout)', () => {
  test.skip(({ isMobile }) => isMobile, 'the viewport is set by the test')

  test('entries never collide, the restore pill stays on one line, and the panel fits above the presenter bar', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 360, height: 640 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await seedHistory(page, 12)

    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 640 })
      const panel = await openHistory(page)
      const box = (await panel.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
      expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)

      const entries = page.getByTestId('history-entry')
      await expect(entries.first()).toBeVisible()
      const count = await entries.count()
      expect(count).toBeGreaterThanOrEqual(12)
      let prev: { y: number; height: number } | null = null
      for (let i = 0; i < count; i++) {
        const e = (await entries.nth(i).boundingBox())!
        if (prev) expect(e.y).toBeGreaterThanOrEqual(prev.y + prev.height - 1)
        prev = e
        const btn = (await entries.nth(i).getByTestId('history-restore').boundingBox())!
        expect(btn.height).toBeGreaterThanOrEqual(39)
        expect(btn.height).toBeLessThan(56)
        expect(btn.x + btn.width).toBeLessThanOrEqual(box.x + box.width + 1)
      }
      const last = (await entries.last().boundingBox())!
      expect(last.height).toBeGreaterThan(0)
      await expect(entries.first().getByTestId('history-restore')).toHaveAttribute('aria-label', /^Restaurer avant : /)
      await expect(entries.first().getByTestId('history-restore')).toContainText('Restaurer')
      await expect(entries.first()).toContainText('Entry number')

      const found = (await axe(page).include('[data-testid="history-panel"]').analyze()).violations.map((v) => v.id)
      expect(found).toEqual([])
      await page.keyboard.press('Escape')
      await expect(panel).toBeHidden()
    }

    await page.setViewportSize({ width: 360, height: 640 })
    await page.getByTestId('btn-presenter').click()
    await expect(page.getByTestId('presenter-focus')).toBeVisible()
    const panel = await openHistory(page)
    const fits = async () => {
      const p = (await panel.boundingBox())!
      const bar = (await page.getByTestId('presenter-focus').boundingBox())!
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y + p.height).toBeLessThanOrEqual(Math.min(bar.y, page.viewportSize()!.height) + 1)
    }
    await fits()
    expect(await panel.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
    await expect(panel).toHaveAttribute('tabindex', '0')
    await expect(panel).toHaveAttribute('data-more', '')
    await panel.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await expect(panel).not.toHaveAttribute('data-more', '')

    await page.setViewportSize({ width: 360, height: 520 })
    await expect(panel).toBeVisible()
    await expect(async () => { await fits() }).toPass()

    await page.setViewportSize({ width: 420, height: 520 })
    await expect(panel).toBeHidden()
  })
})
