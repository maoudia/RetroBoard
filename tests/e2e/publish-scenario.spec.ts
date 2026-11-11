import { expect, test } from '@playwright/test'
import { column, columnId, createBoard, noteByText, settle } from './helpers'

/**
 * Usability scenario of change publishing-ux-redesign (task 2.3): the five steps a participant takes to publish, recorded as a
 * Playwright trace (always on, so CI keeps it in the report and the owner can replay it, step by step, with the screenshots).
 * The owner's sign-off is a comment on the pull request; this spec only keeps the scenario from rotting.
 */
test.use({ trace: 'on', viewport: { width: 1280, height: 800 } })

test('five steps to publish: write at the top, keep a draft, see the counter, publish all, undo a mistake', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const first = column(page, 0)
  const second = column(page, 1)
  const field = first.locator('textarea')

  await test.step('1. The composer is at the top of the column and says only I see it', async () => {
    await expect(first.getByTestId(`only-you-${await columnId(page, 0)}`)).toContainText('jusqu\'à la publication')
    await expect(field).toBeVisible()
  })

  await test.step('2. Enter keeps the idea as a draft, a ribbon marks it', async () => {
    await field.fill('Réduire la durée du daily')
    await field.press('Enter')
    await expect(first.locator('.draft .ribbon')).toHaveText('Brouillon')
    await expect(field).toHaveValue('')
  })

  await test.step('3. A second draft in another column, the toolbar counts both', async () => {
    await second.locator('textarea').fill('Garder les rétros courtes')
    await second.locator('textarea').press('Enter')
    await expect(page.getByTestId('draft-count')).toHaveText('2')
  })

  await test.step('4. Publish all from the toolbar', async () => {
    await page.getByTestId('publish-all').click()
    await expect(noteByText(page, 'Réduire la durée du daily')).toBeVisible()
    await expect(noteByText(page, 'Garder les rétros courtes')).toBeVisible()
    await expect(page.getByTestId('draft-count')).toHaveCount(0)
  })

  await test.step('5. Wrong column: Undo within 10 seconds puts the ideas back in the drafts', async () => {
    await settle(page)
    await page.getByTestId('undo-publish').click()
    await expect(noteByText(page, 'Réduire la durée du daily')).toHaveCount(0)
    await expect(page.getByTestId('draft-count')).toHaveText('2')
    await expect(first.locator('.draft')).toContainText('Réduire la durée du daily')
  })
})
