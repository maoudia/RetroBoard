import { expect, test } from '@playwright/test'
import { createBoard, noteByText, publishNote } from './helpers'

test('Ctrl+Z takes back a wrong grouping', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  await publishNote(page, 0, 'Alpha')
  await publishNote(page, 0, 'Beta')
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await expect(async () => {
    await noteByText(page, 'Alpha').locator('[data-testid^="note-menu-"]').click()
    await page.locator('[data-testid^="group-with-"]').click({ timeout: 2000 })
  }).toPass({ timeout: 10_000 })
  await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Beta' }).click()
  await expect(noteByText(page, 'Alpha')).toHaveCount(0) // stacked in the cluster

  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('Control+z')
  await expect(page.getByText('Regroupement annulé')).toBeVisible()
  await expect(noteByText(page, 'Alpha')).toBeVisible()
  await expect(noteByText(page, 'Beta')).toBeVisible()

  await page.keyboard.press('Control+z')
  await expect(page.getByText('Rien à annuler')).toBeVisible()
})
