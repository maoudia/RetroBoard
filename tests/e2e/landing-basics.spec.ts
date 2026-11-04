import { expect, test } from '@playwright/test'

test('the site ships its icons and manifest, and the landing says what is true (change stabilise-main)', async ({ page }) => {
  await page.goto('/')
  for (const sel of ['link[rel="icon"][type="image/svg+xml"]', 'link[rel="icon"][sizes="32x32"]', 'link[rel="apple-touch-icon"]', 'link[rel="manifest"]']) {
    const href = await page.locator(sel).first().getAttribute('href')
    expect(href, sel).toBeTruthy()
    const res = await page.request.get(href!)
    expect(res.status(), href!).toBe(200)
  }
  const manifest = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))

  // Boards are kept by default: the landing must not claim they are erased after a day.
  await expect(page.locator('.stats')).not.toContainText('24 h')
  await expect(page.locator('.stats')).toContainText('E2E')
  await expect(page.locator('.sub').first()).toContainText(/end-to-end|bout en bout/)
})

test('the landing footer does not overflow a 360 px phone (change stabilise-main)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  const foot = page.locator('footer.foot')
  await foot.scrollIntoViewIfNeeded()
  const overflow = await foot.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const boxes = await foot.locator('> *').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom] }))
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [l1, r1, t1, b1] = boxes[i]!, [l2, r2, t2, b2] = boxes[j]!
    const overlap = l1 < r2 - 1 && l2 < r1 - 1 && t1 < b2 - 1 && t2 < b1 - 1
    expect(overlap, `footer items ${i} and ${j} overlap`).toBe(false)
  }
})
