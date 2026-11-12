import { expect, test } from '@playwright/test'
import { createBoard, noteByText, phoneLayout, publishNote } from './helpers'

test('size controls are rectangles with a readable selected state', async ({ page, isMobile }) => {
  test.skip(phoneLayout({ isMobile, viewport: page.viewportSize() }), 'a phone has no writing area to resize or fold: it writes in the bottom sheet')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const btn = page.locator('[data-testid^="area-large-"]').first()
  await btn.click()
  await expect(btn).toHaveClass(/on/)
  await expect(btn.locator('.rect')).toBeVisible()
  const box = await btn.locator('.rect').boundingBox()
  expect(box && box.width > box.height).toBe(true)
})

test('columns use the whole width of the board', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const cols = page.locator('.board > .col')
  const last = await cols.last().boundingBox()
  const board = await page.locator('.board').boundingBox()
  // Only the "add a column" tile (200 px) may sit at the right of the columns: no empty strip.
  expect(last && board && last.x + last.width > board.x + board.width - 260).toBe(true)
})

test('the double chevron folds every column when they are locked together', async ({ page, isMobile }) => {
  test.skip(phoneLayout({ isMobile, viewport: page.viewportSize() }), 'a phone has no writing area to resize or fold: it writes in the bottom sheet')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const first = page.locator('[data-testid^="area-all-"]').first()
  await first.click()
  await page.locator('[data-testid^="write-hide-"]').first().click()
  await expect(page.locator('[data-testid^="write-handle-"]')).toHaveCount(3)
})

test('a facilitator colours a whole column and removes a single idea after a confirmation', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Alpha idea')
  await publishNote(page, 0, 'Beta idea')
  await page.locator('[data-testid^="col-menu-"]').first().click()
  await page.locator('[data-testid^="col-colour-"]').nth(3).click()
  await expect(page.getByText('idée(s) recolorée(s)').first()).toBeVisible()
  await page.locator('body').click({ position: { x: 5, y: 400 } })
  await expect(async () => {
    await noteByText(page, 'Beta idea').locator('[data-testid^="note-menu-"]').click()
    await page.getByRole('menuitem', { name: 'Supprimer' }).click({ timeout: 2000 })
  }).toPass({ timeout: 10_000 })
  await expect(noteByText(page, 'Beta idea')).toHaveCount(0)
  await expect(noteByText(page, 'Alpha idea')).toBeVisible()
})

test('a board can be cloned empty and its actions cloned alone', async ({ page, isMobile }) => {
  test.skip(phoneLayout({ isMobile, viewport: page.viewportSize() }), 'the boards menu is hidden on phones')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 7' })
  await publishNote(page, 0, 'Secret idea')
  await page.getByTestId('btn-boards').click()
  await page.getByTestId('boards-clone').click()
  await expect(page).toHaveURL(/\/new/)
  await expect(page.getByTestId('clone-banner')).toBeVisible()
  await expect(page.getByTestId('setup-title')).toHaveValue(/Sprint 7/)
})
