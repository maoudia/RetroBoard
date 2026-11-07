import { expect, type Page, test } from '@playwright/test'
import { axe, createBoard, join, settle } from './helpers'

const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}

test('participants chat on the board; the unread badge, the clear button and the panel follow (change board-chat)', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const { page: bob, ctx } = await join(browser, await shareLink(page), 'Bob')

  // Alice opens the chat and writes; Bob sees an unread badge, opens and reads it.
  await page.getByTestId('btn-chat').click()
  await expect(page.getByTestId('chat-panel')).toBeVisible()
  await expect(page.getByTestId('chat-input')).toBeFocused()
  await page.getByTestId('chat-input').fill('Hello team')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-input')).toHaveValue('')
  await expect(page.getByTestId('chat-log')).toContainText('Hello team')
  await expect(bob.getByTestId('chat-unread')).toHaveText('1')
  await bob.getByTestId('btn-chat').click()
  await expect(bob.getByTestId('chat-log')).toContainText('Alice')
  await expect(bob.getByTestId('chat-log')).toContainText('Hello team')
  await expect(bob.getByTestId('chat-unread')).toHaveCount(0)

  // Enter sends, Shift+Enter does not; an empty message cannot be sent.
  await expect(bob.getByTestId('chat-send')).toBeDisabled()
  await bob.getByTestId('chat-input').fill('Hi Alice')
  await bob.getByTestId('chat-input').press('Enter')
  await expect(page.getByTestId('chat-log')).toContainText('Hi Alice')
  await expect(page.getByTestId('chat-unread')).toHaveCount(0)

  // Accessibility of the open panel (once its entrance animation is over: axe reads half-faded colours otherwise).
  await settle(page)
  const found = (await axe(page).include('[data-testid="chat-panel"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes[0]?.target}: ${v.nodes[0]?.failureSummary}`)
  expect(found).toEqual([])

  // Only the facilitator clears, and everyone sees it empty.
  await expect(bob.getByTestId('chat-clear')).toHaveCount(0)
  await page.getByTestId('chat-clear').click()
  await page.getByTestId('confirm').click()
  await expect(page.getByTestId('chat-log')).toContainText('Aucun message')
  await expect(bob.getByTestId('chat-log')).toContainText('Aucun message')

  // Escape closes the panel.
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('chat-panel')).toHaveCount(0)
  await ctx.close()
})

test('the chat is a lateral drawer on a phone that fits the screen (change board-chat)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-chat').scrollIntoViewIfNeeded()
  await page.getByTestId('btn-chat').click()
  await expect(async () => {
    const box = (await page.getByTestId('chat-panel').boundingBox())!
    expect(box.width).toBeGreaterThan(360)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  }).toPass()
  await page.getByTestId('chat-input').fill('From my phone')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-log')).toContainText('From my phone')
  await page.getByTestId('chat-close').click()
  await expect(page.getByTestId('chat-panel')).toHaveCount(0)
})

test('the chat floats: it never moves the columns, slides to the other side, shrinks to a bubble with the unread count (change toast-notifications-v2)', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', keepShare: true })
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, link, 'Bob')
  const col = page.locator('section[data-testid^="column-"]').first()
  await expect(page.getByTestId('btn-chat')).toBeVisible()
  // Let the layout settle after Bob joined (toolbar presence), then measure.
  let before = (await col.boundingBox())!
  await expect(async () => {
    await page.waitForTimeout(400)
    const now = (await col.boundingBox())!
    const stable = Math.abs(now.y - before.y) < 0.5 && Math.abs(now.height - before.height) < 0.5
    before = now
    expect(stable).toBe(true)
  }).toPass({ timeout: 10_000 })
  await page.getByTestId('btn-chat').click()
  await expect(page.getByTestId('chat-panel')).toBeVisible()
  await expect(page.getByTestId('chat-people')).toContainText('Bob')
  const after = (await col.boundingBox())!
  expect(Math.abs(after.y - before.y)).toBeLessThan(1)
  expect(Math.abs(after.height - before.height)).toBeLessThan(1)
  const right = (await page.getByTestId('chat-panel').boundingBox())!
  await page.getByTestId('chat-flip').click()
  await expect(async () => expect((await page.getByTestId('chat-panel').boundingBox())!.x).toBeLessThan(right.x)).toPass()
  await page.getByTestId('chat-minimize').click()
  await expect(page.getByTestId('chat-bubble')).toBeVisible()
  await bob.page.getByTestId('btn-chat').click()
  await bob.page.getByTestId('chat-input').fill('Ping')
  await bob.page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-bubble-unread')).toHaveText('1')
  await page.getByTestId('chat-bubble').click()
  await expect(page.getByTestId('chat-log')).toContainText('Ping')
  await bob.ctx.close()
})
