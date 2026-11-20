import { expect, test } from '@playwright/test'
import { TEMPLATES, localizeTemplate } from '../../packages/domain/src/index'
import { axe } from './helpers'

/** One page per retro format, in French and in English, built from the catalogue (change public-launch). */
const ID = 'starfish'
const OTHER = 'sailboat'

for (const [lang, prefix] of [['fr', ''], ['en', '/en']] as const) {
  for (const id of [ID, OTHER]) {
    test(`the ${lang} page of ${id} shows what the catalogue holds`, async ({ page }) => {
      const tpl = localizeTemplate(TEMPLATES.find((x) => x.id === id)!, lang)
      const res = await page.goto(`${prefix}/formats/${id}/`)
      expect(res?.status()).toBe(200)
      await expect(page.locator('html')).toHaveAttribute('lang', lang)
      await expect(page.getByTestId('format-name')).toHaveText(tpl.name)
      await expect(page.locator('main')).toContainText(tpl.description)
      await expect(page.getByTestId('format-column')).toHaveCount(tpl.columns.length)
      for (const [i, c] of tpl.columns.entries()) await expect(page.getByTestId('format-column').nth(i)).toContainText(`${c.title}${c.subtitle}`.replace(/\s+/g, ' ').slice(0, c.title.length)) // the title, then the hint
      for (const c of tpl.columns) await expect(page.getByTestId('format-column').filter({ hasText: c.subtitle })).toHaveCount(1)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${prefix}/formats/${id}/$`))
      const other = lang === 'fr' ? '/en' : ''
      await expect(page.locator(`link[rel="alternate"][hreflang="${lang === 'fr' ? 'en' : 'fr'}"]`)).toHaveAttribute('href', new RegExp(`${other}/formats/${id}/$`))
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', new RegExp(`(?<!/en)/formats/${id}/$`))
      await expect(page).toHaveTitle(new RegExp(tpl.name.replace(/[/()]/g, '\\$&')))
    })
  }
}

test('the index lists every format of the catalogue in both languages', async ({ page }) => {
  for (const [lang, prefix] of [['fr', ''], ['en', '/en']] as const) {
    await page.goto(`${prefix}/formats/`)
    await expect(page.getByTestId('formats-index')).toBeVisible()
    await expect(page.getByTestId('format-link')).toHaveCount(TEMPLATES.length)
    for (const t of TEMPLATES) await expect(page.locator(`a[href="${prefix}/formats/${t.id}/"]`)).toHaveText(localizeTemplate(t, lang).name)
  }
})

test('"Start this format" opens the setup with that format selected', async ({ page }) => {
  await page.goto(`/formats/${ID}/`)
  await page.getByTestId('format-start').click()
  await expect(page).toHaveURL(new RegExp(`/new\\?format=${ID}$`))
  await expect(page.getByTestId(`template-${ID}`)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('setup-submit')).toBeVisible()
})

test('an unknown format query leaves the usual default', async ({ page }) => {
  await page.goto('/new?format=nope')
  await page.getByTestId('tab-all').click()
  await expect(page.locator('[data-testid^="template-"][aria-pressed="true"]')).toHaveCount(1)
  await expect(page.getByTestId(`template-${ID}`)).toHaveAttribute('aria-pressed', 'false')
})

test('a format that does not exist is a 404', async ({ page }) => {
  expect((await page.goto('/formats/nope/'))?.status()).toBe(404)
})

test('the other language link switches the page, nothing leaves the site', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => { if (!r.url().startsWith('http://127.0.0.1')) external.push(r.url()) })
  await page.goto(`/formats/${ID}/`)
  await page.getByTestId('format-lang').click()
  await expect(page).toHaveURL(new RegExp(`/en/formats/${ID}/$`))
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(external).toEqual([])
})

for (const scheme of ['light', 'dark'] as const) {
  test(`axe is clean on a format page and the index (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme })
    await page.addInitScript((variant) => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant })) } catch { /* ignore */ } }, scheme)
    for (const path of [`/formats/${ID}/`, `/en/formats/${ID}/`, '/formats/']) {
      await page.goto(path)
      const { violations } = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), path).toEqual([])
    }
  })
}
