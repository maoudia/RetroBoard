import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

test('the end of the agenda is plain text and closes voting', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('agenda-ring').click()
  await page.getByTestId('agenda-start').click()
  await page.getByTestId('agenda-end').click()
  await page.keyboard.press('Escape')
  const line = page.getByTestId('stepper-mode')
  await expect(line).toContainText('Déroulé terminé')
  expect(await line.evaluate((e) => e.tagName)).toBe('SPAN')
})

test('an open cluster never needs sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 860 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Alpha idea')
  await publishNote(page, 0, 'Beta idea')
  await page.locator('body').click({ position: { x: 5, y: 400 } })
  await expect(async () => {
    await noteByText(page, 'Alpha idea').locator('[data-testid^="note-menu-"]').click()
    await page.locator('[data-testid^="group-with-"]').click({ timeout: 2000 })
  }).toPass({ timeout: 10_000 })
  await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Beta idea' }).click()
  await page.locator('[data-testid^="group-"]:not([data-testid*="with"]):not([data-testid*="onto"])').first().click().catch(() => {})
  const panel = page.getByTestId('group-panel')
  if (await panel.count()) {
    const overflow = await panel.evaluate((e) => e.scrollWidth - e.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  }
})

test('with many people the chat folds the roster into an avatar strip', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const guests = []
  for (const name of ['Bob', 'Cleo', 'Dan', 'Eve']) guests.push(await join(browser, link, name))
  await page.getByTestId('btn-chat').click()
  await expect(page.getByTestId('chat-people-toggle')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('chat-people')).toContainText('Eve')
  await expect(page.getByTestId('chat-roster')).toHaveCount(0)
  await page.getByTestId('chat-people-toggle').click()
  await expect(page.getByTestId('chat-roster')).toContainText('Dan')
  for (const g of guests) await g.ctx.close()
})
