import { expect, test } from '@playwright/test'
import { createBoard, publishNote } from './helpers'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('scrolling a column on a phone folds the menus away and gives the board room (change mobile-board-space)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  for (const w of ['Deploys take far too long on Fridays and nobody knows why they stall at the last step', 'Flaky login test again, it fails one run in five on the shared runner', 'Great pairing with the new joiner, we should keep doing it every sprint', 'Coffee machine broken all week, please someone call the supplier today', 'Standups drift into design talk and run over by a quarter of an hour']) await publishNote(page, 0, w)
  const board = page.getByTestId('board')
  const before = (await board.boundingBox())!.height
  const notes = page.locator('.notes').first()
  expect(await notes.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
  await notes.hover()
  await notes.evaluate((el) => el.scrollBy(0, 400)) // mouse.wheel is not supported in mobile WebKit
  await expect(page.locator('nav.tools')).toBeHidden()
  await expect(page.getByTestId('votebar')).toBeHidden()
  const after = (await board.boundingBox())!.height
  expect(after).toBeGreaterThan(before * 1.2)
  // Scrolling back up, or the button, brings them back.
  await page.getByTestId('chrome-show').click()
  await expect(page.locator('nav.tools')).toBeVisible()
})

test('a phone shows one column per screen; the tab bar follows the swipe and jumps to a column (change mobile-board-space)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const cols = page.locator('.board > .col')
  const board = page.getByTestId('board')
  const bw = (await board.boundingBox())!.width
  expect((await cols.first().boundingBox())!.width).toBeGreaterThan(bw * 0.85)
  // The next column peeks out on the right: that is the hint that there is more.
  expect((await cols.nth(1).boundingBox())!.x).toBeLessThan(bw)
  await expect(page.getByTestId('col-tab-0')).toHaveAttribute('aria-current', 'true')
  await page.getByTestId('col-tab-1').click()
  await expect(page.getByTestId('col-tab-1')).toHaveAttribute('aria-current', 'true')
  await expect.poll(async () => (await cols.nth(1).boundingBox())!.x).toBeLessThan(bw * 0.2)
  // The tabs are thumb-sized targets at the foot of the screen (change responsive-and-i18n-hardening).
  expect((await page.getByTestId('col-tab-1').boundingBox())!.height).toBeGreaterThanOrEqual(48)
})

test('the voting bar is one compact row with the votes left as a pill on a phone (change mobile-board-space)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const bar = page.getByTestId('votebar')
  expect((await bar.boundingBox())!.height).toBeLessThan(56)
  const pill = page.locator('.votebar .mid')
  const first = (await pill.boundingBox())!
  const left = (await page.locator('.votebar .state').boundingBox())!
  expect(first.x).toBeLessThan(left.x)
  await expect(page.getByTestId('votes-left')).toBeVisible()
})

test('on a phone the column width menu works and the tab bar sits below the board (changes ux-irritants-wave-2 and responsive-and-i18n-hardening)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const col = page.locator('.board > .col').first()
  const id = (await col.getAttribute('data-testid'))!.replace('column-', '')
  const bw = (await page.getByTestId('board').boundingBox())!.width
  const normal = (await col.boundingBox())!.width
  await page.getByTestId(`col-size-${id}`).click()
  await page.getByTestId(`size-narrow-${id}`).click()
  await expect(async () => expect((await col.boundingBox())!.width).toBeLessThan(normal - 20)).toPass()
  expect((await col.boundingBox())!.width).toBeLessThan(bw * 0.8)
  await page.getByTestId(`col-size-${id}`).click()
  await page.getByTestId(`size-full-${id}`).click()
  await expect(async () => expect((await col.boundingBox())!.width).toBeGreaterThan(bw * 0.95)).toPass()

  // The tab bar has one tab per column and sits below the board, in the thumb zone.
  const tabs = page.getByTestId('col-tabs')
  await expect(tabs.locator('.tab')).toHaveCount(3)
  expect((await tabs.boundingBox())!.y).toBeGreaterThan((await page.getByTestId('board').boundingBox())!.y)
})
