import { expect, test } from '@playwright/test'
import { closeShare, createBoard, enterName, join, noteByText, publishNote } from './helpers'

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

test('roles: participants are read-only; the facilitator promotes, hands over and hides', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-share').click()
  const bob = await join(browser, await page.getByTestId('share-url').inputValue(), 'Bob')
  await page.keyboard.press('Escape')

  // Bob is a participant: facilitation controls are read-only, with a hint.
  await bob.page.getByTestId('agenda-ring').click()
  await expect(bob.page.getByTestId('agenda-panel')).toBeVisible()
  await expect(bob.page.getByTestId('agenda-start')).toHaveCount(0)
  await bob.page.keyboard.press('Escape')
  await bob.page.getByTestId('btn-options').click()
  await expect(bob.page.getByTestId('opt-readonly')).toBeVisible()
  await expect(bob.page.getByTestId('opt-lock')).toBeDisabled()
  await bob.page.keyboard.press('Escape')

  // Everyone sees who facilitates.
  await bob.page.getByTestId('btn-participants').click()
  await expect(bob.page.getByTestId('peers').locator('[data-role="facilitator"]')).toContainText('Alice')
  await bob.page.keyboard.press('Escape')

  // Alice promotes Bob: he can now lock the board for everyone.
  await page.getByTestId('btn-participants').click()
  const bobRow = page.getByTestId('peers').locator('li', { hasText: 'Bob' })
  await bobRow.getByTestId('role-promote').click()
  await expect(bobRow).toHaveAttribute('data-role', 'co-facilitator')
  await page.keyboard.press('Escape')
  await bob.page.getByTestId('agenda-ring').click()
  await expect(bob.page.getByTestId('agenda-start')).toBeVisible()
  await bob.page.keyboard.press('Escape')
  await bob.page.getByTestId('btn-options').click()
  await bob.page.getByTestId('opt-lock').check()
  await expect(page.locator('.page')).toHaveAttribute('data-locked', 'true')
  await bob.page.getByTestId('opt-lock').uncheck()
  await bob.page.keyboard.press('Escape')

  // Hand-over: Bob becomes facilitator, Alice stays co-facilitator.
  await page.getByTestId('btn-participants').click()
  await bobRow.getByTestId('role-handover').click()
  await page.getByTestId('confirm').click()
  if (!(await page.getByTestId('peers').isVisible())) await page.getByTestId('btn-participants').click()
  await expect(page.getByTestId('peers').locator('li', { hasText: 'Bob' })).toHaveAttribute('data-role', 'facilitator')
  await expect(page.getByTestId('peers').locator('li', { hasText: 'Alice' })).toHaveAttribute('data-role', 'co-facilitator')
  await page.keyboard.press('Escape')
  await bob.ctx.close()
})

test('roles: hiding a participant hides their new notes for everyone', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-share').click()
  const bob = await join(browser, await page.getByTestId('share-url').inputValue(), 'Bob')
  await page.keyboard.press('Escape')
  await publishNote(bob.page, 0, 'Before hiding')
  await expect(noteByText(page, 'Before hiding')).toBeVisible()

  await page.getByTestId('btn-participants').click()
  await page.getByTestId('peers').locator('li', { hasText: 'Bob' }).getByTestId('role-hide').click()
  await expect(page.getByText(/move to a new board|passe sur un nouveau board/)).toBeVisible()
  await page.keyboard.press('Escape')

  const col = bob.page.locator('section[data-testid^="column-"]').nth(0)
  await col.locator('textarea').fill('After hiding')
  await col.locator('[data-testid^="compose-add-"]').click()
  await col.locator('[data-testid^="publish-"]').click()
  await page.waitForTimeout(800)
  await expect(noteByText(page, 'After hiding')).toHaveCount(0)
  await expect(noteByText(page, 'Before hiding')).toBeVisible()
  await bob.ctx.close()
})

