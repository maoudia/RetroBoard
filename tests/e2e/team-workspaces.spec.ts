import { expect, test } from '@playwright/test'
import { closeShare, createBoard } from './helpers'

test('carry-over lists the open actions of the chosen team and project only', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', title: 'Sprint 7', name: 'Alice' })
  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-action-workflow').click()
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Fix Alpha build')
  // Tab closes the suggestion list first: a click on Add while it is open can be swallowed.
  await page.getByTestId('owner-input').fill('Ana')
  await page.getByTestId('owner-input').press('Tab')
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

test('recent boards form one lane per team once there are two teams', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', title: 'Alpha retro', name: 'Alice' })
  await page.goto('/new')
  await page.getByTestId('team-select').selectOption('__new')
  await page.getByTestId('team-name').fill('Beta')
  await page.getByTestId('setup-title').fill('Beta retro')
  await page.getByTestId('setup-passcode').fill('')
  await page.getByTestId('setup-submit').click()
  await page.getByTestId('confirm').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.goto('/')
  await page.goto('/new')
  await expect(page.getByTestId('new-resume')).toBeVisible()
  await expect(page.locator('[data-testid^="lane-"]')).toHaveCount(2)
})

test('a team starts its next board like its last one: format, theme, agenda and the next title', async ({ page }) => {
  await createBoard(page, { template: 'mad-sad-glad', theme: 'studio', title: 'Sprint 7', name: 'Alice' })
  await page.goto('/new')
  await expect(page.getByTestId('setup-title')).toHaveValue('Sprint 8')
  await page.getByTestId('tab-all').click()
  await expect(page.getByTestId('template-mad-sad-glad')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('theme-studio')).toHaveAttribute('aria-checked', 'true')
  // Another team starts clean: no carried format.
  await page.getByTestId('team-select').selectOption('__new')
  await expect(page.getByTestId('team-name')).toBeVisible()
  await expect(page.getByTestId('carry-none')).toBeVisible()
})
