import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard, join } from './helpers'

test('a facilitator hides a column for everyone and shows it again', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'two-context flow, covered on desktop')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, link, 'Bob')

  const cols = (p: typeof page) => p.locator('section[data-testid^="column-"]')
  await expect(cols(page)).toHaveCount(3)
  await expect(cols(bob.page)).toHaveCount(3)
  const firstId = (await cols(page).first().getAttribute('data-testid'))!.replace('column-', '')

  // A participant has no Hide entry.
  await bob.page.getByTestId(`col-menu-${firstId}`).click()
  await expect(bob.page.getByTestId(`col-hide-${firstId}`)).toHaveCount(0)
  await bob.page.keyboard.press('Escape')

  await page.getByTestId(`col-menu-${firstId}`).click()
  await page.getByTestId(`col-hide-${firstId}`).click()
  await expect(cols(page)).toHaveCount(2)
  await expect(cols(bob.page)).toHaveCount(2)
  await expect(bob.page.getByTestId('hidden-columns-chip')).toBeVisible()
  await expect(page.getByTestId('hidden-columns-chip')).toContainText('1')
  const axe = await new AxeBuilder({ page: bob.page }).include('[data-testid="hidden-columns"]').analyze()
  expect(axe.violations).toEqual([])

  // Bob can only read the list; Alice brings the column back.
  await bob.page.getByTestId('hidden-columns-chip').click()
  await expect(bob.page.getByTestId(`show-col-${firstId}`)).toHaveCount(0)
  await bob.page.keyboard.press('Escape')
  await page.getByTestId('hidden-columns-chip').click()
  await page.getByTestId(`show-col-${firstId}`).click()
  await expect(cols(page)).toHaveCount(3)
  await expect(cols(bob.page)).toHaveCount(3)
  await expect(page.getByTestId('hidden-columns')).toHaveCount(0)
  await bob.ctx.close()
})

test('the last visible column cannot be hidden', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const ids = (await page.locator('section[data-testid^="column-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('column-', ''))))
  for (const id of ids.slice(0, 2)) {
    await page.getByTestId(`col-menu-${id}`).click()
    await page.getByTestId(`col-hide-${id}`).click()
  }
  await page.getByTestId(`col-menu-${ids[2]}`).click()
  await expect(page.getByTestId(`col-hide-${ids[2]}`)).toBeDisabled()
})
