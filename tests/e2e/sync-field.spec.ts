import { type Browser, expect, type Page, test } from '@playwright/test'
import { createBoard, enterName, noteByText, publishNote, settle } from './helpers'

/**
 * Field scenarios of reliable-board-sync (ADR-0024): peers that cannot open a direct link, a connection
 * that drops, and a reload right after publishing. localhost opens every WebRTC link, so the failures
 * of real networks are produced here on purpose.
 */

async function shareUrl(page: Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

async function joinAs(browser: Browser, url: string, name: string, opts: { noWebRtc?: boolean; flaky?: boolean } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  // A relay connection the test can cut and keep cut (context.setOffline leaves open sockets alone).
  const net = { down: false, close: () => {} }
  if (opts.flaky) {
    await ctx.routeWebSocket(/\/ws2/, (ws) => {
      if (net.down) { void ws.close(); return }
      const server = ws.connectToServer()
      ws.onMessage((m) => server.send(m))
      server.onMessage((m) => ws.send(m))
      net.close = () => { void ws.close(); void server.close() }
    })
  }
  // A browser without WebRTC (privacy extension, locked-down network): no direct link at all.
  if (opts.noWebRtc) await ctx.addInitScript(() => { delete (window as { RTCPeerConnection?: unknown }).RTCPeerConnection })
  const page = await ctx.newPage()
  await page.goto(url)
  await enterName(page, name)
  await expect(page.getByTestId('board')).toBeVisible()
  return { ctx, page, net }
}

test('a participant without WebRTC sees every note and publishes to everyone', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const url = await shareUrl(page)
  const bob = await joinAs(browser, url, 'Bob')
  const carol = await joinAs(browser, url, 'Carol', { noWebRtc: true })

  await publishNote(page, 0, 'From Alice')
  await expect(noteByText(carol.page, 'From Alice')).toBeVisible()
  await publishNote(carol.page, 1, 'From Carol')
  await expect(noteByText(page, 'From Carol')).toBeVisible()
  await expect(noteByText(bob.page, 'From Carol')).toBeVisible()
  await bob.ctx.close()
  await carol.ctx.close()
})

test('a connection that drops: the board stays editable and nothing is lost or doubled', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const url = await shareUrl(page)
  // Bob has no direct link: the relay is his only path, so a cut connection is a real outage.
  const bob = await joinAs(browser, url, 'Bob', { noWebRtc: true, flaky: true })
  await publishNote(bob.page, 0, 'Before the drop')
  await expect(noteByText(page, 'Before the drop')).toBeVisible()
  await settle(bob.page)

  bob.net.down = true
  bob.net.close()
  await expect(bob.page.getByTestId('offline')).toBeVisible({ timeout: 30_000 })
  // Still editable: the note is written locally and waits for a connection.
  await publishNote(bob.page, 1, 'Written offline')
  bob.net.down = false

  await expect(noteByText(page, 'Written offline')).toBeVisible({ timeout: 30_000 })
  await expect(noteByText(page, 'Before the drop')).toHaveCount(1)
  await expect(noteByText(page, 'Written offline')).toHaveCount(1)
  await expect(noteByText(bob.page, 'Written offline')).toHaveCount(1)
  await bob.ctx.close()
})

test('the facilitator reloads right after publishing: the note is still there', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-share').click()
  await page.keyboard.press('Escape')
  const col = page.locator('section[data-testid^="column-"]').first()
  await col.locator('textarea').fill('Survives the reload')
  await col.locator('[data-testid^="compose-add-"]').click()
  await col.locator('[data-testid^="publish-"]').click()
  await expect(noteByText(page, 'Survives the reload')).toBeVisible()
  await page.reload()
  await expect(noteByText(page, 'Survives the reload')).toBeVisible({ timeout: 15_000 })
})

test('three browsers, one without WebRTC, converge on the same board', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const url = await shareUrl(page)
  const bob = await joinAs(browser, url, 'Bob')
  const carol = await joinAs(browser, url, 'Carol', { noWebRtc: true })

  await publishNote(page, 0, 'A1')
  await publishNote(bob.page, 0, 'B1')
  await publishNote(carol.page, 0, 'C1')
  await publishNote(bob.page, 1, 'B2')
  for (const p of [page, bob.page, carol.page]) {
    for (const text of ['A1', 'B1', 'C1', 'B2']) await expect(noteByText(p, text)).toHaveCount(1, { timeout: 20_000 })
  }
  await bob.ctx.close()
  await carol.ctx.close()
})
