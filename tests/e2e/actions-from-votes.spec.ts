import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}
const serious = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze())
  .violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)

test.describe('voted ideas in the actions panel', () => {
  test('listed once voting is closed, most voted first, with sorts and one click to an action', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await publishNote(bob.page, 0, 'Alpha idea')
    await publishNote(page, 1, 'Beta idea')
    await publishNote(page, 0, 'Gamma idea')
    await expect(noteByText(bob.page, 'Beta idea')).toBeVisible()
    await noteByText(page, 'Beta idea').locator('.vote').click()
    await noteByText(bob.page, 'Beta idea').locator('.vote').click()
    await noteByText(bob.page, 'Alpha idea').locator('.vote').click()

    // Voting is still open: no list yet.
    await page.getByTestId('btn-actions').click()
    await expect(page.getByTestId('action-text')).toBeVisible()
    await expect(page.getByTestId('voted-ideas')).toHaveCount(0)
    await page.keyboard.press('Escape')

    await page.getByTestId('close-voting').click()
    await page.getByTestId('btn-actions').click()
    const rows = page.locator('[data-testid^="idea-"]:not([data-testid^="idea-create-"])')
    await expect(page.getByTestId('voted-ideas')).toBeVisible()
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('Beta idea')
    await expect(rows.nth(1)).toContainText('Alpha idea')
    await expect(rows.nth(2)).toContainText('Gamma idea')
    expect(await serious(page)).toEqual([])

    await page.getByTestId('voted-sort').selectOption('column')
    await expect(rows.nth(0)).toContainText('Alpha idea')
    await expect(rows.nth(2)).toContainText('Beta idea')
    await page.getByTestId('voted-sort').selectOption('author')
    await expect(rows.nth(0)).toContainText('Beta idea') // Alice, then Bob last
    await expect(rows.nth(2)).toContainText('Alpha idea')
    // The sort is remembered in this browser.
    await page.reload()
    await expect.poll(() => page.evaluate(() => {
      const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { status: string }> } } } } }).__vue_app__
      return app.config.globalProperties.$pinia._s.get('board')?.status
    })).toBe('open')
    await page.getByTestId('btn-actions').click()
    await expect(page.getByTestId('voted-sort')).toHaveValue('author')

    // Create an action from the Alpha row: text and author as owner, linked to the note.
    await page.getByTestId('voted-sort').selectOption('votes')
    await rows.nth(1).getByRole('button').click()
    await expect(page.getByTestId('action-text')).toHaveValue('Alpha idea')
    await expect(page.getByTestId('owner-input')).toHaveValue('Bob')
    await expect(page.getByTestId('action-source')).toContainText('Alpha idea')
    await page.getByTestId('action-add').click()
    await expect(rows.nth(1)).toContainText('1 action')
    await expect(noteByText(bob.page, 'Alpha idea').locator('[data-testid^="action-badge-"]')).toBeVisible()
    await bob.ctx.close()
  })

  test('hidden while a secret vote is open, shown after the reveal', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Secret one')
    await page.getByTestId('secret-toggle').click()
    await noteByText(page, 'Secret one').locator('.vote').click()
    await page.getByTestId('btn-actions').click()
    await expect(page.getByTestId('action-text')).toBeVisible()
    await expect(page.getByTestId('voted-ideas')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.getByTestId('close-voting').click()
    await page.getByTestId('btn-actions').click()
    await expect(page.getByTestId('voted-ideas')).toContainText('Secret one')
  })

  test('the owner dropdown starts with a fixed "Connected now" section', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareLink(page), 'Bob')
    const carol = await join(browser, page.url(), 'Carol')
    await expect(page.getByTestId('btn-participants')).toBeVisible()
    await page.getByTestId('btn-actions').click()
    await expect(page.getByTestId('owner-input')).toHaveValue('Alice')
    await page.getByTestId('owner-input').click()
    await expect(page.getByTestId('owner-section-present')).toHaveText('Connectés maintenant')
    const connected = page.getByTestId('owner-options').locator('[data-testid="owner-option-present"]')
    await expect(connected.filter({ hasText: 'Bob' })).toBeVisible()
    await expect(connected.filter({ hasText: 'Carol' })).toBeVisible()
    expect(await serious(page)).toEqual([])
    await connected.filter({ hasText: 'Carol' }).click()
    await expect(page.getByTestId('owner-input')).toHaveValue('Carol')
    await bob.ctx.close()
    await carol.ctx.close()
  })
})
