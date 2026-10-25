import { expect, test } from '@playwright/test'
import { createBoard, enterName } from './helpers'

async function facilitatorLink(page: import('@playwright/test').Page) {
  await page.getByTestId('btn-share').click()
  await page.getByTestId('share-facilitator-toggle').click()
  const url = await page.getByTestId('share-facilitator-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

async function openAs(browser: import('@playwright/test').Browser, url: string, name: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(url)
  await enterName(page, name)
  await expect(page.getByTestId('board')).toBeVisible()
  return { ctx, page }
}

test('opening the facilitator link asks before taking over; confirming makes the last one the lead and tells the previous lead', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const link = await facilitatorLink(page)
  // The creator, who leads, is never asked.
  await expect(page.getByTestId('confirm')).toHaveCount(0)

  const carol = await openAs(browser, link, 'Carol')
  await expect(carol.page.getByRole('dialog')).toContainText(/Prendre l'animation|Take over/)
  await carol.page.getByTestId('confirm').click()

  // Carol leads, Alice is told and stays a co-facilitator (the controls remain).
  await carol.page.getByTestId('btn-participants').click()
  await expect(carol.page.getByTestId('peers').locator('[data-role="facilitator"]')).toContainText('Carol')
  await expect(page.getByText(/Carol a pris l'animation|Carol took over/)).toBeVisible()
  await page.getByTestId('btn-participants').click()
  await expect(page.getByTestId('peers').locator('[data-role="facilitator"]')).toContainText('Carol')
  await expect(page.getByTestId('peers').locator('[data-role="co-facilitator"]')).toContainText('Alice')
  await carol.ctx.close()
})

test('declining keeps the current lead; the visitor joins as co-facilitator', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const link = await facilitatorLink(page)
  const dave = await openAs(browser, link, 'Dave')
  await expect(dave.page.getByRole('dialog')).toBeVisible()
  await dave.page.getByRole('button', { name: /Annuler|Cancel/ }).click()

  await dave.page.getByTestId('btn-participants').click()
  await expect(dave.page.getByTestId('peers').locator('[data-role="facilitator"]')).toContainText('Alice')
  await expect(dave.page.getByTestId('peers').locator('[data-role="co-facilitator"]')).toContainText('Dave')
  await dave.ctx.close()
})

test('open boards never ask', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const link = await facilitatorLink(page)
  const erin = await openAs(browser, link, 'Erin')
  await erin.page.waitForTimeout(1_500)
  await expect(erin.page.getByRole('dialog')).toHaveCount(0)
  await erin.ctx.close()
})
