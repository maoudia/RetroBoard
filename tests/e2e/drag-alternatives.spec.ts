import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { column, createBoard, noteByText, publishNote } from './helpers'

test.describe('operable without dragging (WCAG 2.5.7)', () => {
  test('group two notes with the keyboard only', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Alpha')
    await publishNote(page, 0, 'Beta')
    await publishNote(page, 0, 'Gamma')
    await page.locator('body').click({ position: { x: 5, y: 300 } })

    const menu = noteByText(page, 'Alpha').locator('[data-testid^="note-menu-"]')
    await menu.focus()
    await page.keyboard.press('Enter')
    const summary = page.locator('[data-testid^="group-with-"]')
    await expect(summary).toBeVisible()
    await summary.focus()
    await page.keyboard.press('Enter')
    const target = page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Beta' })
    await expect(target).toBeVisible()
    await target.focus()
    await page.keyboard.press('Enter')

    await expect(page.locator('[data-testid^="group-"]:not([data-testid^="group-with-"]):not([data-testid^="group-onto-"])').first()).toBeVisible()
    await expect(noteByText(page, 'Gamma')).toBeVisible()
    await expect(noteByText(page, 'Alpha')).toHaveCount(0) // stacked in the cluster
  })

  test('a note can join an existing group from its menu', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await publishNote(page, 0, 'Three')
    // Menus need settle time (Firefox, WebKit): open and act together until it sticks.
    await expect(async () => {
      await noteByText(page, 'One').locator('[data-testid^="note-menu-"]').click()
      await page.locator('[data-testid^="group-with-"]').click({ timeout: 2000 })
    }).toPass({ timeout: 10_000 })
    await expect(page.locator('[data-testid^="group-onto-"]').first()).toBeVisible()
    const found = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])
    await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Two' }).click()
    await expect(noteByText(page, 'One')).toHaveCount(0)

    // Menus need settle time (Firefox, WebKit): open and act together until it sticks.
    await expect(async () => {
      await noteByText(page, 'Three').locator('[data-testid^="note-menu-"]').click()
      await page.locator('[data-testid^="group-with-"]').click({ timeout: 2000 })
    }).toPass({ timeout: 10_000 })
    const toGroup = page.locator('[data-testid^="group-onto-"]').first()
    await expect(toGroup).toContainText(/Groupe/)
    await toGroup.click()
    await expect(noteByText(page, 'Three')).toHaveCount(0)
    await page.locator('[data-testid^="group-"]:not([data-testid^="group-with-"]):not([data-testid^="group-onto-"])').first().click()
    await expect(page.getByTestId('group-panel').locator('article.note')).toHaveCount(3)
  })

  test('move a note to another column and a column left or right with the keyboard', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Mover')
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    const menu = noteByText(page, 'Mover').locator('[data-testid^="note-menu-"]')
    await menu.focus()
    await page.keyboard.press('Enter')
    const toColumn = page.getByRole('menuitem').filter({ hasText: /^\s*Stop\s*$/ }).first()
    await expect(toColumn).toBeVisible()
    await toColumn.focus()
    await page.keyboard.press('Enter')
    await expect(column(page, 1).locator('article.note', { hasText: 'Mover' })).toBeVisible()

    const title0 = await column(page, 0).locator('h2, h3').first().innerText()
    await column(page, 0).locator('[data-testid^="col-menu-"]').focus()
    await page.keyboard.press('Enter')
    const right = page.getByRole('menuitem').filter({ hasText: /droite|right/i }).first()
    await right.focus()
    await page.keyboard.press('Enter')
    await expect(column(page, 1).locator('h2, h3').first()).toHaveText(title0)
  })
  test('a cluster moves to another column from its menu, axe clean (#239)', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Menu one')
    await publishNote(page, 0, 'Menu two')
    await noteByText(page, 'Menu two').dragTo(noteByText(page, 'Menu one'))
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await column(page, 0).locator('.cluster .stack').click()
    await expect(page.getByTestId('group-panel')).toBeVisible()
    await page.getByTestId('cluster-move').click()
    const axe = await new AxeBuilder({ page }).include('[data-testid="group-panel"]').analyze()
    expect(axe.violations).toEqual([])
    await page.locator('[data-testid^="move-group-to-"]').first().click()
    await expect(page.getByTestId('group-panel')).toHaveCount(0)
    await expect(column(page, 0).locator('.cluster')).toHaveCount(0)
    await expect(column(page, 1).locator('.cluster')).toHaveCount(1)
  })
})
