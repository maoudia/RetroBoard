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
