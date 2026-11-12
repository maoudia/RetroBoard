import { expect, test } from '@playwright/test'
import { createBoard, phoneLayout } from './helpers'

/** Change ui-coherence-pass: one button shape, centred labels, centred ring. Measured in the browser. */
const MEASURE = () => {
  const rows: { name: string; dx: number; dy: number; pill: boolean }[] = []
  for (const el of document.querySelectorAll<HTMLElement>('.btn, .mini-btn, .icon-btn')) {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (r.width < 4 || r.height < 4 || cs.visibility === 'hidden' || cs.display === 'none') continue
    // Content = the icon and the label (not the key hint caps or badges that sit in a corner, nor a label clipped to 1 px when the toolbar shows icons only, nor the comment a v-if leaves behind).
    const parts = [...el.childNodes].filter((n) => !(n instanceof HTMLElement && n.matches('kbd, .badge, .kbd, .dot, .sr-only')) && n.nodeType !== 8 && !(n.nodeType === 3 && !n.textContent!.trim()) && !(n instanceof HTMLElement && n.getBoundingClientRect().width <= 2))
    const range = document.createRange()
    if (parts.length) { range.setStartBefore(parts[0]!); range.setEndAfter(parts[parts.length - 1]!) } else range.selectNodeContents(el)
    const c = range.getBoundingClientRect()
    const radius = parseFloat(cs.borderTopLeftRadius)
    rows.push({ name: el.getAttribute('data-testid') ?? el.getAttribute('aria-label') ?? el.className, dx: c.left + c.width / 2 - (r.left + r.width / 2), dy: c.top + c.height / 2 - (r.top + r.height / 2), pill: radius >= Math.min(r.width, r.height) / 2 - 1 })
  }
  return rows
}

test.describe('buttons', () => {
  test('every .btn, .mini-btn and .icon-btn is a pill with its label centred (home, creation, board)', async ({ page, isMobile }) => {
    test.skip(phoneLayout({ isMobile, viewport: page.viewportSize() }), 'measured on desktop; the phone layout has its own e2e')
    // The toolbar folds its labels once its width is known: measure until the layout has settled.
    const check = async (where: string) => {
      await expect(async () => {
        const bad: string[] = []
        for (const r of await page.evaluate(MEASURE)) {
          if (!r.pill) bad.push(`${where} ${r.name}: not a pill`)
          if (Math.abs(r.dx) > 1.5 || Math.abs(r.dy) > 1.5) bad.push(`${where} ${r.name}: off centre ${r.dx.toFixed(1)},${r.dy.toFixed(1)}`)
        }
        expect(bad).toEqual([])
      }).toPass({ timeout: 6000 })
    }
    await page.goto('/')
    await check('home')
    await page.goto('/new')
    await check('new')
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await check('board')
  })

  test('the ring and the start button are centred in their round container', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop geometry')
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const box = page.locator('.clockrow').first()
    await expect(box).toBeVisible()
    const c = (await box.boundingBox())!
    const ring = (await page.getByTestId('activity-rings').first().boundingBox())!
    const go = (await box.locator('.go').boundingBox())!
    const mid = c.y + c.height / 2
    expect(Math.abs(ring.y + ring.height / 2 - mid)).toBeLessThan(1.5)
    expect(Math.abs(go.y + go.height / 2 - mid)).toBeLessThan(1.5)
    // The left cap and the right cap are semicircles: each centre sits one radius from its end.
    const r = c.height / 2
    expect(Math.abs(ring.x + ring.width / 2 - (c.x + r))).toBeLessThan(2)
    expect(Math.abs(go.x + go.width / 2 - (c.x + c.width - r))).toBeLessThan(2)
  })
})

test.describe('voting bar on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test('is one row that slides sideways and stays short (change ui-coherence-pass)', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const bar = page.locator('.votebar').first()
    await expect(bar).toBeVisible()
    const m = await bar.evaluate((el) => ({ h: el.getBoundingClientRect().height, ox: getComputedStyle(el).overflowX, wrap: getComputedStyle(el).flexWrap }))
    expect(m.ox).toBe('auto')
    expect(m.wrap).toBe('nowrap')
    expect(m.h).toBeLessThan(64)
  })
})

test('the toolbar lists its buttons by importance (change ui-coherence-pass)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const ids = await page.locator('nav.tools [data-testid]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  const order = ['btn-share', 'btn-participants', 'btn-actions', 'btn-filter', 'btn-presenter', 'btn-export', 'btn-options']
  const at = order.map((id) => ids.indexOf(id))
  expect(at.every((i) => i >= 0)).toBe(true)
  expect([...at].sort((x, y) => x - y)).toEqual(at)
})
