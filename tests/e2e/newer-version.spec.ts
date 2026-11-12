import { type Browser, expect, type Page, test } from '@playwright/test'
import { envelopeAad, PROTOCOL_VERSION } from '../../packages/protocol/src'
import { signEvent } from '../../packages/application/src'
import { deriveContentKey, fromBase64Url, seal, signingKeyPair, sign, toBase64Url, utf8 } from '../../packages/crypto/src'
import type { EventBody } from '../../packages/domain/src'
import { axe, createBoard, enterName, noteByText, publishNote, settle } from './helpers'

/**
 * A deploy during a retro (deploy-safe-sessions): a participant already runs the newer version and writes a command this tab
 * does not know. The tab keeps the event, tells the participant to reload, and the board is not disturbed meanwhile.
 */

async function shareUrl(page: Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

/** A correctly sealed and signed `env` frame whose command no version of this build knows. */
async function newerVersionFrame(boardUrl: string, n = 0): Promise<string> {
  const compact = /^#c=([A-Za-z0-9_-]{22})([A-Za-z0-9_-]{22})/.exec(new URL(boardUrl).hash)!
  const [room, roomKey] = [compact[1]!, compact[2]!]
  const contentKey = await deriveContentKey(fromBase64Url(roomKey)!, room)
  const pair = await signingKeyPair()
  const author = { publicKey: toBase64Url(pair.publicKey), sign: async (m: string) => toBase64Url(await sign(pair.privateKey, utf8(m))) }
  const body = { t: 'cmd', cmd: { t: 'future.command', value: 1 }, name: null, showName: false } as unknown as EventBody
  const event = await signEvent(author, room, { id: `01JFUTURE${n}${'X'.repeat(16)}`, at: Date.now(), body })
  const head = { v: PROTOCOL_VERSION, room, id: event.id, hlc: event.at } as const
  const env = { ...head, ct: toBase64Url(await seal(contentKey, utf8(JSON.stringify(event)), utf8(envelopeAad(head)))) }
  return JSON.stringify({ t: 'env', envs: [env] })
}

/** Bob's relay socket, which the test can speak through as the relay would. */
async function joinWithRelayHandle(browser: Browser, url: string, scheme: 'light' | 'dark', locale: string) {
  const ctx = await browser.newContext({ colorScheme: scheme, reducedMotion: 'reduce', locale })
  const relay: { send: (frame: string) => void } = { send: () => {} }
  await ctx.routeWebSocket(/\/ws2/, (ws) => {
    const server = ws.connectToServer()
    ws.onMessage((m) => server.send(m))
    server.onMessage((m) => ws.send(m))
    relay.send = (frame) => ws.send(frame)
  })
  const page = await ctx.newPage()
  await page.addInitScript((variant) => {
    try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant })) } catch { /* ignore */ }
  }, scheme)
  await page.goto(url)
  await enterName(page, 'Bob')
  await expect(page.getByTestId('board')).toBeVisible()
  return { ctx, page, relay }
}

for (const scheme of ['light', 'dark'] as const) {
  test(`an event of a newer version offers a reload, once, and the banner passes axe (${scheme})`, async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Before the deploy')
    const url = await shareUrl(page)
    const bob = await joinWithRelayHandle(browser, url, scheme, 'en-US')
    await expect(noteByText(bob.page, 'Before the deploy')).toBeVisible()
    await expect(bob.page.getByTestId('newer-version')).toBeHidden()

    bob.relay.send(await newerVersionFrame(url, 1))
    const banner = bob.page.getByTestId('newer-version')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('newer version')

    // A second event does not stack a second banner, and the board keeps working.
    bob.relay.send(await newerVersionFrame(url, 2))
    await publishNote(page, 1, 'After the deploy')
    await expect(noteByText(bob.page, 'After the deploy')).toBeVisible()
    await expect(banner).toHaveCount(1)

    await settle(bob.page)
    const result = await axe(bob.page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])

    // "Reload" reloads the page.
    await bob.page.evaluate(() => { (window as unknown as { stayed: boolean }).stayed = true })
    await bob.page.getByTestId('newer-version-reload').click()
    await expect.poll(() => bob.page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed ?? false)).toBe(false)
    await bob.ctx.close()
  })
}

test('the banner speaks French on a French browser', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const url = await shareUrl(page)
  const bob = await joinWithRelayHandle(browser, url, 'light', 'fr-FR')
  bob.relay.send(await newerVersionFrame(url))
  await expect(bob.page.getByTestId('newer-version')).toContainText('version plus récente')
  await expect(bob.page.getByTestId('newer-version-reload')).toHaveText('Recharger')
  await bob.ctx.close()
})
