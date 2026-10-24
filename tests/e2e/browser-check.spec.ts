import { expect, test } from '@playwright/test'
import { collectProblems } from './helpers'

// Runs in every project of the matrix (Chromium, Firefox, WebKit, phone, TV when CI is set).
test('browser check page runs the crypto self-test and reports ready', async ({ page }) => {
  const errors = await collectProblems(page)
  await page.goto('/')
  await page.getByTestId('link-check').click()
  await expect(page).toHaveURL(/\/check$/)
  const check = page.getByTestId('browser-check')
  await expect(check).toHaveAttribute('data-ready', 'true', { timeout: 15_000 })
  for (const id of ['secure', 'aes', 'socket']) await expect(page.getByTestId(`check-${id}`)).toHaveAttribute('data-status', 'ok')
  await expect(page.getByTestId('check-curves')).toHaveAttribute('data-status', /^(ok|fallback)$/)
  expect(errors).toEqual([])
})
