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

test('leaving with unpublished drafts asks first', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await column(page, 0).locator('textarea').fill('Not published')
  await column(page, 0).locator('textarea').press('Enter')
  const dialog = new Promise<string>((resolve) => page.once('dialog', (d) => { resolve(d.type()); void d.dismiss() }))
  // A user gesture is needed before browsers show the leave prompt.
  await page.getByTestId('board').click({ position: { x: 5, y: 5 } })
  await page.close({ runBeforeUnload: true })
  expect(await dialog).toBe('beforeunload')
})
