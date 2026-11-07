import { expect, test } from '@playwright/test'
import { createBoard, noteByText, publishNote, settle } from './helpers'

test.use({ viewport: { width: 360, height: 740 } })

test('publishing three ideas in a row shows one toast with one Undo for all of them (change stabilise-main)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  for (const w of ['First idea', 'Second idea', 'Third idea']) await publishNote(page, 0, w)
  const toasts = page.getByTestId('toasts').locator('.toast')
  await expect(toasts).toHaveCount(1)
  await expect(toasts.first()).toContainText('3')
  // The toast sits under the toolbar and takes little of a 360 px screen.
  const box = (await toasts.first().boundingBox())!
  expect(box.height).toBeLessThan(120)
  await page.getByTestId('undo-publish').click()
  for (const w of ['First idea', 'Second idea', 'Third idea']) await expect(noteByText(page, w)).toHaveCount(0)
})

test('a group card fills its cell so its vote and count stay on the card on a phone (change stabilise-main)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await createBoard(page, { template: 'start-stop-continue' })
  await publishNote(page, 0, 'Slow tests in CI')
  await publishNote(page, 0, 'The tests are slow and flaky on the shared runner')
  await noteByText(page, 'The tests are slow').dragTo(noteByText(page, 'Slow tests in CI'))
  const cluster = page.locator('.cluster').first()
  await expect(cluster).toBeVisible()
  await settle(page) // measure the settled layout, not a card still growing into its cell
  const c = (await cluster.boundingBox())!
  const s = (await cluster.locator('.stack').boundingBox())!
  const d = (await cluster.locator('.dock').boundingBox())!
  // The cluster has a border and a shadow ring: a few pixels, never a card narrower than its cell.
  expect(Math.abs(s.width - c.width)).toBeLessThanOrEqual(4)
  expect(d.x + d.width).toBeLessThanOrEqual(s.x + s.width + 2)
})
