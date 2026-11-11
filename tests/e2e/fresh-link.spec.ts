import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

async function shareUrl(page: import('@playwright/test').Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

const hashOf = (page: import('@playwright/test').Page) => new URL(page.url()).hash

/** The people menu row of a participant, with the menu open. */
async function peerRow(page: import('@playwright/test').Page, name: string) {
  await page.getByTestId('btn-participants').click()
  return page.getByTestId('peers').locator('li', { hasText: name })
}

test.describe('move the team to a fresh link (facilitator-moderation)', () => {
  test.skip(({ isMobile }) => isMobile, 'facilitator menus are covered on desktop')

  test('removes Carol and moves Alice and Bob to a new link with the same board; Carol is out and the old link holds nothing', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const oldUrl = await shareUrl(page)
    const bob = await join(browser, oldUrl, 'Bob')
    const carol = await join(browser, oldUrl, 'Carol')
    await publishNote(page, 0, 'Before the move')
    await publishNote(bob.page, 0, 'Bob idea')
    await expect(noteByText(carol.page, 'Bob idea')).toBeVisible()
    // Everybody's presence (with the key the new link is sealed to) has reached the facilitator.
    await expect(page.getByTestId('peer-count')).toHaveText('3')

    const row = await peerRow(page, 'Carol')
    await row.getByTestId('role-remove').click()
    await expect(page.getByTestId('remove-reach')).toContainText('1')
    await page.getByTestId('remove-move').click()

    // Alice's tab opens the new room: another link that names the signing room of the first, the same notes, still the facilitator.
    await expect(page).toHaveURL(/#r=.+&k=.+&f=.+&d=/, { timeout: 20_000 })
    expect(hashOf(page)).not.toBe(new URL(oldUrl).hash)
    await expect(page.getByTestId('board')).toBeVisible()
    await expect(noteByText(page, 'Before the move')).toBeVisible()
    await expect(noteByText(page, 'Bob idea')).toBeVisible()
    await expect(page.getByTestId('btn-share')).toBeVisible()

    // Bob is sent the participant link and lands on the same board, without the facilitator secret.
    await expect(bob.page).toHaveURL(/#r=.+&k=.+&d=/, { timeout: 20_000 })
    expect(hashOf(bob.page)).not.toContain('&f=')
    await expect(bob.page.getByTestId('board')).toBeVisible()
    await expect(noteByText(bob.page, 'Before the move')).toBeVisible()
    await expect(noteByText(bob.page, 'Bob idea')).toBeVisible()

    // The new room works both ways: authors and signatures carried over, new notes cross.
    await publishNote(bob.page, 0, 'After the move')
    await expect(noteByText(page, 'After the move')).toBeVisible()
    await publishNote(page, 0, 'Alice after')
    await expect(noteByText(bob.page, 'Alice after')).toBeVisible()
    await expect(noteByText(page, 'Bob idea')).toContainText('Bob')

    // Carol is out: the removed page, no board, and she is never sent the link.
    await expect(carol.page.getByTestId('board-removed')).toBeVisible({ timeout: 20_000 })
    await expect(carol.page.getByTestId('board')).toHaveCount(0)
    expect(hashOf(carol.page)).toBe(new URL(oldUrl).hash)
    await carol.page.reload()
    await expect(carol.page.getByTestId('board-removed')).toBeVisible()
    await expect(carol.page.getByTestId('board')).toHaveCount(0)

    // Somebody who opens the old link now (the removed person under a new identity, say) finds no board.
    const late = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const lateTab = await late.newPage()
    await lateTab.goto(oldUrl)
    // Closed for anyone who sees the closing (the relay still holds it for a while), empty for a room it has forgotten.
    await expect(lateTab.getByTestId('board-closed').or(lateTab.getByTestId('board-waiting'))).toBeVisible({ timeout: 20_000 })
    await expect(lateTab.getByTestId('board')).toHaveCount(0)
    await expect(lateTab.locator('article.note')).toHaveCount(0)

    await late.close()
    await bob.ctx.close()
    await carol.ctx.close()
  })

  test('"Remove only" ends the session without moving anybody', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const url = await shareUrl(page)
    const bob = await join(browser, url, 'Bob')
    const carol = await join(browser, url, 'Carol')
    await expect(page.getByTestId('peer-count')).toHaveText('3')
    const row = await peerRow(page, 'Carol')
    await row.getByTestId('role-remove').click()
    await page.getByTestId('remove-only').click()

    await expect(carol.page.getByTestId('board-removed')).toBeVisible({ timeout: 20_000 })
    // Nobody else moved: same link, same board.
    expect(hashOf(page)).not.toContain('&d=')
    expect(hashOf(bob.page)).toBe(new URL(url).hash)
    await expect(page.getByTestId('board')).toBeVisible()
    await expect(bob.page.getByTestId('board')).toBeVisible()
    await bob.ctx.close()
    await carol.ctx.close()
  })

  test('only the facilitator is offered the removal', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await expect(page.getByTestId('peer-count')).toHaveText('2')
    await bob.page.getByTestId('btn-participants').click()
    await expect(bob.page.getByTestId('peers')).toBeVisible()
    await expect(bob.page.getByTestId('role-remove')).toHaveCount(0)
    await bob.ctx.close()
  })
})
