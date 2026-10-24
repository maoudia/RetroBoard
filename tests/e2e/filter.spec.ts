import { expect, test } from '@playwright/test'
import { column, createBoard, join, noteByText, publishNote } from './helpers'

test('my filter hides notes on my screen only: text, colour, votes; "/" opens it', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Déploiement lent')
  await publishNote(page, 1, 'Pairing hebdo')
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, link, 'Bob')

  await page.locator('body').press('/')
  await page.getByTestId('filter-text').fill('deploiement')
  await expect(noteByText(page, 'Déploiement lent')).toBeVisible()
  await expect(noteByText(page, 'Pairing hebdo')).toHaveCount(0)
  await expect(page.getByTestId('filter-count')).toHaveText('1 / 2 idées')
  // Bob's board is not affected.
  await expect(noteByText(bob.page, 'Pairing hebdo')).toBeVisible()

  await page.getByTestId('filter-text').fill('')
  await page.getByTestId('filter-voted').check()
  await expect(page.locator('article.note')).toHaveCount(0)
  await page.getByTestId('filter-close').click()
  await expect(page.locator('article.note')).toHaveCount(2)
  await bob.ctx.close()
})

test('writing an idea that is already on the board shows a hint to the existing one', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Slow CI')
  await column(page, 0).locator('textarea').fill('The CI is slow')
  const hint = column(page, 0).locator('[data-testid^="similar-"]')
  await expect(hint).toContainText('Slow CI')
  await hint.getByRole('button').click()
  await expect(noteByText(page, 'Slow CI')).toHaveClass(/flash/)
  await column(page, 0).locator('textarea').fill('Something else entirely')
  await expect(hint).toHaveCount(0)
})
