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

test('the create button sits in the right half of the form (change creation-polish)', async ({ page }) => {
  await page.goto('/new')
  const form = await page.getByTestId('setup-form').boundingBox()
  const btn = await page.getByTestId('setup-submit').boundingBox()
  expect(btn!.x + btn!.width / 2).toBeGreaterThan(form!.x + form!.width / 2)
})

test('board options: simple hides the expert settings, advanced shows them (change options-simple-mode)', async ({ page }) => {
  await page.goto('/new')
  await page.getByTestId('setup-title').fill('Options')
  await page.getByTestId('tab-all').click()
  await page.getByTestId('template-halloween').click()
  await page.getByTestId('setup-submit').click()
  await enterName(page, 'Alice')
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-options').click()
  await expect(page.getByTestId('opt-votes')).toBeVisible()
  await expect(page.getByTestId('opt-secret')).toBeVisible()
  await expect(page.getByTestId('opt-per-item')).toHaveCount(0)
  await expect(page.getByTestId('opt-arrivals')).toHaveCount(0)
  await page.getByTestId('mode-advanced').scrollIntoViewIfNeeded()
  await page.getByTestId('mode-advanced').click()
  await expect(page.getByTestId('opt-per-item')).toBeVisible()
  await expect(page.getByTestId('opt-arrivals')).toBeVisible()
})
