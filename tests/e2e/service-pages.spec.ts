import { expect, test } from '@playwright/test'

test('unknown address: a branded 404 with a typo suggestion that leads to the right page', async ({ page }) => {
  await page.goto('/nwe')
  await expect(page.getByTestId('service-404')).toBeVisible()
  await expect(page.locator('h1')).toBeFocused()
  await expect(page).toHaveTitle(/404/)
  await expect(page.getByTestId('service-suggestions')).toContainText('/new')
  await page.getByTestId('service-suggestions').getByRole('button', { name: '/new' }).click()
  await expect(page).toHaveURL(/\/new$/)
  await expect(page.getByTestId('setup-form')).toBeVisible()
})

test('404 without a close match offers only the way home', async ({ page }) => {
  await page.goto('/zzzzzzzz')
  await expect(page.getByTestId('service-404')).toBeVisible()
  await expect(page.getByTestId('service-suggestions')).toHaveCount(0)
  await page.getByTestId('service-home').click()
  await expect(page).toHaveURL(/\/$/)
})

test('an unexpected error shows an error id and a way back', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('link-check')).toBeVisible()
  // What Nuxt's showError() does, reached through the app instance (no test-only code in the product).
  await page.evaluate(() => {
    const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $nuxt: { payload: { error: unknown } } } } } }).__vue_app__
    app.config.globalProperties.$nuxt.payload.error = { statusCode: 500, message: 'boom', fatal: true }
  })
  await expect(page.getByTestId('service-500')).toBeVisible()
  await expect(page.getByTestId('service-error-id')).toHaveText(/^[0-9a-f]{8}$/)
  await page.getByTestId('service-reload').click()
  await expect(page.getByTestId('hero-title')).toBeVisible()
})
