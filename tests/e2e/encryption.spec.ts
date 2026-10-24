import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

const TEXT = 'Deploy on Fridays'
const variants = (s: string) => {
  const b64 = Buffer.from(s).toString('base64')
  return [s, b64, b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), encodeURIComponent(s), JSON.stringify(s).slice(1, -1)]
}

test('the relay only sees ciphertext; the key never leaves the fragment', async ({ page, browser }) => {
  const frames: string[] = []
  const sockets: string[] = []
  const requests: string[] = []
  page.on('websocket', (ws) => {
    sockets.push(ws.url())
    ws.on('framesent', (f) => frames.push(String(f.payload)))
    ws.on('framereceived', (f) => frames.push(String(f.payload)))
  })
  page.on('request', (r) => requests.push(`${r.url()} ${JSON.stringify(r.headers())} ${r.postData() ?? ''}`))

  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const hash = new URL(page.url()).hash
  const key = /[#&]k=([A-Za-z0-9_-]{43})/.exec(hash)?.[1]
  const secret = /[#&]f=([A-Za-z0-9_-]{43})/.exec(hash)?.[1]
  expect(key && secret).toBeTruthy()

  await publishNote(page, 0, TEXT)
  // A second participant decrypts the same board from the participant link (no facilitator secret).
  await page.getByTestId('btn-share').click()
  const shared = await page.getByTestId('share-url').inputValue()
  expect(shared).not.toContain(secret!)
  expect(shared).toContain(`k=${key}`)
  await expect(page.getByTestId('share-warn')).toBeVisible()
  await expect(page.getByTestId('share-facilitator-url')).toHaveCount(0)
  await page.getByTestId('share-facilitator-toggle').click()
  await expect(page.getByTestId('share-facilitator-url')).toHaveValue(new RegExp(`&f=${secret}`))
  const bob = await join(browser, shared, 'Bob')
  await expect(noteByText(bob.page, TEXT)).toBeVisible()

  expect(sockets.every((u) => u.includes('/ws2?room=') && !u.includes(key!))).toBe(true)
  expect(frames.length).toBeGreaterThan(3)
  const wire = frames.join('\n')
  for (const v of [...variants(TEXT), key!, secret!, 'Alice']) expect(wire).not.toContain(v)
  for (const r of requests) { expect(r).not.toContain(key!); expect(r).not.toContain(secret!) }
  await bob.ctx.close()
})

test('a participant cannot steer the board', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-share').click()
  const bob = await join(browser, await page.getByTestId('share-url').inputValue(), 'Bob')
  await page.keyboard.press('Escape')
  // Bob tries to lock the board: his forged settings event is ignored by every replica.
  await bob.page.getByTestId('btn-options').click()
  await bob.page.getByTestId('opt-lock').check()
  await bob.page.waitForTimeout(500)
  await expect(page.locator('.page')).toHaveAttribute('data-locked', 'false')
  await expect(bob.page.locator('.page')).toHaveAttribute('data-locked', 'false')
  // The facilitator can.
  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-lock').check()
  await expect(bob.page.locator('.page')).toHaveAttribute('data-locked', 'true')
  await bob.ctx.close()
})

test('passcode: the link alone is not enough; a wrong passcode shows nothing and can be retried', async ({ page, browser }) => {
  await page.goto('/new')
  await page.getByTestId('setup-passcode').fill('blue-otter-42')
  await page.getByTestId('setup-submit').click()
  await page.getByTestId('name-input').fill('Alice')
  await page.getByTestId('name-save').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await publishNote(page, 0, 'Protected idea')

  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  expect(link).toMatch(/&p=1$/)
  expect(link).not.toContain('blue-otter-42')
  await expect(page.getByTestId('share-passcode')).toBeVisible()

  const ctx = await browser.newContext()
  const bob = await ctx.newPage()
  await bob.goto(link)
  await expect(bob.getByTestId('passcode-input')).toBeVisible()
  await expect(bob.getByTestId('board')).toHaveCount(0)

  await bob.getByTestId('passcode-input').fill('wrong')
  await bob.getByTestId('passcode-submit').click()
  await expect(bob.getByTestId('passcode-wrong')).toBeVisible()
  await expect(bob.getByTestId('board')).toHaveCount(0)
  await expect(bob.getByText('Protected idea')).toHaveCount(0)

  await bob.getByTestId('passcode-input').fill('blue-otter-42')
  await bob.getByTestId('passcode-submit').click()
  await bob.getByTestId('name-input').fill('Bob')
  await bob.getByTestId('name-save').click()
  await expect(noteByText(bob, 'Protected idea')).toBeVisible()
  await ctx.close()
})
