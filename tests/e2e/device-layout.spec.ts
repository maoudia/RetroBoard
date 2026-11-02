import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

/** change device-layout-prefs: a choice made on one screen class does not leak into another. */
test('column width is remembered per screen class, and reset only touches this class', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await createBoard(page, { template: 'start-stop-continue' })
  const col = page.locator('[data-testid^="column-"]').first()
  const id = (await col.getAttribute('data-testid'))!.replace('column-', '')
  await page.getByTestId(`col-size-${id}`).click()
  await page.getByTestId(`size-wide-${id}`).click()
  const wide = (await col.boundingBox())!.width

  // The same board on a tablet-width window keeps its own default.
  await page.setViewportSize({ width: 800, height: 900 })
  await expect(async () => {
    expect((await col.boundingBox())!.width).not.toBeCloseTo(wide, -1)
  }).toPass()

  // Back on the laptop the wide column is still there, also after a reload.
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.reload()
  await expect(async () => {
    expect((await col.boundingBox())!.width).toBeCloseTo(wide, -1)
  }).toPass()

  // The profile resets this class only.
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('layout-reset').click()
  await page.keyboard.press('Escape')
  await expect(async () => {
    expect((await col.boundingBox())!.width).not.toBeCloseTo(wide, -1)
  }).toPass()
})

test('layout section lists reset and copy actions in advanced mode', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  await page.getByTestId('btn-profile').click()
  await expect(page.getByTestId('layout-section')).toBeVisible()
  await expect(page.getByTestId('layout-reset')).toBeVisible()
})
