import { expect, test } from '@playwright/test'
import { column, createBoard, join } from './helpers'

test.skip(({ isMobile }) => isMobile, 'facilitator menus are covered on desktop')

test('the facilitator opens one column at a time; the others are masked for everyone (change ux-irritants-wave-3)', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, url, 'Bob')
  const ids = await Promise.all([0, 1, 2].map(async (i) => (await column(page, i).getAttribute('data-testid'))!.replace('column-', '')))

  await page.getByTestId(`col-menu-${ids[0]}`).click()
  await page.getByTestId(`col-turn-${ids[0]}`).click()
  await expect(page.getByTestId('turn-bar')).toBeVisible()
  await expect(bob.page.getByTestId('turn-bar')).toBeVisible()
  await expect(bob.page.getByTestId('turn-prev')).toHaveCount(0)
  for (const p of [page, bob.page]) {
    await expect(p.getByTestId(`column-${ids[0]}`)).toHaveAttribute('data-turn', 'on')
    await expect(p.getByTestId(`column-${ids[1]}`)).toHaveAttribute('data-turn', 'off')
    await expect(p.getByTestId(`draft-${ids[0]}`)).toBeEnabled()
    await expect(p.getByTestId(`draft-${ids[1]}`)).toBeDisabled()
  }
  // The open column is wider than a masked one.
  await expect(async () => expect((await column(page, 0).boundingBox())!.width).toBeGreaterThan((await column(page, 1).boundingBox())!.width + 20)).toPass()

  await page.getByTestId('turn-next').click()
  await expect(bob.page.getByTestId(`column-${ids[1]}`)).toHaveAttribute('data-turn', 'on')
  await expect(bob.page.getByTestId(`draft-${ids[1]}`)).toBeEnabled()
  await expect(bob.page.getByTestId(`draft-${ids[0]}`)).toBeDisabled()

  await page.getByTestId('turn-stop').click()
  await expect(bob.page.getByTestId('turn-bar')).toHaveCount(0)
  await expect(bob.page.getByTestId(`draft-${ids[0]}`)).toBeEnabled()
  await bob.ctx.close()
})
