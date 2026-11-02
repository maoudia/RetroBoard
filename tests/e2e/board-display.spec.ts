import { expect, type Page, test } from '@playwright/test'
import { createBoard, join, publishNote } from './helpers'

const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}

test('the facilitator sets the post-it and text size, everyone sees the same board (change board-layout-v2)', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', oneFacilitator: true })
  await publishNote(page, 0, 'Big on the wall')
  const note = page.locator('.grid > *').first()
  const tracks = () => page.locator('.grid').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  expect(await tracks()).toBe(1)
  const fs0 = await note.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-noteSize-small').click()
  await expect(async () => expect(await tracks()).toBeGreaterThan(1)).toPass()
  await page.getByTestId('opt-noteSize-large').click()
  await page.getByTestId('opt-noteText-large').click()
  await page.keyboard.press('Escape')
  await expect(async () => {
    expect(await tracks()).toBe(1)
    expect(await note.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(fs0 * 1.1)
  }).toPass()

  // A second participant sees the same display and cannot change it.
  const { page: bob, ctx } = await join(browser, await shareLink(page), 'Bob')
  await expect(async () => expect(await bob.locator('.grid').first().getAttribute('data-note-size')).toBe('large')).toPass()
  await bob.getByTestId('btn-options').click()
  await expect(bob.getByTestId('opt-noteSize-small')).toBeDisabled()
  await ctx.close()
})

test('a TV screen scales the board display up so the room reads it (change board-layout-v2)', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 })
  await createBoard(page, { template: 'start-stop-continue' })
  await publishNote(page, 0, 'Readable from the back of the room')
  const fs = await page.locator('.grid').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const base = await page.locator('body').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(fs).toBeGreaterThan(base * 1.3)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(async () => expect(await page.locator('.grid').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(base * 1.1)).toPass()
})
