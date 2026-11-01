import AxeBuilder from '@axe-core/playwright'
import { type Browser, expect, test } from '@playwright/test'
import { createBoard, enterName } from './helpers'

async function shareUrl(page: import('@playwright/test').Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

async function joinAs(browser: Browser, url: string, name: string, p2p: boolean) {
  const ctx = await browser.newContext()
  if (!p2p) await ctx.addInitScript(() => localStorage.setItem('retroboard:settings', JSON.stringify({ p2p: false })))
  const page = await ctx.newPage()
  await page.goto(url)
  await enterName(page, name)
  await expect(page.getByTestId('board')).toBeVisible()
  return { ctx, page }
}

test.skip(({ isMobile }) => isMobile, 'participants menu flows are covered on desktop')

test('connection dots: direct for a linked participant, relay for a relay-only one, in words and with my own line', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const url = await shareUrl(page)
  const bob = await joinAs(browser, url, 'Bob', true)
  const carol = await joinAs(browser, url, 'Carol', false)

  await page.getByTestId('btn-participants').click()
  const rowOf = (name: string) => page.locator('[data-testid="peers"] li', { hasText: name })
  // Bob links directly with Alice, Carol (relay only) cannot.
  await expect(rowOf('Bob').getByTestId('conn-dot')).toHaveAttribute('data-state', 'direct', { timeout: 20_000 })
  await expect(rowOf('Carol').getByTestId('conn-dot')).toHaveAttribute('data-state', 'relay')
  await expect(rowOf('Carol')).toContainText('Via le relais')
  await expect(page.getByTestId('my-conn')).toHaveCount(0)

  // Carol sees her own state explained, Alice sees her own as direct.
  await carol.page.getByTestId('btn-participants').click()
  await expect(carol.page.getByTestId('my-conn')).toContainText('relais')
  await expect(carol.page.locator('[data-testid="peers"] li', { hasText: 'Carol' }).getByTestId('conn-dot')).toHaveAttribute('data-state', 'relay')

  const axe = await new AxeBuilder({ page }).include('[data-testid="peers"]').analyze()
  expect(axe.violations).toEqual([])
  await bob.ctx.close()
  await carol.ctx.close()
})

test('joins and departures go to the activity feed for everyone', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await joinAs(browser, await shareUrl(page), 'Bob', true)
  await page.getByTestId('btn-activity').click()
  await expect(page.getByText('Bob a rejoint le board')).toBeVisible({ timeout: 15_000 })
  await bob.ctx.close()
  await expect(page.getByText('Bob a quitté le board')).toBeVisible({ timeout: 20_000 })
})
