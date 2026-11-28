import { expect, type Locator, type Page, test } from '@playwright/test'
import { axe, createBoard, join } from './helpers'

// Change chat-floating-dock: the minimised chat button snaps to the screen edges, remembers its place, keeps out of the way
// and can be moved without dragging.

const minimise = async (page: Page) => {
  await page.getByTestId('btn-chat').click()
  await page.getByTestId('chat-minimize').click()
  await expect(page.getByTestId('chat-bubble')).toBeVisible()
  await expect(page.getByTestId('chat-panel')).toHaveCount(0)
  await page.waitForTimeout(450) // the drawer slides out and the button pops in
}
const centre = async (el: Locator) => { const b = (await el.boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
const dragTo = async (page: Page, x: number, y: number) => {
  const from = await centre(page.getByTestId('chat-bubble'))
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move((from.x + x) / 2, (from.y + y) / 2, { steps: 4 })
  await page.mouse.move(x, y, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(350)
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('retroboard:settings') ?? '{}'))
const onScreen = async (page: Page) => {
  const b = (await page.getByTestId('chat-bubble').boundingBox())!
  const vp = page.viewportSize()!
  expect(b.x).toBeGreaterThanOrEqual(0)
  expect(b.y).toBeGreaterThanOrEqual(0)
  expect(b.x + b.width).toBeLessThanOrEqual(vp.width)
  expect(b.y + b.height).toBeLessThanOrEqual(vp.height)
  return b
}

test.describe('phone', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('snaps to the nearest edge or corner, keeps its place after a reload and a rotation, and never leaves the screen', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await minimise(page)
    for (const [x, y, edge] of [[60, 380, 'left'], [300, 380, 'right'], [180, 150, 'top'], [180, 640, 'bottom']] as const) {
      await dragTo(page, x, y)
      expect((await stored(page)).chatPlace).toMatchObject({ mode: 'snap', edge })
      const b = await onScreen(page)
      if (edge === 'left') expect(b.x).toBeLessThan(16)
      if (edge === 'right') expect(b.x + b.width).toBeGreaterThan(344)
    }
    // Near two edges: the corner.
    await dragTo(page, 30, 700)
    const corner = (await stored(page)).chatPlace
    expect(corner.mode).toBe('snap')
    expect([0, 1]).toContain(corner.at)
    // The middle of the right edge survives a reload and a rotation.
    await dragTo(page, 330, 370)
    await page.reload()
    await minimise(page)
    expect((await stored(page)).chatPlace).toMatchObject({ edge: 'right' })
    await page.setViewportSize({ width: 740, height: 360 })
    await page.waitForTimeout(300)
    const b = await onScreen(page)
    expect(b.x + b.width).toBeGreaterThan(724)
    expect(Math.abs(b.y + b.height / 2 - 180)).toBeLessThan(60)
  })

  test('a tap still opens the chat, a drag does not', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await minimise(page)
    await dragTo(page, 60, 300)
    await expect(page.getByTestId('chat-panel')).toHaveCount(0)
    await page.getByTestId('chat-bubble').click()
    await expect(page.getByTestId('chat-panel')).toBeVisible()
    // The drawer opens on the side of the button.
    expect((await page.getByTestId('chat-panel').boundingBox())!.x).toBeLessThan(10)
  })

  test('keeps out of the toolbar: dropped on it, the button rests below', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await minimise(page)
    await dragTo(page, 330, 30)
    const bar = (await page.locator('[data-avoid-chat]').first().boundingBox())!
    const b = (await page.getByTestId('chat-bubble').boundingBox())!
    expect(b.y >= bar.y + bar.height - 1 || b.y + b.height <= bar.y + 1).toBe(true)
    // The stored place is untouched by the shift.
    expect((await stored(page)).chatPlace).toMatchObject({ mode: 'snap' })
  })
})

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('free mode rests where it is dropped, also after a reload; reset goes back to the right edge', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await minimise(page)
    await page.getByTestId('chat-bubble').focus()
    await page.keyboard.press('Shift+F10')
    await page.getByTestId('chat-menu-mode').click()
    expect((await stored(page)).chatDock).toBe('free')
    await dragTo(page, 640, 400)
    const at = await centre(page.getByTestId('chat-bubble'))
    expect(Math.abs(at.x - 640)).toBeLessThan(40)
    expect(Math.abs(at.y - 400)).toBeLessThan(40)
    await page.reload()
    await minimise(page)
    const again = await centre(page.getByTestId('chat-bubble'))
    expect(Math.abs(again.x - at.x)).toBeLessThan(3)
    expect(Math.abs(again.y - at.y)).toBeLessThan(3)
    await page.getByTestId('chat-bubble').focus()
    await page.keyboard.press('Shift+F10')
    await page.getByTestId('chat-menu-reset').click()
    await page.waitForTimeout(300)
    const s = await stored(page)
    expect(s.chatDock).toBe('snap')
    expect(s.chatPlace).toMatchObject({ mode: 'snap', edge: 'right' })
    expect((await page.getByTestId('chat-bubble').boundingBox())!.x).toBeGreaterThan(1200)
  })

  test('keyboard only: menu, Move, arrows, Enter drops, Escape cancels, announced politely, axe clean', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await minimise(page)
    const bubble = page.getByTestId('chat-bubble')
    await bubble.focus()
    await page.keyboard.press('Shift+F10')
    const menu = page.getByTestId('chat-bubble-menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem').first()).toBeFocused()
    for (const item of await menu.getByRole('menuitem').all()) expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect((await axe(page).include('[data-testid="chat-bubble-menu"]').include('[data-testid="chat-bubble"]').disableRules(['region']).analyze()).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([])
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
    await expect(bubble).toBeFocused()

    await page.keyboard.press('ContextMenu')
    await page.getByTestId('chat-menu-move').click()
    await expect(page.getByTestId('chat-move-status')).toContainText(/arrow keys|flèches/)
    // From the lower third of the right edge (the bottom right place), left is the middle of the bottom edge.
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByTestId('chat-move-status')).toContainText(/bottom edge|bord bas/)
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('chat-move-status')).toContainText(/bottom edge|bord bas/)
    expect((await stored(page)).chatPlace).toMatchObject({ edge: 'bottom', at: 0.5 })
    await page.waitForTimeout(300)
    const dropped = (await bubble.boundingBox())!
    // The composer buttons of the columns sit under the middle of the bottom edge: the button slides aside, the stored place stays.
    expect(dropped.y + dropped.height).toBeGreaterThan(700)

    // Escape brings it back.
    await page.keyboard.press('Shift+F10')
    await page.getByTestId('chat-menu-move').click()
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('chat-move-status')).toContainText(/cancelled|annulé/)
    expect((await stored(page)).chatPlace).toMatchObject({ edge: 'bottom', at: 0.5 })
    await page.waitForTimeout(300)
    expect(Math.abs((await bubble.boundingBox())!.y - dropped.y)).toBeLessThan(3)
  })

  test('the profile picker, the snap or free choice and the reset work and pass axe in light and dark', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await minimise(page)
    await page.getByTestId('btn-profile').click()
    await page.waitForTimeout(450) // the dialog opens with a scale
    const picker = page.getByTestId('chat-places')
    await expect(picker.getByRole('radio')).toHaveCount(8)
    for (const r of await picker.getByRole('radio').all()) {
      const b = (await r.boundingBox())!
      expect(b.width).toBeGreaterThanOrEqual(44)
      expect(b.height).toBeGreaterThanOrEqual(44)
    }
    await page.getByTestId('chat-place-top-left').click()
    expect((await stored(page)).chatPlace).toMatchObject({ mode: 'snap', edge: 'top', at: 0 })
    await expect(page.getByTestId('chat-place-top-left')).toHaveAttribute('aria-checked', 'true')
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await page.evaluate((v) => { document.documentElement.dataset.variant = v }, scheme)
      expect((await axe(page).include('[data-testid="chat-button-setting"]').include('[data-testid="chat-places"]').analyze()).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([])
    }
    await page.getByTestId('chat-dock-free').click()
    expect((await stored(page)).chatDock).toBe('free')
    await page.getByTestId('chat-place-reset').click()
    const s = await stored(page)
    expect(s.chatDock).toBe('snap')
    expect(s.chatPlace).toMatchObject({ edge: 'right' })
    // Nothing of it is part of the board: the settings stay on this device.
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /chat-bubble/.test(k)))).toEqual([])
  })

  test('the old pixel position is converted once and the old key is removed', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('retroboard:chat-bubble', JSON.stringify({ x: 30, y: 400 })) })
    await createBoard(page, { template: 'start-stop-continue' })
    await minimise(page)
    expect(await page.evaluate(() => localStorage.getItem('retroboard:chat-bubble'))).toBeNull()
    expect((await stored(page)).chatPlace).toMatchObject({ mode: 'snap', edge: 'left' })
  })

  test('the unread badge stays on screen on the right and left edges', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', keepShare: true })
    const link = await page.getByTestId('share-url').inputValue()
    await page.keyboard.press('Escape')
    const bob = await join(browser, link, 'Bob')
    await minimise(page)
    await bob.page.getByTestId('btn-chat').click()
    await bob.page.getByTestId('chat-input').fill('Ping')
    await bob.page.getByTestId('chat-send').click()
    const badge = page.getByTestId('chat-bubble-unread')
    await expect(badge).toHaveText('1')
    for (const x of [1250, 30]) {
      await dragTo(page, x, 300)
      const b = (await badge.boundingBox())!
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(1280)
      const bubble = (await page.getByTestId('chat-bubble').boundingBox())!
      // The badge is on the inner side of the button.
      expect(x > 640 ? b.x < bubble.x + bubble.width / 2 : b.x + b.width > bubble.x + bubble.width / 2).toBe(true)
    }
    await bob.ctx.close()
  })
})
