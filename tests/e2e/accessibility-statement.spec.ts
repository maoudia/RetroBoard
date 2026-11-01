import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test('skip link: first tab stop, moves the focus into the main content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard flow')
  await page.goto('/new')
  // Enter before hydration only follows the hash, the focus move needs the click handler: wait for the app (flaky on a cold first test).
  await page.waitForFunction(() => !!(document.getElementById('__nuxt') as unknown as { __vue_app__?: unknown } | null)?.__vue_app__)
  await page.keyboard.press('Tab')
  const skip = page.getByTestId('skip-link')
  await expect(skip).toBeFocused()
  await expect(skip).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
})

test('skip link on a board reaches the board', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard flow')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.reload()
  await expect(page.getByTestId('board')).toBeVisible()
  // Enter before hydration only follows the hash: retry until the click handler is attached (slow tv runners).
  await expect(async () => {
    await page.getByTestId('skip-link').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('board')).toBeFocused({ timeout: 1000 })
  }).toPass({ timeout: 10_000 })
})

test('the accessibility statement is linked from the landing footer', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('link-accessibility').click()
  await expect(page).toHaveURL(/\/accessibility$/)
  await expect(page.getByTestId('page-accessibility')).toBeVisible()
  await expect(page.locator('h1')).toContainText(/Accessibilité|Accessibility/)
  await expect(page.getByTestId('accessibility-2-1')).toBeVisible()
})

test('scroll padding keeps a focused control clear of the sticky toolbar (WCAG 2.4.11)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const { padding, toolbar } = await page.evaluate(() => ({
    padding: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
    toolbar: document.querySelector('.toolbar')!.getBoundingClientRect().height,
  }))
  expect(padding).toBeGreaterThanOrEqual(toolbar)
})
