import { expect, test, type Page } from '@playwright/test'
import { axe, closeCompose, column, composeField, createBoard, join, noteByText, publishNote, replicaEnvelopes } from './helpers'

/** change solo-parity-and-dedup: a solo board is the same engine as a shared one, so it has the same toolbar and panels. */
const FEATURES = ['btn-actions', 'btn-export', 'btn-filter', 'btn-presenter', 'btn-options', 'btn-participants', 'btn-profile', 'agenda-ring']

async function startSolo(page: Page, opts: { agenda?: boolean } = {}) {
  await page.goto('/')
  await page.getByTestId('solo').click()
  // Boards start with a running agenda that gates voting: this spec wants a free board, like createBoard.
  const auto = page.getByTestId('agenda-autostart')
  await auto.waitFor({ timeout: 5000 }).catch(() => {})
  if (!opts.agenda && (await auto.count()) && (await auto.isChecked())) await auto.uncheck()
  await page.getByTestId('setup-submit').click()
  await page.getByTestId('name-input').fill('Solo')
  await page.getByTestId('name-save').click()
  await expect(page.getByTestId('board')).toBeVisible()
}

test('a solo board has every board feature a shared board has', async ({ page }) => {
  await startSolo(page)
  for (const id of FEATURES.filter((f) => f !== 'agenda-ring')) await expect(page.getByTestId(id), id).toBeVisible()
  await publishNote(page, 0, 'Solo idea')
  await expect(noteByText(page, 'Solo idea')).toBeVisible()
  // Votes, actions and the results dialog work like on a shared board.
  await page.locator('[data-testid^="vote-"]').first().click()
  await page.getByTestId('btn-actions').click()
  await expect(page.getByTestId('action-text')).toBeVisible()
})

test('a solo board survives a reload and stays in this tab', async ({ page }) => {
  await startSolo(page)
  await publishNote(page, 0, 'Kept')
  const sockets: string[] = []
  page.on('websocket', (ws) => sockets.push(ws.url()))
  await page.reload()
  await expect(noteByText(page, 'Kept')).toBeVisible()
  expect(sockets).toEqual([])
})

