import { expect, type Locator, test } from '@playwright/test'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { createBoard, join } from './helpers'

// Clipboard permissions exist in Chromium only (Firefox and WebKit reject them).
test.beforeEach(async ({ context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

/** Reads a QR code from its screenshot, like a phone camera would. */
async function scan(qr: Locator): Promise<string | null> {
  const png = PNG.sync.read(await qr.screenshot({ animations: 'disabled' }))
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null
}

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
  expect(await scan(page.getByTestId('qr'))).toBe(url)
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

test('presenter mode: no private drafts, no pointers, a QR card to join; Escape leaves', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'presenting is done from a laptop or a room screen')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const firstCol = page.locator('section[data-testid^="column-"]').first()
  await firstCol.locator('textarea').fill('My private draft')
  const bob = await join(browser, link, 'Bob')

  await page.getByTestId('btn-presenter').click()
  await expect(page.getByTestId('btn-presenter')).toHaveAttribute('aria-pressed', 'true')
  await expect(firstCol.locator('textarea')).toBeHidden()
  await expect(page.getByText('My private draft')).toBeHidden()
  await expect(page.getByTestId('presenter-join').getByTestId('qr')).toBeVisible()
  expect(await scan(page.getByTestId('presenter-join').getByTestId('qr'))).toBe(link)

  // Bob moves: nothing is drawn on the presenter's screen.
  const col = (await bob.page.locator('section[data-testid^="column-"]').first().boundingBox())!
  await bob.page.mouse.move(col.x + 40, col.y + 80, { steps: 5 })
  await bob.page.mouse.move(col.x + 80, col.y + 120, { steps: 5 })
  await page.waitForTimeout(600)
  await expect(page.locator('[data-testid^="cursor-"]:visible')).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(page.getByTestId('presenter-join')).toHaveCount(0)
  // The draft was kept, only hidden.
  await expect(firstCol.locator('textarea')).toHaveValue('My private draft')
  await bob.ctx.close()
})
