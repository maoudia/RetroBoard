import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { closeShare, column, createBoard, enterName, join, noteByText, publishNote } from './helpers'

test.skip(({ isMobile }) => isMobile, 'column settings are covered on desktop')

test('Start and Stop take votes, Continue does not; the facilitator can switch a column on', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  await publishNote(page, 0, 'Try pairing')
  await publishNote(page, 2, 'Keep the demo')
  await expect(noteByText(page, 'Try pairing').locator('[data-testid^="vote-"]').first()).toBeVisible()
  await expect(noteByText(page, 'Keep the demo').locator('[data-testid^="vote-"]')).toHaveCount(0)

  const bob = await join(browser, url, 'Bob')
  await expect(noteByText(bob.page, 'Keep the demo').locator('[data-testid^="vote-"]')).toHaveCount(0)

  // Switch Continue on: both see the vote control.
  await column(page, 2).locator('[data-testid^="col-menu-"]').click()
  await page.getByTestId('col-rename').click()
  await expect(page.getByTestId('col-votable')).not.toBeChecked()
  const axe = await new AxeBuilder({ page }).include('[data-testid="col-votable"]').analyze()
  expect(axe.violations).toEqual([])
  await page.getByTestId('col-votable').check()
  await page.getByTestId('col-save').click()
  await expect(noteByText(page, 'Keep the demo').locator('[data-testid^="vote-"]').first()).toBeVisible()
  await expect(noteByText(bob.page, 'Keep the demo').locator('[data-testid^="vote-"]').first()).toBeVisible()
  await bob.ctx.close()
})

test('the creation form lists the columns where people vote and a change is applied to the new board', async ({ page }) => {
  await page.goto('/new')
  await page.getByTestId('theme-studio').click()
  await page.getByTestId('tab-all').click()
  await page.getByTestId('template-start-stop-continue').click()
  await page.getByTestId('setup-votable').locator('summary').click()
  await expect(page.getByTestId('setup-votable-0')).toBeChecked()
  await expect(page.getByTestId('setup-votable-2')).not.toBeChecked()
  await page.getByTestId('setup-votable-0').uncheck()
  await page.getByTestId('setup-votable-2').check()
  await page.getByTestId('setup-submit').click()
  await enterName(page, 'Alice')
  await expect(page.getByTestId('board')).toBeVisible()
  await closeShare(page)
  await publishNote(page, 0, 'Start idea')
  await publishNote(page, 2, 'Continue idea')
  await expect(noteByText(page, 'Start idea').locator('[data-testid^="vote-"]')).toHaveCount(0)
  await expect(noteByText(page, 'Continue idea').locator('[data-testid^="vote-"]').first()).toBeVisible()
})
