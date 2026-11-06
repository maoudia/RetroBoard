import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

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
  await page.getByTestId('group-bulk-go').click()
  await expect(noteByText(page, 'Alpha')).toHaveCount(0) // stacked in the cluster

  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('Control+z')
  await expect(page.getByText('Regroupement annulé')).toBeVisible()
  await expect(noteByText(page, 'Alpha')).toBeVisible()
  await expect(noteByText(page, 'Beta')).toBeVisible()

  await page.keyboard.press('Control+Shift+z')
  await expect(page.getByText('Regroupement rétabli')).toBeVisible()
  await expect(noteByText(page, 'Alpha')).toHaveCount(0)

  await page.keyboard.press('Control+Shift+z')
  await expect(page.getByText('Rien à rétablir')).toBeVisible()

  await page.keyboard.press('Control+z')
  await expect(page.getByText('Regroupement annulé').first()).toBeVisible()
  await page.keyboard.press('Control+z')
  await expect(page.getByText('Rien à annuler')).toBeVisible()
})

test('the toolbar has undo and redo buttons for phones', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  await publishNote(page, 0, 'Alpha')
  await publishNote(page, 0, 'Beta')
  await expect(page.getByTestId('btn-undo')).toHaveCount(0)
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await expect(async () => {
    await noteByText(page, 'Alpha').locator('[data-testid^="note-menu-"]').click()
    await page.locator('[data-testid^="group-with-"]').click({ timeout: 2000 })
  }).toPass({ timeout: 10_000 })
  await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Beta' }).click()
  await page.getByTestId('group-bulk-go').click()
  await expect(noteByText(page, 'Alpha')).toHaveCount(0)
  await expect(page.getByTestId('btn-redo')).toBeDisabled()
  await page.getByTestId('btn-undo').click()
  await expect(noteByText(page, 'Alpha')).toBeVisible()
  await page.getByTestId('btn-redo').click()
  await expect(noteByText(page, 'Alpha')).toHaveCount(0)
})

test('Ctrl+Z brings back an idea I just deleted', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  await publishNote(page, 0, 'Gone soon')
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await expect(async () => {
    await noteByText(page, 'Gone soon').locator('[data-testid^="note-menu-"]').click()
    await page.getByRole('menuitem', { name: 'Supprimer' }).click({ timeout: 2000 })
  }).toPass({ timeout: 10_000 })
  await expect(noteByText(page, 'Gone soon')).toHaveCount(0)
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('Control+z')
  await expect(page.getByText('Idée restaurée')).toBeVisible()
  await expect(noteByText(page, 'Gone soon')).toBeVisible()
})

test('Ctrl+Z puts a cluster title back', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  await publishNote(page, 0, 'Tests lents en CI')
  await publishNote(page, 0, 'Les tests sont trop lents')
  await noteByText(page, 'Les tests sont trop lents').dragTo(noteByText(page, 'Tests lents en CI'))
  await page.locator('.cluster').first().locator('.stack').click()
  await page.getByTestId('group-title').fill('Pipeline')
  await page.getByTestId('group-title').press('Enter')
  await page.keyboard.press('Escape')
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('Control+z')
  await expect(page.getByText('Titre du groupe rétabli')).toBeVisible()
})

test.describe('history panel (facilitator)', () => {
  test.skip(({ isMobile }) => isMobile, 'facilitator menus are covered on desktop')

  test('a facilitator restores the board from before a wrong grouping, on every peer', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    await page.getByTestId('btn-share').click()
    const url = await page.getByTestId('share-url').inputValue()
    await page.keyboard.press('Escape')
    const bob = await join(browser, url, 'Bob')
    await publishNote(page, 0, 'Alpha')
    await publishNote(page, 0, 'Beta')
    await expect(noteByText(bob.page, 'Beta')).toBeVisible()
    await expect(bob.page.getByTestId('btn-history')).toHaveCount(0)

    await expect(async () => {
      await noteByText(page, 'Alpha').locator('[data-testid^="note-menu-"]').click()
      await page.locator('[data-testid^="group-with-"]').click({ timeout: 2000 })
    }).toPass({ timeout: 10_000 })
    await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Beta' }).click()
    await page.getByTestId('group-bulk-go').click()
    await expect(noteByText(page, 'Alpha')).toHaveCount(0)
    await expect(noteByText(bob.page, 'Alpha')).toHaveCount(0)

    await page.getByTestId('btn-history').click()
    const entry = page.getByTestId('history-entry').first()
    await expect(entry).toContainText('Alice')
    await expect(entry).toContainText('Alpha')
    const results = await new AxeBuilder({ page }).include('[data-testid="history-panel"]').analyze()
    expect(results.violations).toEqual([])

    await entry.getByTestId('history-restore').click()
    await page.getByTestId('confirm').click()
    await expect(noteByText(page, 'Alpha')).toBeVisible()
    await expect(noteByText(page, 'Beta')).toBeVisible()
    await expect(noteByText(bob.page, 'Alpha')).toBeVisible()
    await expect(noteByText(bob.page, 'Beta')).toBeVisible()

    // The restore is itself in the history, as ordinary actions.
    await page.getByTestId('btn-history').click()
    await expect(page.getByTestId('history-entry').first()).toBeVisible()
    await bob.ctx.close()
  })
})
