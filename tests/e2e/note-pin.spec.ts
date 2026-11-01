import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

test.skip(({ isMobile }) => isMobile, 'facilitator menus are covered on desktop')

test('a pinned note comes first for everyone under any sort, stays editable and votable, and unpins', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, url, 'Bob')
  await publishNote(bob.page, 0, 'Alpha idea')
  await publishNote(bob.page, 0, 'Release is late')
  const late = noteByText(page, 'Release is late')
  await expect(late).toBeVisible()
  const id = (await late.getAttribute('data-source-id'))!

  await late.getByTestId(`note-menu-${id}`).click()
  await page.getByTestId(`pin-${id}`).click()

  const first = (p: typeof page) => p.locator('section[data-testid^="column-"]').first().locator('[data-testid^="note-"][data-source-id]').first()
  await expect(first(page)).toContainText('Release is late')
  await expect(first(bob.page)).toContainText('Release is late')
  await expect(noteByText(bob.page, 'Release is late').getByTestId(`pinned-${id}`)).toBeVisible()

  const axe = await new AxeBuilder({ page }).include(`[data-testid="note-${id}"]`).analyze()
  expect(axe.violations).toEqual([])

  // A personal sort applies below the pinned item.
  const colId = (await bob.page.locator('section[data-testid^="column-"]').first().getAttribute('data-testid'))!.replace('column-', '')
  await bob.page.getByTestId(`col-sort-${colId}`).click()
  await bob.page.getByTestId(`sort-alpha-${colId}`).click()
  await expect(first(bob.page)).toContainText('Release is late')

  // Pinned is not frozen: the vote counts.
  await noteByText(bob.page, 'Release is late').getByTestId(`vote-${id}`).click()
  await expect(noteByText(page, 'Release is late').getByTestId(`vote-${id}`)).toContainText('1')

  await noteByText(page, 'Release is late').getByTestId(`note-menu-${id}`).click()
  await page.getByTestId(`pin-${id}`).click()
  await expect(page.getByTestId(`pinned-${id}`)).toHaveCount(0)
  await expect(first(page)).toContainText('Alpha idea')
})
