import { expect, test } from '@playwright/test'
import { createBoard, enterName, join, noteByText, publishNote, voteMenu } from './helpers'

async function shareUrl(page: import('@playwright/test').Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

test.describe('rename a participant (facilitator)', () => {
  test.skip(({ isMobile }) => isMobile, 'facilitator menus are covered on desktop')

  test('the new name shows in both lists with the hint, and on their signed notes', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await publishNote(bob.page, 0, 'Signed idea')
    await expect(noteByText(page, 'Signed idea')).toContainText('Bob')

    await page.getByTestId('btn-participants').click()
    const row = page.getByTestId('peers').locator('li', { hasText: 'Bob' })
    await row.getByTestId('role-rename').click()
    await page.getByTestId('rename-input').fill('Sam')
    await page.getByTestId('rename-save').click()

    // The menu closes behind the dialog: open it again.
    await page.getByTestId('btn-participants').click()
    await expect(page.getByTestId('peers').locator('li', { hasText: 'Sam' })).toContainText("nom modifié par l'animateur")
    await expect(noteByText(page, 'Signed idea')).toContainText('Sam')
    // Bob sees it too (on his own board and notes).
    await expect(noteByText(bob.page, 'Signed idea')).toContainText('Sam')
    await bob.page.getByTestId('btn-participants').click()
    await expect(bob.page.getByTestId('peers')).toContainText('Sam')

    // An empty name restores his own.
    await page.getByTestId('peers').locator('li', { hasText: 'Sam' }).getByTestId('role-rename').click()
    await page.getByTestId('rename-input').fill('')
    await page.getByTestId('rename-save').click()
    await expect(noteByText(page, 'Signed idea')).toContainText('Bob')
    await expect(noteByText(page, 'Signed idea')).not.toContainText('Sam')
    await bob.ctx.close()
  })

  test('renaming an anonymous participant never unmasks their anonymous notes', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const url = await shareUrl(page)
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const carl = await ctx.newPage()
    await carl.goto(url)
    await enterName(carl, 'Carl', false)
    await expect(carl.getByTestId('board')).toBeVisible()
    await publishNote(carl, 0, 'Quiet idea')
    await expect(noteByText(page, 'Quiet idea')).toBeVisible()

    await page.getByTestId('btn-participants').click()
    // Anonymous in the list: the row without a name.
    const row = page.getByTestId('peers').locator('li').filter({ hasNotText: 'Alice' }).first()
    await row.getByTestId('role-rename').click()
    await page.getByTestId('rename-input').fill('Dana')
    await page.getByTestId('rename-save').click()

    await page.getByTestId('btn-participants').click()
    await expect(page.getByTestId('peers')).toContainText('Dana')
    await expect(noteByText(page, 'Quiet idea')).not.toContainText('Dana')
    await ctx.close()
  })
})

test.describe('reveal all drafts', () => {
  test.skip(({ isMobile }) => isMobile, 'facilitator toolbar is covered on desktop')

  test('a countdown for everyone, then each person publishes their drafts unless they keep them private', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    const draft = async (p: import('@playwright/test').Page, text: string) => {
      const col = p.locator('section[data-testid^="column-"]').first()
      await col.locator('textarea').fill(text)
      await col.locator('[data-testid^="compose-add-"]').click()
      await expect(col.locator('[data-draft-id]').filter({ hasText: text })).toBeVisible()
    }
    await draft(page, 'Alice draft')
    await draft(bob.page, 'Bob draft')
    await expect(noteByText(page, 'Alice draft')).toHaveCount(0)

    await voteMenu(page, 'reveal-all')
    for (const p of [page, bob.page]) await expect(p.getByTestId('reveal-countdown')).toBeVisible()
    await bob.page.getByTestId('reveal-keep').check()

    // At the deadline Alice's draft lands on the board for both; Bob's stays private.
    await expect(noteByText(page, 'Alice draft')).toBeVisible({ timeout: 15_000 })
    await expect(noteByText(bob.page, 'Alice draft')).toBeVisible()
    await expect(page.getByTestId('reveal-countdown')).toHaveCount(0)
    await expect(noteByText(page, 'Bob draft')).toHaveCount(0)
    await expect(bob.page.locator('[data-draft-id]').filter({ hasText: 'Bob draft' })).toBeVisible()
    await bob.ctx.close()
  })

  test('only a facilitator sees the button on a one-facilitator board', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await expect(page.getByTestId('votebar-more')).toBeVisible()
    await expect(bob.page.getByTestId('votebar-more')).toHaveCount(0)
    await bob.ctx.close()
  })
})
