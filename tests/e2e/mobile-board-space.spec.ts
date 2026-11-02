import { expect, test } from '@playwright/test'
import { createBoard, publishNote } from './helpers'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('scrolling a column on a phone folds the menus away and gives the board room (change mobile-board-space)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  for (const w of ['Deploys take too long on Fridays', 'Flaky login test again', 'Great pairing with the new joiner', 'Coffee machine broken all week']) await publishNote(page, 0, w)
  const board = page.getByTestId('board')
  const before = (await board.boundingBox())!.height
  const notes = page.locator('.notes').first()
  expect(await notes.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
  await notes.hover()
  await page.mouse.wheel(0, 400)
  await expect(page.locator('nav.tools')).toBeHidden()
  await expect(page.getByTestId('votebar')).toBeHidden()
  const after = (await board.boundingBox())!.height
  expect(after).toBeGreaterThan(before * 1.2)
  // Scrolling back up, or the button, brings them back.
  await page.getByTestId('chrome-show').click()
  await expect(page.locator('nav.tools')).toBeVisible()
})
