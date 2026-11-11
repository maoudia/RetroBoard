import { expect, test } from '@playwright/test'
import { column, createBoard, enterName, noteByText, publishNote } from './helpers'

async function shareUrl(page: import('@playwright/test').Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

test('undo a publication within 10 seconds: gone for everyone, back in my drafts', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const ctx = await browser.newContext()
  const bob = await ctx.newPage()
  await bob.goto(await shareUrl(page))
  await enterName(bob, 'Bob')

  await publishNote(page, 1, 'Wrong column')
  await expect(noteByText(bob, 'Wrong column')).toBeVisible()
  await page.getByTestId('undo-publish').click()
  await expect(noteByText(page, 'Wrong column')).toHaveCount(0)
  await expect(noteByText(bob, 'Wrong column')).toHaveCount(0)
  await expect(column(page, 1).locator('[data-draft-id]')).toContainText('Wrong column')
  await ctx.close()
})

test('keyboard: Ctrl+Enter publishes, Shift+Enter adds a line, Escape clears', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const box = column(page, 0).locator('textarea')
  await box.fill('Straight')
  await box.press('Control+Enter')
  await expect(noteByText(page, 'Straight')).toBeVisible()
  await expect(column(page, 0).locator('[data-draft-id]')).toHaveCount(0)

  await box.fill('Line one')
  await box.press('Shift+Enter')
  await box.pressSequentially('line two')
  await expect(box).toHaveValue('Line one\nline two')
  await box.press('Escape')
  await expect(box).toHaveValue('')
})

test('leaving with unpublished drafts asks first', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mobile browsers do not show the beforeunload prompt')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await column(page, 0).locator('textarea').fill('Not published')
  await column(page, 0).locator('[data-testid^="compose-add-"]').click()
  const dialog = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.type()); void d.dismiss() }))
  // A user gesture is needed before browsers show the leave prompt.
  await page.getByTestId('board').click({ position: { x: 5, y: 5 } })
  await page.close({ runBeforeUnload: true })
  expect(await dialog).toBe('beforeunload')
})

test('the publish toast floats under the header, never over a writing area, on a phone (change toast-notifications-v2)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Floating')
  const toast = page.getByTestId('toasts').locator('.toast').first()
  await expect(toast).toBeVisible()
  const t = (await toast.boundingBox())!
  const bar = (await page.locator('.toolbar').boundingBox())!
  expect(t.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1)
  expect(t.x).toBeGreaterThanOrEqual(0)
  expect(t.x + t.width).toBeLessThanOrEqual(390)
  const write = (await page.getByTestId('compose-open').boundingBox())!
  expect(t.y + t.height).toBeLessThan(write.y)
  const action = (await page.getByTestId('undo-publish').boundingBox())!
  expect(action.height).toBeGreaterThanOrEqual(44)
  await toast.hover()
  await page.waitForTimeout(500)
  await expect(toast).toBeVisible()
  await toast.getByRole('button', { name: /Fermer|Dismiss/ }).click()
  await expect(toast).toHaveCount(0)
})

test('on a phone the field keeps focus after Add; Publish sends the whole stack of the column and closes the keyboard (change toast-notifications-v2)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('compose-open').click()
  const sheet = page.getByTestId('compose-sheet')
  const field = sheet.locator('textarea')
  await expect(field).toBeFocused()
  await field.fill('First')
  await sheet.locator('[data-testid^="compose-add-"]').click()
  await expect(field).toBeFocused()
  await field.fill('Second')
  await sheet.locator('[data-testid^="compose-add-"]').click()
  await expect(field).toBeFocused()
  await field.fill('Third')
  await sheet.locator('[data-testid^="compose-publish-"]').click()
  for (const t of ['First', 'Second', 'Third']) await expect(noteByText(page, t)).toBeVisible()
  await expect(sheet).toHaveCount(0) // the sheet closes with the keyboard
})
