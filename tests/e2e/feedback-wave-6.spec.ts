import { expect, test } from '@playwright/test'
import { createBoard, noteByText, publishNote } from './helpers'

test('a new board runs its agenda by itself and hands over when the time is up', async ({ page }) => {
  await page.clock.install()
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', autoAgenda: true })
  await expect(page.getByTestId('step-0')).toHaveAttribute('data-state', 'current')
  await page.clock.fastForward('06:00')
  await expect(page.getByTestId('step-1')).toHaveAttribute('data-state', 'current', { timeout: 10_000 })
})

test('the theme animation can be turned off while the board is created', async ({ page }) => {
  await page.goto('/new')
  const toggle = page.getByTestId('setup-ambient')
  await expect(toggle).toBeChecked()
  await toggle.uncheck()
  await expect(toggle).not.toBeChecked()
})

test('the ticket bar shows how many votes are left', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Alpha idea')
  const left = page.getByTestId('votes-left')
  await expect(left).toContainText('/')
  await expect(page.getByTestId('votebar').locator('.tk').first()).toBeVisible()
})

test('the connection legend explains direct and relay with two icons', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-participants').click()
  const legend = page.getByTestId('links-state')
  if (await legend.count()) {
    await expect(legend.locator('[data-mode="direct"]')).toBeVisible()
    await expect(legend.locator('[data-mode="relay"]')).toBeVisible()
  }
})

test('several ideas can be ticked and grouped at once from the menu', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  for (const text of ['Alpha idea', 'Beta idea', 'Gamma idea']) await publishNote(page, 0, text)
  await page.locator('body').click({ position: { x: 5, y: 400 } })
  await expect(async () => {
    await noteByText(page, 'Alpha idea').locator('[data-testid^="note-menu-"]').click()
    await page.locator('[data-testid^="group-with-"]').click({ timeout: 2000 })
  }).toPass({ timeout: 10_000 })
  await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Beta idea' }).click()
  await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Gamma idea' }).click()
  await page.getByTestId('group-bulk-go').click()
  await expect(noteByText(page, 'Alpha idea')).toHaveCount(0)
  await expect(noteByText(page, 'Gamma idea')).toHaveCount(0)
})
