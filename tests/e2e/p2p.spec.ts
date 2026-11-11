import { type Browser, expect, test } from '@playwright/test'
import { boardFileAad, envelopeAad, PROTOCOL_VERSION } from '../../packages/protocol/src'
import { signEvent } from '../../packages/application/src'
import { deriveContentKey, deriveFileKey, fromBase64Url, seal, signingKeyPair, sign, toBase64Url, utf8 } from '../../packages/crypto/src'
import { createBoard, enterName, noteByText, publishNote, replicaEnvelopes } from './helpers'

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

/** A board file of `count` chat lines by ten participants, clocked just ahead of now (a rate limit would ignore a burst of one author). */
async function longHistoryFile(boardUrl: string, count: number): Promise<string> {
  const hash = new URL(boardUrl).hash
  const compact = /^#c=([A-Za-z0-9_-]{22})([A-Za-z0-9_-]{22})/.exec(hash)!
  const [room, roomKey] = [compact[1]!, compact[2]!]
  const contentKey = await deriveContentKey(fromBase64Url(roomKey)!, room)
  const authors = await Promise.all(Array.from({ length: 10 }, async () => {
    const pair = await signingKeyPair()
    return { publicKey: toBase64Url(pair.publicKey), sign: async (m: string) => toBase64Url(await sign(pair.privateKey, utf8(m))) }
  }))
  const start = Date.now()
  const envs = await Promise.all(Array.from({ length: count }, async (_, i) => {
    const id = `01J${i.toString(36).toUpperCase().padStart(6, '0')}${'X'.repeat(17)}`
    const event = await signEvent(authors[i % authors.length]!, room, { id, at: start + i, body: { t: 'cmd', cmd: { t: 'chat.post', text: `history ${i}` }, name: null, showName: false } })
    const head = { v: PROTOCOL_VERSION, room, id, hlc: event.at } as const
    return { ...head, ct: toBase64Url(await seal(contentKey, utf8(JSON.stringify(event)), utf8(envelopeAad(head)))) }
  }))
  const ct = await seal(await deriveFileKey(contentKey, room), utf8(JSON.stringify(envs)), utf8(boardFileAad(room)))
  return JSON.stringify({ format: 'retro/1', room, ct: toBase64Url(ct) })
}

/** Snapshot records of the local replica of the page (ciphertext): present once the board was opened from a snapshot. */
const storedSnapshots = (page: import('@playwright/test').Page) => page.evaluate(() => new Promise<number>((resolve) => {
  const open = indexedDB.open('retroboard-replica')
  open.onerror = () => resolve(0)
  open.onsuccess = () => {
    const all = open.result.transaction('envelopes').objectStore('envelopes').getAll()
    all.onsuccess = () => resolve((all.result as { id: string }[]).filter((r) => r.id.startsWith('snap:')).length)
    all.onerror = () => resolve(0)
  }
}))

test('a late joiner opens a long board from the facilitator snapshot and keeps collaborating', async ({ browser }) => {
  // The facilitator signs a snapshot as soon as a few hundred events exist (the threshold is lowered for the test).
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => localStorage.setItem('retroboard:snapshot', JSON.stringify({ every: 200, lagMs: 0 })))
  const alice = await ctx.newPage()
  // A complete mesh keeps board events off the relay: nothing Alice imports reaches it, so the history can only come from her.
  await alice.routeWebSocket(/\/ws2/, (ws) => {
    const server = ws.connectToServer()
    ws.onMessage((m) => { if (!String(m).startsWith('{"t":"pub"')) server.send(m) })
    server.onMessage((m) => ws.send(m))
    ws.onClose((code, reason) => server.close({ code, reason }))
    server.onClose((code, reason) => ws.close({ code, reason }))
  })
  await createBoard(alice, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(alice, 0, 'Before the long history')
  const url = await shareUrl(alice)
  const file = await longHistoryFile(alice.url(), 320)
  await alice.getByTestId('btn-export').click()
  await alice.getByTestId('import-retro-input').setInputFiles({ name: 'history.retro', mimeType: 'application/octet-stream', buffer: Buffer.from(file) })
  await expect.poll(() => replicaEnvelopes(alice), { timeout: 15_000 }).toBeGreaterThan(300)
  await alice.keyboard.press('Escape')
  // The snapshot is signed a couple of seconds after the board settles.
  await alice.waitForTimeout(3_000)

  const bob = await joinRecorded(browser, url, 'Bob')
  await expect(noteByText(bob.page, 'Before the long history')).toBeVisible()
  await bob.page.getByTestId('btn-participants').click()
  await expect(bob.page.getByTestId('links-state')).toHaveAttribute('data-p2p', 'true')
  await bob.page.keyboard.press('Escape')
  // Bob stored the snapshot, and only the events after its cut: not the whole history.
  await expect.poll(() => storedSnapshots(bob.page), { timeout: 15_000 }).toBe(1)
  expect(await replicaEnvelopes(bob.page)).toBeLessThan(200)
  expect(relayPubs(bob.sent)).toBe(0)

  // He takes part: his note reaches Alice, hers reaches him.
  await publishNote(bob.page, 1, 'From the late joiner')
  await expect(noteByText(alice, 'From the late joiner')).toBeVisible()
  await publishNote(alice, 2, 'From the facilitator')
  await expect(noteByText(bob.page, 'From the facilitator')).toBeVisible()
  await bob.ctx.close()
  await ctx.close()
})
