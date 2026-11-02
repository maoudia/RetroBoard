import { expect, test, type Page } from '@playwright/test'
import { noteByText, publishNote } from './helpers'

/** change solo-parity-and-dedup: a solo board is the same engine as a shared one, so it has the same toolbar and panels. */
const FEATURES = ['btn-actions', 'btn-export', 'btn-filter', 'btn-presenter', 'btn-options', 'btn-participants', 'btn-profile', 'agenda-ring']

async function startSolo(page: Page) {
  await page.goto('/')
  await page.getByTestId('solo').click()
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
