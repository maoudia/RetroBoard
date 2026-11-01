import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { enterName } from './helpers'

// Change simple-advanced-mode: the product starts simple, the whole suite otherwise runs advanced.
test.use({ storageState: { cookies: [], origins: [] } })

test('creation: simple shows title and format only, advanced shows every option, choice is remembered', async ({ page }) => {
  await page.goto('/new')
  await expect(page.getByTestId('mode-simple')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('setup-title')).toBeVisible()
  await expect(page.getByTestId('tab-all')).toBeVisible()
  await expect(page.getByTestId('theme-studio')).toHaveCount(0)
  await expect(page.getByTestId('setup-facilitation')).toHaveCount(0)
  await expect(page.getByTestId('setup-passcode')).toHaveCount(0)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])

  await page.getByTestId('mode-advanced').click()
  await expect(page.getByTestId('theme-studio')).toBeVisible()
  await expect(page.getByTestId('setup-facilitation')).toBeVisible()
  await expect(page.getByTestId('setup-passcode')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('mode-advanced')).toHaveAttribute('aria-pressed', 'true')
})

test('simple creation uses the defaults and sharing keeps link, copy and QR', async ({ page }) => {
  await page.goto('/new')
  await page.getByTestId('setup-title').fill('Sprint simple')
  await page.getByTestId('tab-all').click()
  await page.getByTestId('template-halloween').click()
  await page.getByTestId('setup-submit').click()
  await enterName(page, 'Alice')
  await expect(page.getByTestId('share-url')).toBeVisible()
  await expect(page.getByTestId('copy-link')).toBeVisible()
  await expect(page.getByTestId('share-qr-toggle')).toBeVisible()
  await expect(page.getByTestId('copy-chat')).toHaveCount(0)
  await page.getByTestId('mode-advanced').click()
  await expect(page.getByTestId('copy-chat')).toBeVisible()
  await expect(page.getByTestId('share-e2e')).toBeVisible()
})
