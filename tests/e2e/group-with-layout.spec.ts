import { expect, test, type Page } from '@playwright/test'
import { axe, createBoard, noteByText, publishNote } from './helpers'

// Change fix-group-with-menu-layout: the "Group with..." list of the note menu stays inside its panel (geometry, not looks).
// The longest idea a new board accepts is 160 characters.
const LONG = `W${'x'.repeat(149)}`
const sizes = [{ name: 'phone', width: 360, height: 740 }, { name: 'tablet', width: 768, height: 1024 }, { name: 'tv', width: 2560, height: 1440 }]

async function openGroupWith(page: Page, text: string) {
  await page.locator('body').click({ position: { x: 5, y: 400 } })
  await expect(async () => {
    await noteByText(page, text).locator('[data-testid^="note-menu-"]').click()
    await page.locator('[data-testid^="group-with-"]').click({ timeout: 2000 })
  }).toPass({ timeout: 10_000 })
  await expect(page.locator('.gw-list')).toBeVisible()
}

/** Every row and the button lie inside the panel box, nothing scrolls sideways, rows keep a rounded rectangle. */
async function expectInsidePanel(page: Page) {
  const panel = page.locator('.dd-panel:popover-open')
  const box = (await panel.boundingBox())!
  const rows = page.locator('[data-testid^="group-onto-"]')
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    const r = (await rows.nth(i).boundingBox())!
    expect(r.x, `row ${i} left`).toBeGreaterThanOrEqual(box.x - 0.5)
    expect(r.x + r.width, `row ${i} right`).toBeLessThanOrEqual(box.x + box.width + 0.5)
  }
  const side = await panel.evaluate((p) => ({ x: p.scrollWidth - p.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
  expect(side.x, 'panel scrolls sideways').toBeLessThanOrEqual(1)
  expect(side.page, 'page scrolls sideways').toBeLessThanOrEqual(1)
  // The shared menu row is a pill (999px): on a label that wraps it turns into an oval, so list rows are rounded rectangles.
  const radii = await rows.evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius)))
  for (const r of radii) expect(r, 'a list row is a rounded rectangle, not a pill').toBeLessThanOrEqual(16)
  // The list scrolls inside the panel: the panel itself does not grow a second scrollbar for it.
  const lists = await page.locator('.gw-list').evaluate((l) => ({ own: getComputedStyle(l).overflowY, h: l.getBoundingClientRect().height }))
  expect(lists.h).toBeLessThanOrEqual(box.height)
}

/** Tab reaches the button last, and the button is neither outside the panel nor under the bottom fade. */
async function expectButtonReachable(page: Page) {
  const go = page.getByTestId('group-bulk-go')
  await page.getByTestId('group-onto-' + (await page.locator('[data-testid^="group-onto-"]').last().getAttribute('data-testid'))!.replace('group-onto-', '')).focus()
  await page.locator('[data-testid^="group-onto-"]').first().click() // a tick enables the button
  await go.focus()
  await expect(go).toBeFocused()
  const panel = page.locator('.dd-panel:popover-open')
  const p = (await panel.boundingBox())!
  const b = (await go.boundingBox())!
  expect(b.y, 'button top').toBeGreaterThanOrEqual(p.y - 0.5)
  expect(b.y + b.height, 'button bottom').toBeLessThanOrEqual(p.y + p.height + 0.5)
  const fade = await panel.evaluate((e) => e.hasAttribute('data-more'))
  const fadeHeight = 24 // 1.5rem of the mask in Dropdown.vue
  if (fade) expect(b.y + b.height, 'button under the fade').toBeLessThanOrEqual(p.y + p.height - fadeHeight + 0.5)
}

for (const size of sizes) {
  for (const scheme of size.name === 'phone' ? (['light', 'dark'] as const) : (['light'] as const)) {
    test(`Group with list stays inside its menu: ${size.name}, ${scheme}, 30 ideas, a long word and a cluster`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme })
      await page.addInitScript((variant) => {
        try { localStorage.setItem('retroboard:settings', JSON.stringify({ uiMode: 'advanced', variant })) } catch { /* ignore */ }
      }, scheme)
      await page.setViewportSize({ width: size.width, height: size.height })
      await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
      await publishNote(page, 0, 'Subject idea')
      await publishNote(page, 0, LONG)
      await publishNote(page, 0, 'Cluster seed one')
      await publishNote(page, 0, 'Cluster seed two')
      for (let i = 1; i <= 26; i++) await publishNote(page, 0, `Idea number ${i} with a sentence long enough to wrap over two or three lines in a phone menu`)
      await openGroupWith(page, 'Subject idea')
      // A cluster as a target: group the two seeds first, then reopen.
      await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Cluster seed one' }).click()
      await page.getByTestId('group-bulk-go').click()
      await openGroupWith(page, 'Idea number 3 ')
      await expect(page.locator('[data-testid^="group-onto-"]')).toHaveCount(28)
      await expectInsidePanel(page)
      await expectButtonReachable(page)
      const result = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
    })
  }
}

test('Group with list with a single idea', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Subject idea')
  await publishNote(page, 0, 'Only other idea')
  await openGroupWith(page, 'Subject idea')
  await expectInsidePanel(page)
  await expectButtonReachable(page)
})
