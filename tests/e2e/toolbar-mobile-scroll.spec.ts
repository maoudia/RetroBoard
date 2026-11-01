import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test('on a phone the toolbar tools slide sideways on one row and leave the columns their space', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const toolbar = page.locator('header.toolbar')
  const tools = page.locator('nav.tools')
  // Two rows at most: brand and clock, then the tools.
  const h = (await toolbar.boundingBox())!.height
  expect(h).toBeLessThanOrEqual(150)
  const m = await tools.evaluate((el) => ({ wrap: getComputedStyle(el).flexWrap, ox: getComputedStyle(el).overflowX, sw: el.scrollWidth, cw: el.clientWidth, h: el.getBoundingClientRect().height }))
  expect(m.wrap).toBe('nowrap')
  expect(m.ox).toBe('auto')
  expect(m.sw).toBeGreaterThan(m.cw)
  expect(m.h).toBeLessThanOrEqual(64)

  // A tool far to the right is reachable: focusing it scrolls the row.
  await page.getByTestId('btn-options').focus()
  await expect.poll(() => tools.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  const r = (await page.getByTestId('btn-options').boundingBox())!
  expect(r.x + r.width).toBeLessThanOrEqual(360)

  // A menu opened from the scrolled row is not clipped by it.
  await page.getByTestId('btn-actions').click()
  await expect(page.getByTestId('actions-drawer').or(page.getByRole('dialog')).first()).toBeVisible()
  await page.keyboard.press('Escape')

  const axe = await new AxeBuilder({ page }).include('header.toolbar').analyze()
  expect(axe.violations).toEqual([])
})
