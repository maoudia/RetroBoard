import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test('a new board opens the invite panel; chat message, email and QR hold the participant link only', async ({ page, browserName }) => {
  await createBoard(page, { template: 'start-stop-continue', title: 'Sprint 42', keepShare: true })
  const url = await page.getByTestId('share-url').inputValue()
  expect(url).not.toMatch(/[#&]f=/)

  const mailto = await page.getByTestId('share-email').getAttribute('href')
  expect(mailto).toMatch(/^mailto:\?subject=/)
  const body = decodeURIComponent(mailto!.split('&body=')[1]!)
  expect(body).toContain(url)
  expect(body).toContain('Sprint 42')
  expect(decodeURIComponent(mailto!)).not.toMatch(/[#&]f=/)

  if (browserName === 'chromium') {
    await page.getByTestId('copy-chat').click()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain(url)
    expect(copied).toContain('« Sprint 42 »')
  }

  await page.getByTestId('share-qr-toggle').click()
  await expect(page.getByTestId('qr')).toBeVisible()
  await expect(page.getByTestId('qr')).toHaveAttribute('aria-label', 'QR code du lien participant')
})

test('passcode boards: the code is offered for copy but never put in the message', async ({ page, browserName }) => {
  await page.goto('/new')
  await page.getByTestId('setup-title').fill('Secret retro')
  await page.getByTestId('tab-all').click()
  await page.getByTestId('template-start-stop-continue').click()
  await page.getByTestId('setup-passcode').fill('blue-river-42')
  await page.getByTestId('setup-submit').click()
  await page.getByTestId('name-input').fill('Alice')
  await page.getByTestId('name-save').click()
  await expect(page.getByTestId('share-passcode-value')).toHaveValue('blue-river-42')
  const mailto = decodeURIComponent((await page.getByTestId('share-email').getAttribute('href'))!)
  expect(mailto).not.toContain('blue-river-42')
  expect(mailto).toContain('autre message')
  if (browserName === 'chromium') {
    await page.getByTestId('copy-chat').click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).not.toContain('blue-river-42')
    await page.getByTestId('copy-passcode').click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('blue-river-42')
  }
})
