import { expect, test } from '@playwright/test'
import { axe, createBoard, phoneLayout } from './helpers'

test('the chevron slides the menus away and back on any screen, and stays in place (change ux-irritants-wave-2)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const tools = page.locator('nav.tools')
  await expect(tools).toBeVisible()
  const toggle = page.getByTestId('chrome-hide')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const x = (await toggle.boundingBox())!.x
  await toggle.click()
  await expect(tools).toBeHidden()
  await expect(page.getByTestId('votebar')).toBeHidden()
  const shown = page.getByTestId('chrome-show')
  await expect(shown).toHaveAttribute('aria-expanded', 'false')
  expect(Math.abs((await shown.boundingBox())!.x - x)).toBeLessThan(2)
  const found = (await axe(page).include('header.toolbar').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)
  expect(found).toEqual([])
  await shown.click()
  await expect(tools).toBeVisible()
  await expect(page.getByTestId('votebar')).toBeVisible()
})

test('options dialog on a phone: destroy keeps its text in the box, scales are one segmented control, the mode switch is centred (change ux-irritants-wave-2)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await page.getByTestId('btn-options').click()
  const dialog = page.getByRole('dialog')
  const scale = dialog.locator('.pick-seg').first()
  await expect(scale.locator('svg')).toHaveCount(3)
  const destroy = dialog.getByTestId('opt-destroy')
  await destroy.scrollIntoViewIfNeeded()
  const fits = await destroy.evaluate((b) => b.scrollWidth <= b.clientWidth + 1)
  expect(fits).toBe(true)
  const mode = dialog.getByTestId('mode-switch')
  await mode.scrollIntoViewIfNeeded()
  const mb = (await mode.boundingBox())!
  const db = (await dialog.boundingBox())!
  expect(mb.width).toBeLessThan(db.width * 0.8)
  expect(Math.abs(mb.x + mb.width / 2 - (db.x + db.width / 2))).toBeLessThan(6)
})

test('presentation mode hides the menu bar by default, leaving restores it (change ux-irritants-wave-2)', async ({ page }) => {
  await page.goto('/new')
  await expect(page.getByTestId('new-presenter-switch')).toBeChecked()
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const tools = page.locator('nav.tools')
  await page.getByTestId('btn-presenter').click()
  await expect(tools).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(tools).toBeVisible()
})

test('the creation switch keeps the menu bar in presentation mode (change ux-irritants-wave-2)', async ({ page }) => {
  await page.goto('/new')
  await page.getByTestId('new-presenter-switch').uncheck()
  await page.reload()
  await expect(page.getByTestId('new-presenter-switch')).not.toBeChecked()
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-presenter').click()
  await expect(page.locator('nav.tools')).toBeVisible()
})

test('the vote bar controls share one height and the bar stays on one or two rows (change ux-irritants-wave-2)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const heights = await page.getByTestId('votebar').locator('.state, .right .btn').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
  expect(heights.length).toBeGreaterThanOrEqual(2)
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2)
  expect((await page.getByTestId('votebar').boundingBox())!.height).toBeLessThan(100)
})

test('the chevron is the last item at the right and the vote strip is one icon-led row on a phone (change ux-irritants-wave-3)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const chev = (await page.getByTestId('chrome-hide').boundingBox())!
  expect(chev.x + chev.width).toBeGreaterThan(390 - 24)
  const timer = (await page.locator('header.toolbar .timer-slot').boundingBox())!
  expect(chev.x).toBeGreaterThanOrEqual(timer.x + timer.width - 1)
  const strip = (await page.getByTestId('votebar').boundingBox())!
  expect(strip.height).toBeLessThanOrEqual(56)
  // Texts stay for assistive tech: the buttons keep their names.
  await expect(page.getByTestId('votebar-more')).toHaveAccessibleName(/More|Plus/)
})

test('the writing area shows no explanatory sentence, only icons and a chevron, with names kept (change ux-irritants-wave-3)', async ({ page, isMobile }) => {
  test.skip(phoneLayout({ isMobile, viewport: page.viewportSize() }), 'a phone has no writing area in the column: it writes in the bottom sheet')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const area = page.locator('section.priv').first()
  const visible = await area.evaluate((el) => {
    const out: string[] = []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const p = n.parentElement!
      if (p.closest('.sr-only') || !n.textContent!.trim()) continue
      if (getComputedStyle(p).visibility !== 'hidden') out.push(n.textContent!.trim())
    }
    return out
  })
  expect(visible.join(' ')).not.toMatch(/Only you|Seulement toi|Write here|PRIVATE|Privé/i)
  await expect(area.getByRole('button', { name: /Add|Ajouter/ })).toBeVisible()
})

test('profile rows with wide controls stack under their label on a phone (change ux-irritants-wave-3)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-profile').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByTestId('mode-advanced').click()
  const line = dialog.locator('.line', { has: page.getByTestId('lang-auto') })
  const label = (await line.locator('span').first().boundingBox())!
  const control = (await line.locator('.pick-seg').boundingBox())!
  expect(control.y).toBeGreaterThanOrEqual(label.y + label.height - 1)
  expect(label.width).toBeGreaterThan(200)
})
