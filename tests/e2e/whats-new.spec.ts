import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { parseChangelog } from '../../apps/web/app/utils/changelog'
import { axe } from './helpers'

/** The What's new page: the releases of CHANGELOG.md, built into a static page in both languages (change public-launch). */
const latest = parseChangelog(readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf8'), 1)[0]!
const firstItem = latest.sections[0]!.items[0]!

for (const [lang, prefix] of [['fr', ''], ['en', '/en']] as const) {
  test(`the ${lang} page lists the latest release of the changelog`, async ({ page }) => {
    const res = await page.goto(`${prefix}/whats-new`)
    expect(res?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    await expect(page.getByTestId('release').first()).toContainText(`Version ${latest.version}`)
    await expect(page.getByTestId('release').first().locator('time')).toHaveAttribute('datetime', latest.date)
    await expect(page.getByTestId('release-item').first()).toContainText(firstItem.text)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${prefix}/whats-new$`))
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', /(?<!\/en)\/whats-new$/)
    await expect(page.locator('main')).toContainText(/PolyForm Noncommercial/)
    await expect(page.locator('main')).not.toContainText(/open[ -]source/i)
  })
}

test('the page is in the HTML as served, with no script needed', async ({ request }) => {
  const html = await (await request.get('/en/whats-new')).text()
  expect(html).toContain(`Version ${latest.version}`)
  expect(html).toContain('data-testid="release-item"')
})

test('the landing footer links to the page in the visitor language, nothing leaves the site', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1')) external.push(r.url()) })
  await page.goto('/')
  await expect(page.getByTestId('link-whats-new')).toHaveAttribute('href', /^\/(en\/)?whats-new$/)
  await page.getByTestId('link-whats-new').click()
  await expect(page.getByTestId('whats-new')).toBeVisible()
  await page.getByTestId('whats-new-lang').click()
  await expect(page).toHaveURL(/\/en\/whats-new$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(external).toEqual([])
})

test('the sitemap lists both pages once indexing is on, and the pages stay noindex while it is off', async ({ page, request }) => {
  const meta = async (path: string) => { await page.goto(path); return page.locator('meta[name="robots"]').getAttribute('content') }
  const site = JSON.parse(readFileSync(new URL('../../apps/web/site.json', import.meta.url), 'utf8')) as { indexing: string }
  const expected = site.indexing === 'public' ? 'index, follow' : 'noindex, nofollow'
  expect(await meta('/whats-new')).toBe(expected)
  expect(await meta('/en/whats-new')).toBe(expected)
  const xml = await (await request.get('/sitemap.xml')).text()
  expect(xml).toContain('/whats-new</loc>')
  expect(xml).toContain('/en/whats-new</loc>')
})

for (const scheme of ['light', 'dark'] as const) {
  test(`axe is clean on both pages (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme })
    await page.addInitScript((variant) => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant })) } catch { /* ignore */ } }, scheme)
    for (const path of ['/whats-new', '/en/whats-new']) {
      await page.goto(path)
      const { violations } = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), path).toEqual([])
    }
  })
}
