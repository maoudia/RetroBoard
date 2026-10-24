import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote, settle } from './helpers'

async function shareUrl(page: import('@playwright/test').Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

test('pointers: the other participant sees mine over the same note with a different window size', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'touch screens share focus, not a pointer (next test)')
  await page.setViewportSize({ width: 1100, height: 760 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 1, 'Pointer target')
  const bob = await join(browser, await shareUrl(page), 'Bob')
  await expect(noteByText(bob.page, 'Pointer target')).toBeVisible()

  // Alice points at the middle of the note, a quarter down.
  await settle(page)
  await settle(bob.page)
  const note = noteByText(page, 'Pointer target')
  const box = (await note.boundingBox())!
  await page.mouse.move(box.x + box.width / 2 - 20, box.y + box.height / 4)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 4, { steps: 4 })

  const cursor = bob.page.locator('[data-testid^="cursor-"]')
  await expect(cursor).toBeVisible()
  await expect(cursor).toContainText('Alice')
  // Same spot of the note in Bob's (wider) layout, once the easing settles.
  const bobBox = (await noteByText(bob.page, 'Pointer target').boundingBox())!
  await expect.poll(async () => {
    const c = (await cursor.boundingBox())!
    return Math.abs(c.x - (bobBox.x + bobBox.width / 2)) < 6 && Math.abs(c.y - (bobBox.y + bobBox.height / 4)) < 6
  }).toBe(true)

  // Turning "Share my pointer" off removes it for the others.
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('set-share-cursor').uncheck()
  await page.keyboard.press('Escape')
  await expect(cursor).toHaveCount(0)
  await bob.ctx.close()
})

test('"Show others\' pointers" off hides them on my screen', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'pointers are never drawn on touch screens')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await join(browser, await shareUrl(page), 'Bob')
  await bob.page.getByTestId('btn-profile').click()
  await bob.page.getByTestId('set-show-cursors').uncheck()
  await bob.page.keyboard.press('Escape')
  const col = (await page.locator('section[data-testid^="column-"]').first().boundingBox())!
  await page.mouse.move(col.x + 40, col.y + 80, { steps: 5 })
  await page.mouse.move(col.x + 60, col.y + 90, { steps: 5 })
  await bob.page.waitForTimeout(600)
  await expect(bob.page.locator('[data-testid^="cursor-"]')).toHaveCount(0)
  await bob.ctx.close()
})

test('touch screens: no floating pointers; who is editing shows on the note itself', async ({ page, browser, isMobile }) => {
  test.skip(!isMobile, 'phone project only')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await join(browser, await shareUrl(page), 'Bob')
  await publishNote(bob.page, 0, 'Edited by Bob')
  await expect(noteByText(page, 'Edited by Bob')).toBeVisible()

  // Bob (desktop) points and starts editing his note: Alice's phone shows a marker, not a pointer.
  const id = (await noteByText(bob.page, 'Edited by Bob').getAttribute('data-anchor'))!
  const target = bob.page.getByTestId(`note-${id}`)
  const box = (await target.boundingBox())!
  await bob.page.mouse.move(box.x + 10, box.y + 10, { steps: 4 })
  await target.locator('[data-testid^="note-menu-"]').click()
  await bob.page.getByRole('menuitem', { name: 'Modifier' }).click()
  await expect(target.locator('textarea')).toBeFocused()

  const marker = page.getByTestId(`live-note-${id}`)
  await expect(marker).toBeVisible()
  await expect(marker).toHaveAttribute('aria-label', /Bob/)
  await expect(page.locator('[data-testid^="cursor-"]')).toHaveCount(0)

  // Done editing: the marker goes away.
  await bob.page.keyboard.press('Escape')
  await expect(marker).toHaveCount(0)
  await bob.ctx.close()
})

test('participants menu: shows who is typing and in which column', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'covered on desktop; the menu is the same on phones')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await join(browser, await shareUrl(page), 'Bob')
  const col = bob.page.locator('section[data-testid^="column-"]').first()
  const title = (await col.getByTestId('column-title').textContent())!.trim()
  await col.locator('textarea').click()
  await col.locator('textarea').pressSequentially('Une idée', { delay: 20 })

  await page.getByTestId('btn-participants').click()
  const bobRow = page.locator('li[data-testid^="peer-"]', { hasText: 'Bob' })
  await expect(bobRow.locator('[data-testid^="peer-status-"]')).toHaveText(`écrit dans ${title}`)
  // Bob stops typing: the status goes away.
  await col.locator('textarea').evaluate((el) => (el as HTMLElement).blur())
  await expect(bobRow.locator('[data-testid^="peer-status-"]')).toHaveCount(0)
  await bob.ctx.close()
})
