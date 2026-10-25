import { type Browser, expect, test } from '@playwright/test'
import { createBoard, enterName, noteByText, publishNote } from './helpers'

async function shareUrl(page: import('@playwright/test').Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

/** A participant whose relay frames are recorded; `p2p: false` is the "relay only" setting. */
async function joinRecorded(browser: Browser, url: string, name: string, p2p = true) {
  const ctx = await browser.newContext()
  if (!p2p) await ctx.addInitScript(() => localStorage.setItem('retroboard:settings', JSON.stringify({ p2p: false })))
  const page = await ctx.newPage()
  const sent: string[] = []
  page.on('websocket', (ws) => ws.on('framesent', (f) => sent.push(String(f.payload))))
  await page.goto(url)
  await enterName(page, name)
  await expect(page.getByTestId('board')).toBeVisible()
  return { ctx, page, sent }
}

const relayPubs = (frames: string[]) => frames.filter((f) => f.startsWith('{"t":"pub"')).length

test('board events travel peer to peer: the relay only carries signalling and presence', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Before Bob')
  const bob = await joinRecorded(browser, await shareUrl(page), 'Bob')
  // History comes from Alice's browser: the relay holds no board events.
  await expect(noteByText(bob.page, 'Before Bob')).toBeVisible()
  await bob.page.getByTestId('btn-participants').click()
  await expect(bob.page.getByTestId('links-state')).toHaveAttribute('data-p2p', 'true')
  await bob.page.keyboard.press('Escape')

  await publishNote(bob.page, 1, 'From Bob')
  await expect(noteByText(page, 'From Bob')).toBeVisible()
  expect(relayPubs(bob.sent)).toBe(0)
  expect(bob.sent.some((f) => f.startsWith('{"t":"sig"'))).toBe(true)
  await bob.ctx.close()
})

test('a relay-only participant still collaborates, through the bridge', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Seen by Carol')
  const carol = await joinRecorded(browser, await shareUrl(page), 'Carol', false)
  await expect(noteByText(carol.page, 'Seen by Carol')).toBeVisible()
  await carol.page.getByTestId('btn-participants').click()
  await expect(carol.page.getByTestId('links-state')).toHaveAttribute('data-p2p', 'false')
  await carol.page.keyboard.press('Escape')

  await publishNote(carol.page, 2, 'From Carol')
  await expect(noteByText(page, 'From Carol')).toBeVisible()
  await publishNote(page, 1, 'Back to Carol')
  await expect(noteByText(carol.page, 'Back to Carol')).toBeVisible()
  expect(carol.sent.some((f) => f.startsWith('{"t":"sig"'))).toBe(false)
  await carol.ctx.close()
})

test('three participants: everyone links to everyone and sees every note', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const url = await shareUrl(page)
  const bob = await joinRecorded(browser, url, 'Bob')
  const carol = await joinRecorded(browser, url, 'Carol')
  // The relay carries a board event while a link is still missing (ADR-0024): publish once all links are open.
  await carol.page.getByTestId('btn-participants').click()
  await expect(carol.page.getByTestId('links-state')).toContainText('2')
  await carol.page.keyboard.press('Escape')
  await bob.page.getByTestId('btn-participants').click()
  await expect(bob.page.getByTestId('links-state')).toContainText('2')
  await bob.page.keyboard.press('Escape')
  bob.sent.length = 0
  carol.sent.length = 0
  await publishNote(carol.page, 0, 'Carol idea')
  await publishNote(bob.page, 1, 'Bob idea')
  for (const p of [page, bob.page, carol.page]) {
    await expect(noteByText(p, 'Carol idea')).toBeVisible()
    await expect(noteByText(p, 'Bob idea')).toBeVisible()
  }
  await carol.page.getByTestId('btn-participants').click()
  await expect(carol.page.getByTestId('links-state')).toContainText('2')
  expect(relayPubs(bob.sent) + relayPubs(carol.sent)).toBe(0)
  await bob.ctx.close()
  await carol.ctx.close()
})
