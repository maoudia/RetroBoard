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
