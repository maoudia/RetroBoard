import { expect, test } from '@playwright/test'
import { axe, settle } from './helpers'

// Change user-manual-and-tutorials: the static user guide under /guide/ loads under the strict CSP, has no console error,
// shows every picture, and passes the accessibility checks in both languages and both variants.
const CHAPTERS = ['create', 'invite', 'write', 'agenda', 'people', 'actions', 'present', 'export', 'options']

for (const locale of ['fr', 'en'] as const) {
  test(`guide ${locale}: every page loads under the CSP and every picture shows`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
    page.on('pageerror', (e) => problems.push(e.message))
    for (const name of ['index', ...CHAPTERS]) {
      const res = await page.goto(`/guide/${locale}/${name}.html`)
      expect(res?.status(), name).toBe(200)
      expect(res?.headers()['content-security-policy'], name).toContain("default-src 'none'")
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // Lazy pictures load when scrolled to: bring each visible one into view and wait for its pixels.
      const pictures = page.locator('img:visible')
      for (let i = 0; i < (await pictures.count()); i++) {
        const img = pictures.nth(i)
        await img.scrollIntoViewIfNeeded()
        await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth), { message: `${name}: picture ${i}` }).toBeGreaterThan(0)
      }
      if (name !== 'index') expect(await page.locator('img:visible').count(), name).toBeGreaterThan(0)
    }
    expect(problems).toEqual([])
  })

  for (const variant of ['light', 'dark'] as const) {
    test.describe(`${locale} ${variant}`, () => {
      test.use({ colorScheme: variant, reducedMotion: 'reduce' })
      test(`guide ${locale} ${variant}: the pages have no accessibility violation and the variant picks the right pictures`, async ({ page }) => {
        for (const name of ['index', 'write', 'agenda']) {
          await page.goto(`/guide/${locale}/${name}.html`)
          await settle(page)
          const scan = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
          expect(scan.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), `${name} ${variant}`).toEqual([])
        }
        await expect(page.locator('html')).toHaveAttribute('data-variant', variant)
        const shown = await page.locator('img:visible').evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((i) => i.src))
        expect(shown.length).toBeGreaterThan(0)
        expect(shown.filter((s) => !s.includes(`/${variant}/`))).toEqual([])
      })
    })
  }
}

test('the guide switch changes the variant, remembers it, and the other language keeps the chapter', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/guide/en/write.html')
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'light')
  await page.locator('#variant').click()
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'dark')
  await expect(page.locator('img:visible').first()).toHaveAttribute('src', /\/dark\//)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'dark')
  await page.getByRole('link', { name: 'Français' }).click()
  await expect(page).toHaveURL(/\/guide\/fr\/write(\.html)?$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Écrire')
})
