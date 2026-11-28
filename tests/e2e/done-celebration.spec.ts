import { expect, type Page, test } from '@playwright/test'
import { axe, collectProblems, createBoard, join, noteByText, publishNote } from './helpers'

/**
 * Celebration of a finished idea (change done-celebration): one signature per theme, driven by the board state so every device that sees
 * the change live plays it, never for a device that joins late, off with a personal switch, a static check mark under reduced motion.
 * Every effect leaves a `[data-celebration]` element (an overlay on the idea and its action row, or a particle canvas) that clears itself.
 */
const THEMES = ['studio', 'corporate', 'slate', 'paper', 'minimal', 'halloween', 'noel', 'cyber', 'sakura'] as const
const celebration = (page: Page) => page.locator('[data-celebration]')
const reduced = (page: Page) => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)

async function shareLink(page: Page) {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}

/** A board with one published idea and an action born from it, still open. Leaves the actions drawer open. */
async function ideaWithAction(page: Page, theme: string) {
  await createBoard(page, { theme, template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Alpha idea')
  await noteByText(page, 'Alpha idea').locator('[data-testid^="note-menu-"]').click()
  await page.locator('[data-testid^="create-action-"]').click()
  await page.getByTestId('action-add').click()
  await expect(page.getByTestId('actions').locator('li')).toHaveCount(1)
}
const tick = (page: Page) => page.getByTestId('actions').locator('li input[type="checkbox"]').check()

test.describe('done celebration', () => {
  for (const theme of THEMES) {
    test(`${theme}: plays once on the idea and clears, with no violation`, async ({ page }) => {
      const problems = await collectProblems(page)
      await ideaWithAction(page, theme)
      await expect(celebration(page)).toHaveCount(0)
      await tick(page)
      await expect(celebration(page).first()).toBeAttached()
      if (!(await reduced(page))) {
        const own = await page.getByTestId('actions').locator('li [data-celebration]').count()
        const canvas = await page.locator('canvas[data-celebration]').count()
        expect(own + canvas, 'the effect is on the action row or a particle canvas').toBeGreaterThan(0)
      }
      const result = await axe(page).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([])
      await expect(celebration(page)).toHaveCount(0, { timeout: 4000 })
      await expect(page.getByTestId('live-polite')).toHaveText('Idée terminée', { timeout: 4000 })
      expect(problems).toEqual([])
    })
  }

  test('a second device sees it live, and a device that joins later does not', async ({ page, browser }) => {
    await ideaWithAction(page, 'studio')
    const link = await (async () => { await page.keyboard.press('Escape'); return shareLink(page) })()
    const bob = await join(browser, link, 'Bob')
    await page.getByTestId('btn-actions').click()
    await tick(page)
    await expect(noteByText(bob.page, 'Alpha idea').locator('[data-celebration]')).toBeAttached()
    await expect(celebration(bob.page)).toHaveCount(0, { timeout: 4000 })

    const carol = await join(browser, link, 'Carol')
    await carol.page.waitForTimeout(600)
    await expect(celebration(carol.page)).toHaveCount(0)
    await carol.ctx.close()
    await bob.ctx.close()
  })

  test('the personal switch turns it off for me only; simple mode keeps it on and hides the switch', async ({ page, browser }) => {
    await ideaWithAction(page, 'studio')
    await page.keyboard.press('Escape')
    const bob = await join(browser, await shareLink(page), 'Bob')
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('set-celebrations')).toBeChecked()
    await page.getByTestId('set-celebrations').uncheck()
    await page.getByTestId('mode-simple').click()
    await expect(page.getByTestId('set-celebrations')).toHaveCount(0)
    await page.getByTestId('mode-advanced').click()
    await expect(page.getByTestId('set-celebrations')).not.toBeChecked()
    await page.keyboard.press('Escape')
    await page.getByTestId('btn-actions').click()
    await tick(page)
    await expect(bob.page.getByTestId('btn-actions')).toBeVisible()
    await expect(noteByText(bob.page, 'Alpha idea').locator('[data-celebration]')).toBeAttached()
    await page.waitForTimeout(500)
    await expect(celebration(page)).toHaveCount(0)
    await expect(page.getByTestId('live-polite')).toHaveText('')
    await bob.ctx.close()
  })

  test('reduced motion shows a static check mark instead', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await ideaWithAction(page, 'sakura')
    await tick(page)
    await expect(page.locator('.cele-static').first()).toBeAttached()
    await expect(page.locator('canvas[data-celebration]')).toHaveCount(0)
    await expect(celebration(page)).toHaveCount(0, { timeout: 3000 })
  })
})
