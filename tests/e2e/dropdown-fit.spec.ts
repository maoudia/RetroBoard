import { expect, test } from '@playwright/test'
import { createBoard, noteByText, publishNote } from './helpers'

test.describe('a menu fits the visible area (history-panel-phone-layout)', () => {
  test.skip(({ isMobile }) => isMobile, 'the viewport is set by the test')

  test('at 360 x 640 with the presenter bar open the history panel stays above the bar and scrolls inside', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 360, height: 640 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    // Deleting is what fills the history (a restorable action each).
    for (let i = 0; i < 10; i++) {
      await publishNote(page, 0, `Entry number ${i}`)
      await page.locator('body').click({ position: { x: 5, y: 300 } })
      await expect(async () => {
        await noteByText(page, `Entry number ${i}`).locator('[data-testid^="note-menu-"]').click()
        await page.getByRole('menuitem', { name: 'Supprimer' }).click({ timeout: 2000 })
      }).toPass({ timeout: 10_000 })
      await expect(noteByText(page, `Entry number ${i}`)).toHaveCount(0)
    }
    await page.getByTestId('btn-presenter').click()
    await expect(page.getByTestId('presenter-focus')).toBeVisible()
    const show = page.getByTestId('chrome-show')
    if (await show.isVisible()) await show.click()
    await page.getByTestId('btn-history').click()
    const panel = page.locator('.dd-panel:popover-open')
    await expect(panel).toBeVisible()
    const fits = async () => {
      const p = (await panel.boundingBox())!
      const bar = (await page.getByTestId('presenter-focus').boundingBox())!
      const vh = page.viewportSize()!.height
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y + p.height).toBeLessThanOrEqual(Math.min(bar.y, vh) + 1)
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
