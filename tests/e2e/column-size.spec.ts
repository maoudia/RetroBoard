import { expect, test } from '@playwright/test'
import { column, createBoard } from './helpers'

test.skip(({ isMobile }) => isMobile, 'column widths are a desktop control')

test('a column can be made wide, with Alt+arrows, and the size survives a reload', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const col = column(page, 0)
  const id = (await col.getAttribute('data-testid'))!.replace('column-', '')
  const normal = (await col.boundingBox())!.width
  await page.getByTestId(`col-size-${id}`).click()
  await page.getByTestId(`size-wide-${id}`).click()
  await expect(col).toHaveAttribute('data-size', 'wide')
  await expect(async () => expect((await col.boundingBox())!.width).toBeGreaterThan(normal)).toPass()

  await col.focus()
  await page.keyboard.press('Alt+ArrowLeft')
  await expect(col).toHaveAttribute('data-size', 'normal')
  await page.keyboard.press('Alt+ArrowLeft')
  await expect(col).toHaveAttribute('data-size', 'narrow')

  await page.reload()
  await expect(column(page, 0)).toHaveAttribute('data-size', 'narrow')
})