test('passcode: the link alone is not enough; a wrong passcode shows nothing and can be retried', async ({ page, browser }) => {
  await page.goto('/new')
  await page.getByTestId('setup-passcode').fill('blue-otter-42')
  await page.getByTestId('setup-submit').click()
  await page.getByTestId('name-input').fill('Alice')
  await page.getByTestId('name-save').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await closeShare(page)
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

test('the board reopens from the encrypted local copy when the relay is unreachable', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Survives offline')
  await page.waitForTimeout(600) // replica writes are batched (250 ms)
  // Cut the relay entirely: nothing can come from the server.
  await page.routeWebSocket(/\/ws2/, (ws) => { ws.close() })
  await page.reload()
  await expect(noteByText(page, 'Survives offline')).toBeVisible()
  await expect(page.getByTestId('offline')).toBeVisible()
  // The local copy holds ciphertext only.
  const stored = await page.evaluate(() => new Promise<string>((resolve) => {
    const open = indexedDB.open('retroboard-replica')
    open.onsuccess = () => {
      const all = open.result.transaction('envelopes').objectStore('envelopes').getAll()
      all.onsuccess = () => resolve(JSON.stringify(all.result))
    }
  }))
  expect(stored.length).toBeGreaterThan(100)
  expect(stored).not.toContain('Survives offline')
})

test('"until I leave" deletes the local copy when leaving the board', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('retention-0').click()
  await page.keyboard.press('Escape')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Ephemeral')
  await page.waitForTimeout(600)
  await page.goto('/')
  // The purge runs at start-up; some engines finish it a moment later.
  await expect.poll(() => page.evaluate(() => new Promise<number>((resolve) => {
    const open = indexedDB.open('retroboard-replica')
    open.onsuccess = () => { const c = open.result.transaction('envelopes').objectStore('envelopes').count(); c.onsuccess = () => resolve(c.result) }
  }))).toBe(0)
})

test('board file: export, then restore into the same link after the board is gone everywhere', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Kept in the file')
  const facilitatorLink = page.url()
  await page.getByTestId('btn-export').click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-retro').click()])
  const fileText = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'))
  expect(download.suggestedFilename()).toMatch(/\.retro$/)
  expect(fileText).not.toContain('Kept in the file')

  // A fresh browser (no replica) and a relay that lost everything.
  const ctx = await browser.newContext()
  const fresh = await ctx.newPage()
  const published: string[] = []
  await fresh.routeWebSocket(/\/ws2/, (ws) => {
    ws.onMessage((m) => { if (m !== 'ping') published.push(String(m)) })
    ws.send(JSON.stringify({ t: 'welcome', conn: 'abcdefgh12', peers: ['abcdefgh12'] }))
    ws.send(JSON.stringify({ t: 'hist', envs: [], done: true }))
  })
  await fresh.goto(facilitatorLink)
  // Nobody holds the board: the facilitator's new browser waits instead of inventing a second board.
  await expect(fresh.getByTestId('board-waiting')).toBeVisible()
  await expect(fresh.getByTestId('board')).toHaveCount(0)
  // "Try again" reconnects without leaving the page (change board-recovery).
  await fresh.getByTestId('waiting-retry').dispatchEvent('click') // the name dialog sits above the screen
  await expect(fresh.getByTestId('board-waiting')).toBeVisible()
  await fresh.getByTestId('waiting-restore-input').setInputFiles({ name: 'board.retro', mimeType: 'application/octet-stream', buffer: Buffer.from(fileText) })
  await expect(noteByText(fresh, 'Kept in the file')).toBeVisible()
  await expect(fresh.getByTestId('board-waiting')).toHaveCount(0)
  // The restored board is backed up on the relay (memory only, ciphertext) for late joiners (ADR-0024).
  await expect.poll(() => published.filter((m) => m.includes('"t":"pub"')).length, { timeout: 5000 }).toBeGreaterThan(0)
  expect(published.join('')).not.toContain('Kept in the file')

  // A file for another board is refused.
  // The new browser has no name yet: the name dialog sits over the board.
  await enterName(fresh, 'Alice')
  await fresh.getByTestId('btn-export').click()
  await fresh.getByTestId('import-retro-input').setInputFiles({ name: 'x.retro', mimeType: 'application/octet-stream', buffer: Buffer.from(fileText.replace(/"room":"[^"]+"/, '"room":"Zz3dEfGhIjKlMnOpQrStUv"')) })
  await expect(fresh.getByText(/does not belong|n'appartient pas/)).toBeVisible()
  await ctx.close()
})

test('a full board says so and lets the participant in when a seat frees up', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')

  const ctx = await browser.newContext()
  const bob = await ctx.newPage()
  let attempts = 0
  // The first attempt meets a full room (what the relay sends at its cap), the next one gets in.
  await bob.routeWebSocket(/\/ws2/, (ws) => {
    if (attempts++ === 0) {
      ws.send(JSON.stringify({ t: 'err', code: 'full' }))
      void ws.close({ code: 4008, reason: 'Board is full' })
      return
    }
    ws.connectToServer()
  })
  await bob.goto(link)
  await expect(bob.getByTestId('room-full')).toContainText('30 participants max')
  // Retried after 15 s, not in a tight loop.
  await expect(bob.getByTestId('room-full')).toHaveCount(0, { timeout: 25_000 })
  expect(attempts).toBe(2)
  await ctx.close()
})
