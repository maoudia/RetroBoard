import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

const bg = (loc: ReturnType<typeof noteByText>) => loc.evaluate((el) => getComputedStyle(el).backgroundColor)

test('a column default colour is used by drafts and published notes, for everyone', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const { page: bob } = await join(browser, page.url(), 'Bob')

  // Column 1 gets the blue slot (index 3).
  await page.locator('[data-testid^="col-menu-"]').first().click()
  await page.getByTestId('col-rename').click()
  await page.getByTestId('col-color-3').click()
  await page.getByTestId('col-save').click()

  await publishNote(page, 0, 'En bleu')
  await publishNote(page, 1, 'Autre colonne')
  await expect(noteByText(bob, 'En bleu')).toBeVisible()
  const blue = await bg(noteByText(page, 'En bleu'))
  expect(await bg(noteByText(bob, 'En bleu'))).toBe(blue)
  expect(await bg(noteByText(page, 'Autre colonne'))).not.toBe(blue)
})

test('recolour a note from the hover swatches and from the palette sheet, with the keyboard too', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const { page: bob } = await join(browser, page.url(), 'Bob')
  await publishNote(page, 0, 'Recolorable')
  const note = noteByText(page, 'Recolorable')
  const id = (await note.getAttribute('data-testid'))!.replace('note-', '')
  const before = await bg(note)

  await note.hover()
  await page.getByTestId(`quick-color-${id}-3`).click()
  await expect.poll(() => bg(note)).not.toBe(before)
  const blue = await bg(note)
  await expect.poll(() => bg(noteByText(bob, 'Recolorable'))).toBe(blue)

  await note.hover()
  await page.getByTestId(`quick-palette-${id}`).click()
  await expect(page.getByTestId('palette')).toBeVisible()
  await expect(page.getByTestId('palette-3')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('palette')).toHaveCount(0)
  await expect.poll(() => bg(note)).not.toBe(blue)
  await expect.poll(() => bg(noteByText(bob, 'Recolorable'))).toBe(await bg(note))
})

test.describe('phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })
  test('the note menu opens the palette sheet; hover swatches are not shown', async ({ page }) => {
    await createBoard(page)
    await publishNote(page, 0, 'Sur mobile')
    const note = noteByText(page, 'Sur mobile')
    const id = (await note.getAttribute('data-testid'))!.replace('note-', '')
    await expect(page.getByTestId(`quick-${id}`)).toBeHidden()
    const before = await bg(note)
    await page.getByTestId(`note-menu-${id}`).tap()
    await page.getByTestId(`palette-open-${id}`).tap()
    await page.getByTestId('palette-4').tap()
    await expect.poll(() => bg(note)).not.toBe(before)
  })
})
