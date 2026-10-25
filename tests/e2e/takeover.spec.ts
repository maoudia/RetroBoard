import { expect, test } from '@playwright/test'
import { createBoard, enterName } from './helpers'

async function facilitatorLink(page: import('@playwright/test').Page) {
  await page.getByTestId('btn-share').click()
  // One facilitator: the link has its own card; open boards keep it under Advanced.
  const toggle = page.getByTestId('share-facilitator-toggle')
  if (await toggle.count()) await toggle.click()
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

test('the lead sees the facilitator link card at once, hands over to a connected participant, and the crown follows', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-share').click()
  const participantUrl = await page.getByTestId('share-url').inputValue()
  // No expanding needed: card, warning and copy are visible.
  await expect(page.getByTestId('share-facilitator-card')).toBeVisible()
  await expect(page.getByTestId('share-facilitator-url')).toBeVisible()
  await expect(page.getByTestId('share-facilitator-copy')).toBeVisible()
  await expect(page.getByTestId('share-handover-select')).toBeVisible()
  await page.keyboard.press('Escape')

  const bob = await openAs(browser, participantUrl, 'Bob')
  // Bob has no facilitator link: he sees neither the card nor the link.
  await bob.page.getByTestId('btn-share').click()
  await expect(bob.page.getByTestId('share-facilitator-card')).toHaveCount(0)
  await bob.page.keyboard.press('Escape')

  await page.getByTestId('btn-share').click()
  await page.getByTestId('share-handover-select').selectOption({ label: 'Bob' })
  await page.getByTestId('share-handover').click()
  await page.keyboard.press('Escape')

  // The crown badge moves to Bob in everyone's participants list.
  await bob.page.getByTestId('btn-participants').click()
  await expect(bob.page.getByTestId('peers').locator('[data-role="facilitator"]')).toContainText('Bob')
  await expect(bob.page.getByTestId('peers').locator('[data-role="facilitator"] [data-testid="badge-facilitator"]')).toBeVisible()
  await bob.ctx.close()
})

test('the lead\'s pointer carries a crown for others, an ordinary pointer does not', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'touch screens show no floating pointers')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await openAs(browser, url, 'Bob')

  // Alice (lead) points at the board; Bob sees a pointer with a crown.
  const box = (await page.getByTestId('board').boundingBox())!
  // Pointers travel on the direct link only: keep moving until it is open.
  const alice = bob.page.locator('[data-testid^="cursor-"]', { hasText: 'Alice' })
  await expect(async () => {
    await page.mouse.move(box.x + 200, box.y + 200)
    await page.mouse.move(box.x + 260, box.y + 240, { steps: 6 })
    await expect(alice).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 20_000 })
  await expect(alice.locator('[data-testid^="crown-"]')).toBeVisible()

  // Bob points: Alice sees Bob's pointer without a crown.
  const bbox = (await bob.page.getByTestId('board').boundingBox())!
  const bobCursor = page.locator('[data-testid^="cursor-"]', { hasText: 'Bob' })
  await expect(async () => {
    await bob.page.mouse.move(bbox.x + 300, bbox.y + 200)
    await bob.page.mouse.move(bbox.x + 340, bbox.y + 240, { steps: 6 })
    await expect(bobCursor).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 20_000 })
  await expect(bobCursor.locator('[data-testid^="crown-"]')).toHaveCount(0)
  await bob.ctx.close()
})
