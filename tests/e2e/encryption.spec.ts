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
