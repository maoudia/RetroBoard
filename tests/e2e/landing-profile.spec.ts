import { expect, test } from '@playwright/test'
import { collectProblems, createBoard, join } from './helpers'

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

  test('the board theme is imposed; light or dark is personal, per participant', async ({ page, browser }) => {
    await createBoard(page, { theme: 'halloween', template: 'start-stop-continue', name: 'Alice' })
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'halloween')
    // Default: the theme's own variant (Halloween is dark).
    await expect(html).toHaveAttribute('data-variant', 'dark')
    await page.getByTestId('btn-share').click()
    const link = await page.getByTestId('share-url').inputValue()
    await page.keyboard.press('Escape')
    const bob = await join(browser, link, 'Bob')

    // Alice switches to light from the toolbar; Bob stays dark. Same theme for both.
    await page.getByTestId('btn-variant').click()
    await expect(html).toHaveAttribute('data-variant', 'light')
    await expect(bob.page.locator('html')).toHaveAttribute('data-variant', 'dark')
    await expect(bob.page.locator('html')).toHaveAttribute('data-theme', 'halloween')

    // The light Halloween uses its authored light palette (not the dark one).
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())
    expect(bg).toBe('#fbf6ef')

    // Profile: back to the theme's own variant.
    await page.getByTestId('btn-profile').click()
    await page.getByTestId('variant-theme').click()
    await expect(html).toHaveAttribute('data-variant', 'dark')
    await bob.ctx.close()
  })

  test('only the facilitator changes the board theme', async ({ page, browser }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-share').click()
    const bob = await join(browser, await page.getByTestId('share-url').inputValue(), 'Bob')
    await page.keyboard.press('Escape')
    await bob.page.getByTestId('btn-options').click()
    await expect(bob.page.getByTestId('opt-readonly')).toBeVisible()
    await expect(bob.page.locator('[data-testid^="theme-"]').first()).toBeDisabled()
    await bob.page.keyboard.press('Escape')
    await page.getByTestId('btn-options').click()
    await page.getByTestId('theme-slate').click()
    await expect(bob.page.locator('html')).toHaveAttribute('data-theme', 'slate')
    await bob.ctx.close()
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
    const errors = await collectProblems(page)
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

test('legal notice, privacy and terms are linked from every page, in both languages', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('link-privacy').click()
  await expect(page.getByTestId('page-privacy')).toBeVisible()
  // The privacy page lists exactly what the service can observe.
  for (const m of [1, 2, 3, 4, 5, 6]) await expect(page.getByTestId(`privacy-2-${m}`)).toBeVisible()
  await expect(page.getByTestId('privacy-2-2')).toContainText('adresse IP')
  await expect(page.getByTestId('page-privacy')).toContainText('chiffrés dans ton navigateur')

  await page.getByTestId('link-legal').click()
  await expect(page.getByTestId('page-legal')).toContainText('Cloudflare, Inc., 101 Townsend Street')
  await page.getByTestId('link-terms').click()
  await expect(page.getByTestId('page-terms')).toContainText('droit français')

  await page.goto('/new')
  await expect(page.getByTestId('link-legal')).toBeVisible()
  await page.goto('/check')
  await expect(page.getByTestId('link-privacy')).toBeVisible()
})
