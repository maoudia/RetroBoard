import { expect, test } from '@playwright/test'
import { createBoard, noteByText, publishNote } from './helpers'

/** The static host may add a trailing slash to /board: the fragment is what identifies the board. */
const sameBoard = (url: string) => new RegExp(`/board/?#${url.split('#')[1]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)

const alive = async (page: import('@playwright/test').Page, text: string) => {
  await expect(page.getByTestId('board-waiting')).toHaveCount(0)
  await expect(noteByText(page, text)).toBeVisible({ timeout: 15_000 })
}

test.describe('the board survives history navigation (#222)', () => {
  test('logo link to the landing page, then the browser back button', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Keep me')
    const board = page.url()
    await page.getByRole('link', { name: /accueil/i }).first().click()
    await expect(page).not.toHaveURL(board)
    await page.goBack()
    await expect(page).toHaveURL(sameBoard(board))
    await alive(page, 'Keep me')
  })

  test('back twice to the landing page, forward twice', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Keep me')
    const board = page.url()
    await page.goBack()
    await page.goBack().catch(() => undefined)
    await page.goForward()
    await page.goForward().catch(() => undefined)
    await expect(page).toHaveURL(sameBoard(board))
    await alive(page, 'Keep me')
  })

  test('back, then reload, then forward', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Keep me')
    const board = page.url()
    await page.goBack()
    await page.reload()
    await page.goForward()
    await expect(page).toHaveURL(sameBoard(board))
    await alive(page, 'Keep me')
  })

  test('the board link opened again in a new tab of the same browser, nobody else online', async ({ page, context }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Keep me')
    const board = page.url()
    await page.close()
    const again = await context.newPage()
    await again.goto(board)
    await alive(again, 'Keep me')
  })

  test('navigate to another page of the app and back to the board with the browser button', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Keep me')
    const board = page.url()
    await page.goto('/new')
    await page.goBack()
    await expect(page).toHaveURL(sameBoard(board))
    await alive(page, 'Keep me')
  })
})

test.describe('leaving right after an action does not lose it', () => {
  test('a full page load right after publishing, then back', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const board = page.url()
    const col = page.locator('section[data-testid^="column-"]').first()
    await col.locator('textarea').fill('Quick one')
    await col.locator('[data-testid^="compose-add-"]').click()
    await col.locator('[data-testid^="publish-"]').click()
    await page.goto('/new') // no wait: the replica write may still be pending
    await page.goBack()
    await expect(page).toHaveURL(sameBoard(board))
    await alive(page, 'Quick one')
  })

  test('a board created and left at once opens again', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const board = page.url()
    await page.goto('/')
    await page.goBack()
    await expect(page).toHaveURL(sameBoard(board))
    await expect(page.getByTestId('board-waiting')).toHaveCount(0)
    await expect(page.getByTestId('board')).toBeVisible({ timeout: 15_000 })
  })
})

test('going back from the board to the creation page offers the way back to it (#222)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
  await publishNote(page, 0, 'Keep me')
  const board = page.url()
  await page.goBack()
  await expect(page).toHaveURL(/\/new/)
  const link = page.getByTestId('new-resume').getByRole('link', { name: /Sprint 42/ })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(sameBoard(board))
  await alive(page, 'Keep me')
})