test('solo: voting is locked outside the vote phase for the facilitator too, and opens on demand', async ({ page }) => {
  await startSolo(page, { agenda: true })
  await publishNote(page, 0, 'Vote me')
  const note = noteByText(page, 'Vote me')
  // Same locked, labelled state as a participant gets on a shared board (solo-board-parity 1).
  const locked = note.locator('[data-testid^="gated-vote-"]')
  await expect(locked).toBeDisabled()
  await expect(locked).toHaveAttribute('aria-label', /fermé|closed/)
  expect((await axe(page).include('article.note').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  // The facilitator can open voting now instead of waiting for the phase.
  await note.locator('[data-testid^="open-voting-"]').click()
  await expect(locked).toHaveCount(0)
  await note.locator('[data-testid^="vote-"]').first().click()
  await expect(note.locator('[data-testid^="vote-"]').first()).toContainText('1')
})

test('solo: Share offers to make the board shareable, then a second browser joins and sees the notes', async ({ page, browser }) => {
  await startSolo(page)
  await publishNote(page, 0, 'Shared later')
  await page.getByTestId('btn-share').click()
  // No dead link: the invitation does not exist until the owner converts the board.
  await expect(page.getByTestId('share-solo')).toBeVisible()
  await expect(page.getByTestId('share-url')).toHaveCount(0)
  expect((await axe(page).include('[data-testid="share-solo"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.getByTestId('make-shareable').click()
  await expect(page.getByTestId('share-url')).toBeVisible()
  await expect(page.getByTestId('share-room-code')).toBeVisible()
  const link = await page.getByTestId('share-url').inputValue()
  const bob = await join(browser, link, 'Bob')
  await expect(noteByText(bob.page, 'Shared later')).toBeVisible()
  await bob.ctx.close()
})

test('solo: many solo boards all stay solo and never open a socket to the relay', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('retroboard:solo', JSON.stringify(Array.from({ length: 60 }, (_, i) => `filler${i}`))))
  const sockets: string[] = []
  page.on('websocket', (ws) => sockets.push(ws.url()))
  await startSolo(page)
  await publishNote(page, 0, 'Still solo')
  await page.reload()
  await expect(noteByText(page, 'Still solo')).toBeVisible()
  expect(sockets).toEqual([])
})

test('carry-over reads a previous solo board from this browser without the relay', async ({ page }) => {
  await startSolo(page)
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Solo follow-up')
  const stored = await replicaEnvelopes(page)
  await page.getByTestId('action-add').click()
  await expect(page.getByTestId('actions')).toContainText('Solo follow-up')
  // The page shows the action before the browser has committed it to the local copy (about 16 ms, longer when the
  // page is busy painting, as at the 2560 px of the tv project). The next page load reads that copy, so wait for it.
  await expect.poll(() => replicaEnvelopes(page)).toBeGreaterThan(stored)
  await page.keyboard.press('Escape')
  const link = page.url()
  const sockets: string[] = []
  page.on('websocket', (ws) => sockets.push(ws.url()))
  await page.goto('/new')
  await page.getByTestId('mode-advanced').click()
  await page.getByTestId('carry-live-url').fill(link)
  await page.getByTestId('carry-live-fetch').click()
  await expect(page.getByTestId('carry-list')).toContainText('Solo follow-up', { timeout: 10000 })
  expect(sockets).toEqual([])
})

test('an action added just before the tab goes away is still on the board after the next load', async ({ page }) => {
  await startSolo(page)
  const link = page.url()
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Added at the last moment')
  // The page shows an action before the browser has sealed and stored it (about 16 ms, far longer while the main thread
  // is busy painting). Make that gap long and leave the page the instant the action is shown, as closing a tab does.
  await page.evaluate(() => {
    const encrypt = SubtleCrypto.prototype.encrypt
    SubtleCrypto.prototype.encrypt = function (this: SubtleCrypto, ...args: Parameters<SubtleCrypto['encrypt']>) {
      return new Promise<ArrayBuffer>((resolve, reject) => setTimeout(() => encrypt.apply(this, args).then(resolve, reject), 150))
    }
    const watch = new MutationObserver(() => {
      if (!document.querySelector('[data-testid="actions"]')?.textContent?.includes('Added at the last moment')) return
      watch.disconnect()
      location.replace('about:blank')
    })
    watch.observe(document.body, { childList: true, subtree: true, characterData: true })
    ;(document.querySelector('[data-testid="action-add"]') as HTMLButtonElement).click()
  })
  await page.waitForURL('about:blank')
  await page.goto(link)
  await page.getByTestId('btn-actions').click()
  await expect(page.getByTestId('actions')).toContainText('Added at the last moment')
})

test('solo: the participants panel says you are alone and shows no connection mode', async ({ page }) => {
  await startSolo(page)
  await page.getByTestId('btn-participants').click()
  await expect(page.getByTestId('participants-panel')).toBeVisible()
  await expect(page.getByTestId('peer-0')).toBeVisible()
  await expect(page.getByTestId('solo-presence')).toBeVisible()
  await expect(page.getByTestId('links-state')).toHaveCount(0)
  await expect(page.getByTestId('my-conn')).toHaveCount(0)
  expect((await axe(page).include('[data-testid="participants-panel"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
})

/**
 * change solo-board-parity 6: the same scenarios run on a solo board and on a shared one, and what a person can see
 * and do must be identical. The only allowed differences are listed in DECLARED (design.md, "Declared differences").
 */
type Observation = Record<string, string>

/** Observed key -> [solo value, shared value]. Anything else that differs between the two modes is a bug. */
const DECLARED: Record<string, [string, string]> = {}

/** The keys whose values differ between two observations, minus the declared differences. Pure. */
export function drift(solo: Observation, shared: Observation, declared: Record<string, [string, string]> = DECLARED): string[] {
  const keys = [...new Set([...Object.keys(solo), ...Object.keys(shared)])].sort()
  return keys.flatMap((k) => {
    const want = declared[k]
    if (want) return solo[k] === want[0] && shared[k] === want[1] ? [] : [`${k}: declared ${want.join(' / ')}, got ${solo[k]} / ${shared[k]}`]
    return solo[k] === shared[k] ? [] : [`${k}: solo ${solo[k]}, shared ${shared[k]}`]
  })
}

const text = async (page: Page, id: string) => ((await page.getByTestId(id).textContent()) ?? '').replace(/\s+/g, ' ').trim()

/** Whether the writing field takes notes: in the column, or in the bottom sheet on a phone. */
async function composerDisabled(page: Page) {
  const disabled = await (await composeField(page, 0)).isDisabled()
  await closeCompose(page)
  return disabled
}

/** Plays every scenario of the matrix on the board in `page` and records what it observed. */
async function play(page: Page): Promise<Observation> {
  const seen: Observation = {}
  // Write and publish.
  await publishNote(page, 0, 'Matrix idea')
  seen['publish.notes'] = String(await column(page, 0).locator('article.note').count())
  // Vote with no agenda, up to the limit and one past it.
  const vote = noteByText(page, 'Matrix idea').locator('[data-testid^="vote-"]').first()
  await vote.click()
  seen['vote.left.after-one'] = await text(page, 'votes-left')
  await vote.click()
  await vote.click()
  seen['vote.left.at-limit'] = await text(page, 'votes-left')
  seen['vote.button.at-limit'] = (await vote.isDisabled()) ? 'disabled' : 'enabled'
  // Lock: the composer stops taking notes.
  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-lock').check()
  await page.keyboard.press('Escape')
  seen['lock.composer'] = (await composerDisabled(page)) ? 'disabled' : 'enabled'
  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-lock').uncheck()
  await page.keyboard.press('Escape')
  seen['unlock.composer'] = (await composerDisabled(page)) ? 'disabled' : 'enabled'
  // Timer.
  seen['timer.toggle'] = (await page.getByTestId('timer-toggle').isVisible()) ? 'visible' : 'hidden'
  // Actions.
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Matrix action')
  await page.getByTestId('action-add').click()
  seen['actions.added'] = (await page.getByText('Matrix action').count()) > 0 ? 'listed' : 'missing'
  await page.keyboard.press('Escape')
  // Report.
  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-report').click()
  seen['report.dialog'] = (await page.getByTestId('report').isVisible()) ? 'visible' : 'hidden'
  return seen
}

test.describe('parity matrix: the same scenarios, solo and shared', () => {
  test('a solo board and a shared board behave the same, apart from the declared differences', async ({ page, browser }) => {
    await startSolo(page)
    const solo = await play(page)
    const other = await (await browser.newContext()).newPage()
    await createBoard(other, { template: 'start-stop-continue' })
    const shared = await play(other)
    expect(drift(solo, shared), `solo ${JSON.stringify(solo)} shared ${JSON.stringify(shared)}`).toEqual([])
    // Every scenario of the matrix observed something.
    expect(Object.keys(solo).length).toBeGreaterThanOrEqual(9)
  })

  test('the matrix fails on a seeded drift, and a declared difference is the only one it lets through', async () => {
    const base = { 'vote.left.at-limit': '0', 'lock.composer': 'disabled' }
    expect(drift(base, { ...base })).toEqual([])
    expect(drift(base, { ...base, 'lock.composer': 'enabled' })).toEqual(['lock.composer: solo disabled, shared enabled'])
    expect(drift(base, { ...base, extra: 'x' })).toEqual(['extra: solo undefined, shared x'])
    expect(drift({ ...base, invite: 'hidden' }, { ...base, invite: 'shown' }, { invite: ['hidden', 'shown'] })).toEqual([])
    expect(drift({ ...base, invite: 'shown' }, { ...base, invite: 'shown' }, { invite: ['hidden', 'shown'] })).toHaveLength(1)
  })
})
