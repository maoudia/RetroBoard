import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test.describe('landing', () => {
  test('presents the product in a light, theme-independent design', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('hero-title')).toContainText('Des rétros qui')
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(251, 251, 253)')
    await expect(page.getByRole('heading', { name: /Tout ce qu'il faut/ })).toBeVisible()
  })

  test('theme showcase switches between pro and fun themes', async ({ page }) => {
    await page.goto('/')
    await page.locator('#themes').scrollIntoViewIfNeeded()
    await expect(page.locator('#themes figcaption strong')).toContainText(['Studio', 'Corporate', 'Slate', 'Paper', 'Minimal'])
    await page.getByTestId('lp-tab-fun').click()
    await expect(page.locator('#themes figcaption strong')).toContainText(['Halloween', 'Noël', 'Cyber', 'Sakura'])
  })

  test('call to action leads to the board creation page', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('hero-create').click()
    await expect(page).toHaveURL(/\/new$/)
    await expect(page.getByTestId('new-title')).toBeVisible()
  })
})

test.describe('profile and local settings', () => {
  test('name, motion and density are stored locally and applied', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('btn-profile').click()
    await page.getByTestId('profile-name').fill('Moncef')
    await page.getByTestId('profile-name').blur()
    await page.getByTestId('motion-reduced').click()
    await page.getByTestId('density-compact').click()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('profile-name')).toHaveValue('Moncef')
  })

  test('"my theme" overrides the board theme on my screen only', async ({ page }) => {
    await createBoard(page, { theme: 'halloween', template: 'start-stop-continue' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'halloween')
    await page.getByTestId('btn-profile').click()
    await page.getByTestId('mode-mine').click()
    await page.getByTestId('mine-slate').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'slate')
    await page.getByTestId('mode-board').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'halloween')
  })

  test('recent boards are listed locally and can be wiped', async ({ page }) => {
    await createBoard(page, { template: 'weather', title: 'Sprint 42' })
    await page.goto('/')
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('recents')).toContainText('Sprint 42')
    await page.getByTestId('wipe-local').click()
    await page.getByTestId('confirm').click()
    await expect(page).toHaveURL(/\/$/)
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('profile-name')).toHaveValue('')
  })
})

test.describe('i18n', () => {
  test.use({ locale: 'en-US' })

  test('follows the browser language and can be switched, then persists', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('hero-title')).toContainText('look forward to')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.getByTestId('lang-fr').click()
    await expect(page.getByTestId('hero-title')).toContainText('Des rétros qui')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await page.reload()
    await expect(page.getByTestId('hero-title')).toContainText('Des rétros qui')
  })

  test('a board created in English gets English columns', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await expect(page.getByTestId('column-title').first()).toHaveText('Start')
    await expect(page.locator('section[data-testid^="column-"] header p').first()).toHaveText('To begin')
  })
})

test.describe('no console errors', () => {
  test('landing, setup, board and profile are clean (CSP included)', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('/')
    await page.mouse.wheel(0, 4000)
    await page.getByTestId('lp-tab-fun').click()
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('profile-name')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.goto('/new')
    await createBoard(page)
    await page.waitForTimeout(500)
    expect(errors).toEqual([])
  })
})

test('security.txt is published with a future expiry (RFC 9116)', async ({ request }) => {
  const res = await request.get('/.well-known/security.txt')
  expect(res.ok()).toBe(true)
  const body = await res.text()
  expect(body).toMatch(/^Contact: https:\/\//m)
  const expires = body.match(/^Expires: (.+)$/m)?.[1]
  expect(expires && Date.parse(expires)).toBeGreaterThan(Date.now())
})
