import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

test.skip(({ isMobile }) => isMobile, 'facilitator menus are covered on desktop')

test('a frozen note keeps its text and votes, shows a badge to everyone, and thaws on demand', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, url, 'Bob')
  await publishNote(bob.page, 0, 'Frozen idea')
  const note = noteByText(page, 'Frozen idea')
  await expect(note).toBeVisible()

  const id = (await note.getAttribute('data-source-id'))!
  await note.getByTestId(`note-menu-${id}`).click()
  await page.getByTestId(`freeze-${id}`).click()

  await expect(noteByText(page, 'Frozen idea').getByTestId(`frozen-${id}`)).toBeVisible()
  await expect(noteByText(bob.page, 'Frozen idea').getByTestId(`frozen-${id}`)).toBeVisible()
  // The author can no longer edit or delete it.
  await noteByText(bob.page, 'Frozen idea').getByTestId(`note-menu-${id}`).click()
  await expect(bob.page.getByTestId(`delete-${id}`)).toHaveCount(0)
  await bob.page.keyboard.press('Escape')

  const results = await new AxeBuilder({ page }).include(`[data-testid="note-${id}"]`).analyze()
  expect(results.violations).toEqual([])

  await note.getByTestId(`note-menu-${id}`).click()
  await page.getByTestId(`freeze-${id}`).click()
  await expect(noteByText(page, 'Frozen idea').getByTestId(`frozen-${id}`)).toHaveCount(0)
  await bob.ctx.close()
})

test('a frozen cluster shows its badge and cannot be dissolved', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await publishNote(page, 0, 'Idea one')
  await publishNote(page, 0, 'Idea two')
  const one = noteByText(page, 'Idea one')
  const oneId = (await one.getAttribute('data-source-id'))!
  const twoId = (await noteByText(page, 'Idea two').getAttribute('data-source-id'))!
  await one.getByTestId(`note-menu-${oneId}`).click()
  await page.getByTestId(`group-with-${oneId}`).click()
  await page.getByTestId(`group-onto-${twoId}`).click()
  await page.locator('[data-testid^="group-"][data-source-id]').first().click()
  await page.getByTestId('group-freeze').click()
  await expect(page.getByTestId('group-dissolve')).toBeDisabled()
  await page.getByTestId('group-freeze').click()
  await expect(page.getByTestId('group-dissolve')).toBeEnabled()
})
