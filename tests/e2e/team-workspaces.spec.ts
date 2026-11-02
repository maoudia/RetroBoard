import { expect, test } from '@playwright/test'
import { closeShare, createBoard } from './helpers'

test('carry-over lists the open actions of the chosen team and project only', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', title: 'Sprint 7', name: 'Alice' })
  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-action-workflow').click()
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Fix Alpha build')
  await page.getByTestId('owner-input').fill('Ana')
  await page.getByTestId('action-add').click()
  await page.getByTestId('actions-save-team').click()
  await page.keyboard.press('Escape')
  await closeShare(page).catch(() => {})

  await page.goto('/new')
  // The board above was created under the default team: its action is offered for that team.
  await expect(page.getByTestId('carry-list')).toContainText('Fix Alpha build')
  await expect(page.getByTestId('carry-list')).toContainText('Sprint 7')
  // A new team starts clean, and so does another project.
  await page.getByTestId('team-select').selectOption('__new')
  await expect(page.getByTestId('carry-none')).toBeVisible()
  await page.getByTestId('team-select').selectOption({ index: 0 })
  await expect(page.getByTestId('carry-list')).toContainText('Fix Alpha build')
  await page.getByTestId('team-project').fill('Web')
  await expect(page.getByTestId('carry-none')).toBeVisible()
})
