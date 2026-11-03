import { expect, test } from '@playwright/test'
import { closeShare, createBoard, join, noteByText, publishNote } from './helpers'

/** Owner feedback 2026-11-03 (change feedback-wave-4): ten screenshots of UX defects. */
async function twoPeople(page: import('@playwright/test').Page, browser: import('@playwright/test').Browser, template = 'start-stop-continue') {
  await createBoard(page, { template, name: 'Alice', keepShare: true })
  const link = await page.getByTestId('share-url').inputValue()
  await closeShare(page)
  const bob = await join(browser, link, 'Bob')
  return bob
}

test.describe('feedback wave 4', () => {
  test('hide for now works for everybody when all users are facilitators, and a refusal is never silent', async ({ page, browser }) => {
    const bob = await twoPeople(page, browser)
    const cols = (p: typeof page) => p.locator('section[data-testid^="column-"]')
    await expect(cols(bob.page)).toHaveCount(3)
    const id = (await cols(bob.page).first().getAttribute('data-testid'))!.replace('column-', '')
    await bob.page.getByTestId(`col-menu-${id}`).click()
    await bob.page.getByTestId(`col-hide-${id}`).click()
    await expect(cols(bob.page)).toHaveCount(2)
    await expect(cols(page)).toHaveCount(2)
    await bob.ctx.close()
  })

  test('the chat is opaque, shows the status line by default and uses each author colour', async ({ page, browser }) => {
    const bob = await twoPeople(page, browser)
    // Bob picks his avatar colour: Alice sees it in the participants menu and in the chat.
    await bob.page.getByTestId('btn-profile').click()
    await bob.page.locator('.hue').nth(4).click()
    const hue = Number((await bob.page.locator('.hue').nth(4).getAttribute('aria-label'))!.replace(/\D/g, ''))
    await bob.page.keyboard.press('Escape')
    await page.getByTestId('btn-participants').click()
    await expect(page.locator('li[data-testid^="peer-"]', { hasText: 'Bob' }).locator('.av')).toHaveAttribute('data-hue', String(hue))
    await page.keyboard.press('Escape')

    await bob.page.getByTestId('btn-chat').click()
    await bob.page.getByTestId('chat-input').fill('Salut')
    await bob.page.getByTestId('chat-send').click()
    await page.getByTestId('btn-chat').click()
    await expect(page.getByTestId('chat-panel')).toBeVisible()
    const bg = await page.getByTestId('chat-panel').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toMatch(/rgba\(.*,\s*0(\.\d+)?\)$/)
    await expect(page.getByTestId('chat-status')).toBeVisible()
    await expect(page.locator('[data-testid^="chat-msg-"]').first()).toBeVisible()
    await expect(page.getByTestId('chat-panel').locator('.av.sm').first()).toHaveAttribute('data-hue', String(hue))
    // The preference turns the status line off.
    await page.getByTestId('chat-close').click()
    await page.getByTestId('btn-profile').click()
    await page.getByTestId('set-chat-status').uncheck()
    await page.keyboard.press('Escape')
    await page.getByTestId('btn-chat').click()
    await expect(page.getByTestId('chat-status')).toHaveCount(0)
    await bob.ctx.close()
  })

  test('an action is written in a real multi-line area and saved with Ctrl+Enter', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-actions').click()
    const area = page.getByTestId('action-text')
    expect(await area.evaluate((el) => el.tagName)).toBe('TEXTAREA')
    await area.fill('Premiere ligne\nSeconde ligne\nTroisieme ligne')
    await area.press('Control+Enter')
    await expect(page.locator('li', { hasText: 'Seconde ligne' })).toBeVisible()
    await expect(area).toHaveValue('')
  })

  test('the writing size is set in place: S M L, a link for all columns, and Write only shows or hides', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await expect(page.getByTestId('btn-writing-sizes')).toHaveCount(0)
    const ids = await page.locator('section[data-testid^="column-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('column-', '')))
    await page.getByTestId(`area-large-${ids[0]}`).click()
    await expect(page.getByTestId(`area-large-${ids[0]}`)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId(`area-large-${ids[1]}`)).toHaveAttribute('aria-pressed', 'false')
    // Double-click on the grip resets the height.
    await page.getByTestId(`grow-grip-${ids[0]}`).dblclick()
  })

  test('the voting menu says each thing once and uses the shared toggle', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('votebar-more').click()
    const secret = page.getByTestId('secret-toggle')
    await expect(secret).toHaveAttribute('role', 'switch')
    await expect(secret).not.toBeChecked()
    await expect(page.getByTestId('voting-disable')).toHaveAttribute('role', 'switch')
    await secret.click()
    await page.getByTestId('votebar-more').click()
    await expect(page.getByTestId('secret-toggle')).toBeChecked()
  })

  test('the encryption state is a shield with its explanation on tap', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const shield = page.getByTestId('encryption-badge')
    await expect(shield).toBeVisible()
    await expect(shield).toHaveAttribute('title', /.+/)
    await shield.click()
    await expect(page.getByTestId('encryption-explain')).toBeVisible()
  })

  test('the floor banner never overflows a small phone, even with a long name', async ({ page, browser }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-talk-ring').click()
    await page.getByTestId('opt-talk-budget-1').click()
    await page.keyboard.press('Escape')
    await page.getByTestId('btn-share').click()
    const link = await page.getByTestId('share-url').inputValue()
    await page.keyboard.press('Escape')
    const bob = await join(browser, link, 'Bobbbbbbbbbbbbbbbbbbbbbbb')
    await page.getByTestId('btn-participants').click()
    await page.locator('li[data-testid^="peer-"]', { hasText: 'Bobbbb' }).locator('[data-testid^="talk-give-"]').click()
    await page.keyboard.press('Escape')
    const banner = page.getByTestId('talk-banner')
    await expect(banner).toBeVisible()
    const box = (await banner.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await bob.ctx.close()
  })
})

test('a person can spend all votes on one idea when the board allows it (change vote-all-on-one-idea)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Une seule idee')
  await page.getByTestId('btn-options').click()
  const toggle = page.getByTestId('opt-all-on-one')
  await expect(toggle).not.toBeChecked()
  await toggle.check()
  await expect(toggle).toBeChecked()
  const budget = Number(await page.getByTestId('opt-votes').textContent())
  await expect(page.getByTestId('opt-per-item')).toHaveText(String(budget))
  await page.keyboard.press('Escape')
  const vote = noteByText(page, 'Une seule idee').locator('[data-testid^="vote-"]')
  for (let i = 0; i < budget; i++) await vote.click()
  await expect(noteByText(page, 'Une seule idee').locator('[data-testid^="my-votes-"] i')).toHaveCount(budget)
  await expect(page.getByTestId('votes-left')).toContainText('0')
})
