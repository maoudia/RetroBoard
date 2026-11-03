import { expect, test } from '@playwright/test'
import { column, createBoard } from './helpers'

test('the writing area folds to a Write handle and comes back, with the W key too (change board-layout-v2)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const id = (await column(page, 0).getAttribute('data-testid'))!.replace('column-', '')
  await expect(page.getByTestId(`draft-${id}`)).toBeVisible()
  await page.getByTestId('btn-writing').click()
  await expect(page.getByTestId(`draft-${id}`)).toBeHidden()
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

test('the writing field grows by dragging its grip, with the keyboard, and a preset gives the standard height back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mouse drag on desktop; touch uses the same pointer events')
  await createBoard(page, { template: 'start-stop-continue' })
  const id = (await column(page, 0).getAttribute('data-testid'))!.replace('column-', '')
  const field = page.getByTestId(`draft-${id}`)
  const h0 = (await field.boundingBox())!.height
  const grip = (await page.getByTestId(`grow-grip-${id}`).boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + grip.width / 2, grip.y + 90, { steps: 6 })
  await page.mouse.up()
  await expect(async () => expect((await field.boundingBox())!.height).toBeGreaterThan(h0 + 50)).toPass()
  const h1 = (await field.boundingBox())!.height
  await page.getByTestId(`grow-grip-${id}`).focus()
  await page.keyboard.press('ArrowUp')
  await expect(async () => expect((await field.boundingBox())!.height).toBeLessThan(h1)).toPass()
  await page.reload()
  await expect(async () => expect((await page.getByTestId(`draft-${id}`).boundingBox())!.height).toBeGreaterThan(h0 + 20)).toPass()
  await page.getByTestId(`area-menu-${id}`).click()
  await page.getByTestId(`area-normal-${id}`).click()
  await expect(async () => expect(Math.abs((await field.boundingBox())!.height - h0)).toBeLessThan(4)).toPass()
})

test('one column can fold its own writing area with a slide, the others keep theirs (change ux-irritants-wave-2)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const a = (await column(page, 0).getAttribute('data-testid'))!.replace('column-', '')
  const b = (await column(page, 1).getAttribute('data-testid'))!.replace('column-', '')
  const before = (await column(page, 0).locator('.notes').boundingBox())!.height
  await page.getByTestId(`write-hide-${a}`).click()
  await expect(page.getByTestId(`draft-${a}`)).toBeHidden()
  await expect(page.getByTestId(`write-handle-${a}`)).toBeVisible()
  await expect(page.getByTestId(`draft-${b}`)).toBeVisible()
  await expect(page.getByTestId(`write-handle-${b}`)).toHaveCount(0)
  await expect(async () => expect((await column(page, 0).locator('.notes').boundingBox())!.height).toBeGreaterThan(before + 40)).toPass()
  await page.reload()
  await expect(page.getByTestId(`write-handle-${a}`)).toBeVisible()
  await page.getByTestId(`write-handle-${a}`).click()
  await expect(page.getByTestId(`draft-${a}`)).toBeVisible()
})

test('the toolbar writing switch folds and unfolds every column, even ones folded on their own (change ux-irritants-wave-3)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const a = (await column(page, 0).getAttribute('data-testid'))!.replace('column-', '')
  const b = (await column(page, 1).getAttribute('data-testid'))!.replace('column-', '')
  await page.getByTestId(`write-hide-${a}`).click()
  await page.getByTestId('btn-writing').click()
  await expect(page.getByTestId(`draft-${a}`)).toBeHidden()
  await expect(page.getByTestId(`draft-${b}`)).toBeHidden()
  await page.getByTestId('btn-writing').click()
  await expect(page.getByTestId(`draft-${a}`)).toBeVisible()
  await expect(page.getByTestId(`draft-${b}`)).toBeVisible()
})

test('no edge drag handle on a phone: a swipe there must not resize a column (change toast-notifications-v2)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await createBoard(page, { template: 'start-stop-continue' })
  const id = (await column(page, 0).getAttribute('data-testid'))!.replace('column-', '')
  await expect(page.getByTestId(`col-grip-${id}`)).toBeHidden()
})
