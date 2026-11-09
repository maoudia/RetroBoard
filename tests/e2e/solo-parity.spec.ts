import { expect, test, type Page } from '@playwright/test'
import { axe, join, noteByText, publishNote } from './helpers'

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
  await page.getByTestId('action-add').click()
  await expect(page.getByTestId('actions')).toContainText('Solo follow-up')
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
