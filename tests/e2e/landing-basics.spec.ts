import { existsSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { cursorsOn } from './helpers'

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

test('the landing is prerendered: its content is in the HTML, with no inline style the CSP would refuse (change landing-speed-and-accessibility)', async ({ request }) => {
  const html = await (await request.get('/')).text()
  // The hero text is served, not drawn by a script: the first paint does not wait for the bundle.
  expect(html).toMatch(/<h1[^>]*data-testid="hero-title"[^>]*>[^<]+/)
  expect(html).toMatch(/<p[^>]*class="sub"[^>]*>[^<]{20,}/)
  expect(html).toContain('id="main"') // the skip link has a target without a script
  expect(html).not.toMatch(/ style="/)
  expect(html).not.toContain('"pinia"') // no store snapshot: settings, recents and identity stay the visitor's own
})

const REPO = 'https://github.com/maoudia/retroboard'

test('the "Built in public, source available" section states the license and links to the source (change landing-v2-and-product-video, task 2.1)', async ({ page }) => {
  await page.goto('/')
  const section = page.getByTestId('landing-open')
  await expect(section.getByRole('heading', { level: 2 })).toContainText(/Construit en public|Built in public/)
  // The promises of the spec: the license, self-hosting, commercial rights reserved, no tracking.
  await expect(section).toContainText('PolyForm Noncommercial')
  const targets = {
    'open-repo': REPO,
    'open-license': `${REPO}/blob/main/LICENSE`,
    'open-self-host': `${REPO}/blob/main/docs/self-hosting.md`,
    'open-commercial': 'https://www.maoudia.com',
  }
  for (const [id, href] of Object.entries(targets)) {
    const link = section.getByTestId(id)
    await expect(link, id).toHaveAttribute('href', href)
    await expect(link, id).toHaveAttribute('target', '_blank')
    await expect(link, id).toHaveAttribute('rel', /noopener/)
  }
  // The license link points at a file that exists in the repository root.
  expect(existsSync(new URL('../../LICENSE', import.meta.url))).toBe(true)
  expect(existsSync(new URL('../../docs/self-hosting.md', import.meta.url))).toBe(true)
  // The section is part of the prerendered HTML and the menu reaches it. The menu is hidden at 900 px and below (the page is short
  // enough to scroll), so there it must still be in the markup and point at a section that exists.
  const menuLink = page.locator('nav.links a[href="#open"]')
  await expect(menuLink).toBeAttached()
  await expect(page.locator('#open')).toBeAttached()
  if ((page.viewportSize()?.width ?? 0) > 900) await expect(menuLink).toBeVisible()
  else await expect(menuLink).toBeHidden()
})

test('the open-code section and the feature cards are in English too, and are read without motion (change landing-v2-and-product-video, tasks 2.1 and 2.3)', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/?lang=x')
  const section = page.getByTestId('landing-open')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Built in public, source available.')
  await expect(section.getByTestId('open-commercial')).toHaveText('Ask for a commercial license')
  await expect(page.locator('#features .card')).toHaveCount(cursorsOn ? 10 : 9)
  for (const title of ['Agenda ring', 'Vote podium', ...(cursorsOn ? ['Live cursors'] : []), 'Exports', 'AI agents']) await expect(page.locator('#features h3', { hasText: title })).toBeVisible()
  // Reduced motion: nothing waits for a scroll to appear.
  await expect(section.locator('.card').first()).toHaveCSS('opacity', '1')
  await context.close()
})

// Layout regression of the landing sections: in fr, en and the 40 % longer pseudo-locale, at a phone and a desktop width, no card
// leaves the screen or covers another, and no text is cut by its card (change landing-v2-and-product-video, task 2.3).
for (const lang of [{ id: 'fr', q: '' }, { id: 'en', q: '?lang=x' }, { id: 'pseudo', q: '?lang=pseudo' }]) {
  for (const width of [360, 768, 1440]) {
    test(`the feature and open-code cards keep their layout at ${width} px in ${lang.id}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(`/${lang.q}`)
      await page.waitForLoadState('networkidle')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
      for (const scope of ['#features', '#open']) {
        const cards = page.locator(`${scope} .card`)
        const n = await cards.count()
        expect(n, scope).toBeGreaterThan(3)
        const boxes = await cards.evaluateAll((els) => els.map((e) => {
          const r = e.getBoundingClientRect()
          return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, cut: e.scrollHeight - e.clientHeight, wide: e.scrollWidth - e.clientWidth }
        }))
        boxes.forEach((b, i) => {
          expect(b.l, `${scope} card ${i} left`).toBeGreaterThanOrEqual(-1)
          expect(b.r, `${scope} card ${i} right`).toBeLessThanOrEqual(width + 1)
          expect(b.cut, `${scope} card ${i} text cut`).toBeLessThanOrEqual(1)
          expect(b.wide, `${scope} card ${i} text cut sideways`).toBeLessThanOrEqual(1)
        })
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!, c = boxes[j]!
          expect(a.l < c.r - 1 && c.l < a.r - 1 && a.t < c.b - 1 && c.t < a.b - 1, `${scope} cards ${i} and ${j} overlap`).toBe(false)
        }
      }
    })
  }
}
