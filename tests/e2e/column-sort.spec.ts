import { expect, test } from '@playwright/test'
import { column, createBoard, publishNote } from './helpers'

test('sorting a column is personal and offers newest, A to Z and author', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await publishNote(page, 0, 'Banana')
  await publishNote(page, 0, 'apple')
  const texts = () => column(page, 0).getByTestId('note-text').allInnerTexts()
  await expect(async () => expect(await texts()).toEqual(['Banana', 'apple'])).toPass()

  const colId = (await column(page, 0).getAttribute('data-testid'))!.replace('column-', '')
  await page.getByTestId(`col-sort-${colId}`).click()
  await page.getByTestId(`sort-newest-${colId}`).click()
  await expect(async () => expect(await texts()).toEqual(['apple', 'Banana'])).toPass()

  await page.getByTestId(`col-sort-${colId}`).click()
  await page.getByTestId(`sort-alpha-${colId}`).click()
  await expect(async () => expect(await texts()).toEqual(['apple', 'Banana'])).toPass()

  await page.getByTestId(`col-sort-${colId}`).click()
  await page.getByTestId(`sort-time-${colId}`).click()
  await expect(async () => expect(await texts()).toEqual(['Banana', 'apple'])).toPass()
})
