import { expect, type Page, test } from '@playwright/test'
import { createBoard, cursorsOn, enterName, join, noteByText, publishNote } from './helpers'

// Shared pointers are paused behind a feature flag (change cursors-off-for-now). These specs run on the default build (flag off);
// presence.spec.ts, takeover.spec.ts and presenter-focus.spec.ts keep the cursor specs alive on the flag-on build (pnpm e2e:cursors).
test.skip(cursorsOn, 'flag-on build: the cursor specs run instead')

/** Counts what each page writes on its "live" data channels (cursors and focus travel there) and keeps every frame size. */
const countLiveFrames = (page: Page) => page.addInitScript(() => {
  const w = window as unknown as { __live: number }
  w.__live = 0
  const send = RTCDataChannel.prototype.send
  RTCDataChannel.prototype.send = function (this: RTCDataChannel, data: never) {
    if (this.label === 'live') w.__live++
    return send.call(this, data)
  }
})
const liveFrames = (page: Page) => page.evaluate(() => (window as unknown as { __live: number }).__live)

test('with the flag off nobody sees a pointer and none is sent, even when the stored setting says share', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'pointers are a desktop signal; the phone project has no mouse')
  // Alice's stored profile says "share my pointer" and "show others' pointers" (the default before the pause).
  await page.addInitScript(() => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ uiMode: 'advanced', shareCursor: true, showCursors: true })) } catch { /* ignore */ } })
  await countLiveFrames(page)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 1, 'Pointer target')
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const bob = await ctx.newPage()
  await countLiveFrames(bob)
  await bob.goto(url)
  await enterName(bob, 'Bob')
  await expect(noteByText(bob, 'Pointer target')).toBeVisible()

  // The settings are not offered.
  await page.getByTestId('btn-profile').click()
  await expect(page.getByTestId('profile-show')).toBeVisible()
  await expect(page.getByTestId('set-share-cursor')).toHaveCount(0)
  await expect(page.getByTestId('set-show-cursors')).toHaveCount(0)
  await page.keyboard.press('Escape')

  // Alice moves over the note, Bob moves too: nothing is drawn and no pointer frame is produced on the direct links.
  await page.waitForTimeout(1_500)
  const before = await liveFrames(page)
  const box = (await noteByText(page, 'Pointer target').boundingBox())!
  await page.mouse.move(box.x + 20, box.y + 20)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 })
  const bbox = (await bob.getByTestId('board').boundingBox())!
  await bob.mouse.move(bbox.x + 200, bbox.y + 200)
  await bob.mouse.move(bbox.x + 260, bbox.y + 240, { steps: 8 })
  await page.waitForTimeout(1_000)
  await expect(page.locator('[data-testid^="cursor-"]')).toHaveCount(0)
  await expect(bob.locator('[data-testid^="cursor-"]')).toHaveCount(0)
  expect(await liveFrames(page)).toBe(before)

  await ctx.close()
})

test('with the flag off the other presence stays: the typing status shows in the participants menu', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'covered on desktop; the menu is the same on phones')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, url, 'Bob')
  const col = bob.page.locator('section[data-testid^="column-"]').first()
  const title = (await col.getByTestId('column-title').textContent())!.trim()
  await col.locator('textarea').click()
  await col.locator('textarea').pressSequentially('Une idée', { delay: 20 })
  await page.getByTestId('btn-participants').click()
  const row = page.locator('li[data-testid^="peer-"]', { hasText: 'Bob' })
  await expect(row.locator('[data-testid^="peer-status-"]')).toHaveText(`écrit dans ${title}`)
  await bob.ctx.close()
})

test('with the flag off the presenter has no laser pointer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'presenter mode is for large screens')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-presenter').click()
  await expect(page.getByTestId('presenter-focus')).toBeVisible()
  await expect(page.getByTestId('focus-laser')).toHaveCount(0)
})

test('with the flag off the landing does not offer live cursors', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#features h3', { hasText: 'Live cursors' })).toHaveCount(0)
})
