import { expect, test } from '@playwright/test'
import { column, createBoard } from './helpers'

test('the writing area folds to a Write handle and comes back, with the W key too (change board-layout-v2)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const id = (await column(page, 0).getAttribute('data-testid'))!.replace('column-', '')
  await expect(page.getByTestId(`draft-${id}`)).toBeVisible()
  await page.getByTestId('btn-writing').click()
  await expect(page.getByTestId(`draft-${id}`)).toHaveCount(0)
  await expect(page.getByTestId(`write-handle-${id}`)).toBeVisible()
  await page.getByTestId(`write-handle-${id}`).click()
  await expect(page.getByTestId(`draft-${id}`)).toBeVisible()
  // Keyboard, and the choice survives a reload.
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('w')
  await expect(page.getByTestId(`write-handle-${id}`)).toBeVisible()
  await page.reload()
  await expect(page.getByTestId(`write-handle-${id}`)).toBeVisible()
})

test('a column is widened by dragging its edge, and a preset gives the standard width back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mouse drag on desktop; touch uses the same pointer events')
  await createBoard(page, { template: 'start-stop-continue' })
  const col = column(page, 0)
  const id = (await col.getAttribute('data-testid'))!.replace('column-', '')
  const w0 = (await col.boundingBox())!.width
  const grip = (await page.getByTestId(`col-grip-${id}`).boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + 180, grip.y + grip.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect(col).toHaveAttribute('data-size', 'custom')
  await expect(async () => expect((await col.boundingBox())!.width).toBeGreaterThan(w0 + 120)).toPass()
  // Keyboard on the grip, then a preset resets it.
  await page.getByTestId(`col-grip-${id}`).focus()
  await page.keyboard.press('ArrowLeft')
  await page.getByTestId(`col-size-${id}`).click()
  await page.getByTestId(`size-normal-${id}`).click()
  await expect(col).toHaveAttribute('data-size', 'normal')
})
