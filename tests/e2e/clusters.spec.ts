import { expect, test } from '@playwright/test'
import { column, createBoard, noteByText, publishNote, settle } from './helpers'

const clusters = (page: import('@playwright/test').Page) => page.locator('.cluster')

test.describe('clusters as merged ideas', () => {
  test('title suggestions from the notes, rename by picking one', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Tests lents en CI')
    await publishNote(page, 0, 'Les tests sont trop lents')
    await noteByText(page, 'Les tests sont trop lents').dragTo(noteByText(page, 'Tests lents en CI'))
    await clusters(page).first().locator('.stack').click()
    const sugg = page.getByTestId('cluster-suggestion')
    await expect(sugg.first()).toHaveText('Tests lents')
    await sugg.first().click()
    await expect(page.getByTestId('group-title')).toHaveValue('Tests lents')
  })

  test('expand all shows notes inline for me; collapse brings stacks back', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    for (const t of ['A1', 'A2']) await publishNote(page, 0, t)
    await noteByText(page, 'A2').dragTo(noteByText(page, 'A1'))
    await settle(page)
    const btn = column(page, 0).locator('[data-testid^="expand-"]')
    await btn.click()
    await expect(column(page, 0).locator('[data-testid^="cluster-inline-"] article.note')).toHaveCount(2)
    await btn.click()
    await expect(column(page, 0).locator('[data-testid^="cluster-inline-"]')).toHaveCount(0)
  })

  test('merge two clusters from the menu (touch-friendly); the target keeps its title', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    for (const t of ['B1', 'B2', 'C1', 'C2']) await publishNote(page, 0, t)
    await noteByText(page, 'B2').dragTo(noteByText(page, 'B1'))
    await settle(page)
    await noteByText(page, 'C2').dragTo(noteByText(page, 'C1'))
    await settle(page)
    await expect(clusters(page)).toHaveCount(2)
    // Name the target, then merge the other one into it.
    await clusters(page).nth(1).locator('.stack').click()
    await page.getByTestId('group-title').fill('Target')
    await page.getByTestId('group-title').press('Enter')
    await page.getByTestId('group-close').click()
    await clusters(page).nth(0).locator('.stack').click()
    await page.getByTestId('cluster-merge').click()
    await page.locator('[data-testid^="merge-into-"]').first().click()
    await expect(clusters(page)).toHaveCount(1)
    await expect(clusters(page).first()).toContainText('Target')
    await expect(clusters(page).first()).toContainText('4')
  })
})
