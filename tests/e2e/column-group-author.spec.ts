import { expect, test } from '@playwright/test'
import { column, createBoard, publishNote } from './helpers'

test.skip(({ isMobile }) => isMobile, 'facilitator column menus are covered on desktop')

test('group by author previews, clusters each named author, and can be undone', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await publishNote(page, 0, 'First idea')
  await publishNote(page, 0, 'Second idea')
  const col = column(page, 0)
  const id = (await col.getAttribute('data-testid'))!.replace('column-', '')
  await expect(col.locator('article.note')).toHaveCount(2)

  await page.getByTestId(`col-menu-${id}`).click()
  await page.getByTestId(`col-group-author-${id}`).click()
  await expect(page.getByRole('dialog')).toContainText('Alice (2)')
  await page.getByTestId('confirm').click()
  await expect(col.locator('[data-testid^="group-"]')).toHaveCount(1)
  await expect(col.locator('article.note')).toHaveCount(0)

  await page.getByTestId(`col-menu-${id}`).click()
  await page.getByTestId(`col-group-undo-${id}`).click()
  await expect(col.locator('article.note')).toHaveCount(2)
})

test('group similar ideas previews the sets and stacks look-alike ideas', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await publishNote(page, 0, 'Daily meeting is too long')
  await publishNote(page, 0, 'daily meeting too long and boring')
  await publishNote(page, 0, 'Better coffee')
  const col = column(page, 0)
  const id = (await col.getAttribute('data-testid'))!.replace('column-', '')
  await expect(col.locator('article.note')).toHaveCount(3)
  await page.getByTestId(`col-menu-${id}`).click()
  await page.getByTestId(`col-group-similar-${id}`).click()
  await expect(page.getByRole('dialog')).toContainText('Daily meeting is too long (2)')
  await page.getByTestId('confirm').click()
  await expect(col.locator('[data-testid^="group-"]')).toHaveCount(1)
  await expect(col.locator('article.note')).toHaveCount(1)
})
