import { expect, test } from '@playwright/test'
import { column, createBoard, noteByText, phoneLayout, publishNote, settle } from './helpers'

/** Change column-defaults-and-collapse (groups 1 and 2): the all-columns link is on by default, the collapse buttons are off by default. */
const idOf = async (page: import('@playwright/test').Page, i: number) => (await column(page, i).getAttribute('data-testid'))!.replace('column-', '')

test('a column size picked in one column applies to all while linked, and to one when unlinked, after a reload too', async ({ page }) => {
  test.skip(phoneLayout({ isMobile: false, viewport: page.viewportSize() }), 'column widths are a desktop control')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const a = await idOf(page, 0)
  await page.getByTestId(`col-size-${a}`).click()
  await page.getByTestId(`size-wide-${a}`).click()
  for (const i of [0, 1, 2]) await expect(column(page, i)).toHaveAttribute('data-size', 'wide')
  await page.reload()
  for (const i of [0, 1, 2]) await expect(column(page, i)).toHaveAttribute('data-size', 'wide')
  // Unlinked from the writing-area row: the next choice is per column.
  await page.getByTestId(`area-all-${a}`).click()
  await expect(page.getByTestId(`area-all-${a}`)).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId(`col-size-${a}`).click()
  await page.getByTestId(`size-narrow-${a}`).click()
  await expect(column(page, 0)).toHaveAttribute('data-size', 'narrow')
  await expect(column(page, 1)).toHaveAttribute('data-size', 'wide')
  await page.reload()
  await expect(column(page, 0)).toHaveAttribute('data-size', 'narrow')
  await expect(column(page, 1)).toHaveAttribute('data-size', 'wide')
})

test('the collapse button is absent by default, appears when switched on, and spreads while linked', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  for (const [col, texts] of [[0, ['A1', 'A2']], [1, ['B1', 'B2']]] as const) {
    for (const t of texts) await publishNote(page, col, t)
    await noteByText(page, texts[1]).dragTo(noteByText(page, texts[0]))
    await settle(page)
  }
  await expect(page.locator('[data-testid^="expand-"]')).toHaveCount(0)
  await page.evaluate(() => localStorage.setItem('retroboard:settings', JSON.stringify({ collapseButtons: true })))
  await page.reload()
  await expect(page.locator('[data-testid^="expand-"]')).toHaveCount(2)
  await column(page, 0).locator('[data-testid^="expand-"]').click()
  for (const i of [0, 1]) await expect(column(page, i).locator('[data-testid^="cluster-inline-"]')).toHaveCount(1)
  await column(page, 0).locator('[data-testid^="expand-"]').click()
  for (const i of [0, 1]) await expect(column(page, i).locator('[data-testid^="cluster-inline-"]')).toHaveCount(0)
})
