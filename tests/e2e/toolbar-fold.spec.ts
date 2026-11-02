import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test('the chevron slides the menus away and back on any screen, and stays in place (change ux-irritants-wave-2)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const tools = page.locator('nav.tools')
  await expect(tools).toBeVisible()
  const toggle = page.getByTestId('chrome-hide')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const x = (await toggle.boundingBox())!.x
  await toggle.click()
  await expect(tools).toBeHidden()
  await expect(page.getByTestId('votebar')).toBeHidden()
  const shown = page.getByTestId('chrome-show')
  await expect(shown).toHaveAttribute('aria-expanded', 'false')
  expect(Math.abs((await shown.boundingBox())!.x - x)).toBeLessThan(2)
  const found = (await new AxeBuilder({ page }).include('header.toolbar').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)
  expect(found).toEqual([])
  await shown.click()
  await expect(tools).toBeVisible()
  await expect(page.getByTestId('votebar')).toBeVisible()
})

test('options dialog on a phone: destroy keeps its text in the box, scales are one segmented control, the mode switch is centred (change ux-irritants-wave-2)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-options').click()
  const dialog = page.getByRole('dialog')
  const scale = dialog.locator('.scale').first()
  await expect(scale.locator('svg')).toHaveCount(3)
  const destroy = dialog.getByTestId('opt-destroy')
  await destroy.scrollIntoViewIfNeeded()
  const fits = await destroy.evaluate((b) => b.scrollWidth <= b.clientWidth + 1)
  expect(fits).toBe(true)
  const mode = dialog.getByTestId('mode-switch')
  await mode.scrollIntoViewIfNeeded()
  const mb = (await mode.boundingBox())!
  const db = (await dialog.boundingBox())!
  expect(mb.width).toBeLessThan(db.width * 0.8)
  expect(Math.abs(mb.x + mb.width / 2 - (db.x + db.width / 2))).toBeLessThan(6)
})
