import { expect, type Page, test } from '@playwright/test'
import { axe, createBoard, publishNote } from './helpers'

/**
 * Overflow check (change responsive-and-i18n-hardening, task 2.2): at 360, 768 and 1440 px, in French, English and the
 * pseudo-locale (`?lang=pseudo`, about 40% longer), nothing leaves the screen sideways and no control is cut off.
 * A strip that scrolls on purpose (overflow-x auto or scroll) is fine as long as the strip itself fits the screen.
 */
const WIDTHS = [360, 768, 1440] as const
/** The browser language picks fr or en; the pseudo-locale is the French interface lengthened (`?lang=pseudo`). */
const LANGS = [{ id: 'fr', locale: 'fr-FR', query: '' }, { id: 'en', locale: 'en-US', query: '?lang=x' }, { id: 'pseudo', locale: 'fr-FR', query: '?lang=pseudo' }] as const

/** Visible elements that stick out of the screen or are clipped without a way to reach them. */
export async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const out: string[] = []
    const name = (el: Element) => `${el.tagName.toLowerCase()}${el.getAttribute('data-testid') ? `[${el.getAttribute('data-testid')}]` : el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''}`
    if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${vw}`)
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[inert], [hidden], dialog:not([open]), [popover]:not(:popover-open)')) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // The visually-hidden labels (1 px boxes) and the ambient canvas are not content.
      if (r.width <= 1 || el.closest('.ambient, .sr-only')) continue
      // A strip that scrolls on purpose owns the overflow of what it holds; the other scrolling boxes (a column's notes) do not.
      const owned = !!el.parentElement?.closest('nav.tools, .votebar, main.board, .col-tabs, .stepper, .drafts')
      const interactive = el.matches('button, a[href], input, select, textarea, [role="tab"], [role="menuitem"]')
      if (!owned && interactive && (r.right > vw + 1 || r.left < -1)) out.push(`${name(el)} leaves the screen: ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`)
      // A control stays inside its note, column or writing area.
      const card = interactive ? el.parentElement?.closest('article.note, section.col, .composer') : null
      if (card) {
        const c = card.getBoundingClientRect()
        if (r.left < c.left - 2 || r.right > c.right + 2) out.push(`${name(el)} escapes its ${name(card)}: ${Math.round(r.left)}..${Math.round(r.right)} of ${Math.round(c.left)}..${Math.round(c.right)}`)
      }
      // Text cut by its own box with no ellipsis: the clip hides words.
      if (interactive && !el.matches('input, textarea') && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push(`${name(el)} clips its content: ${el.scrollWidth} > ${el.clientWidth}`)
    }
    // A scrolling strip must itself sit inside the screen.
    for (const el of document.querySelectorAll<HTMLElement>('nav.tools, .votebar, main.board, .stepper')) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) out.push(`${name(el)} strip is wider than the screen: ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`)
    }
    return out
  })
}

test.describe('overflow at 360, 768 and 1440 px in fr, en and pseudo (change responsive-and-i18n-hardening)', () => {
  for (const lang of LANGS) {
    test.describe(lang.id, () => {
      test.use({ locale: lang.locale })
      for (const width of WIDTHS) {
        test(`the board fits ${width} px`, async ({ page }) => {
          await page.setViewportSize({ width, height: width < 600 ? 740 : 900 })
          await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Rétrospective du sprint' })
          await publishNote(page, 0, 'Un retour assez long pour que la carte passe à la ligne sur un petit écran')
          // The board lives in this browser (a relay keeps nothing): reload the same page with the language switch.
          const url = new URL(page.url())
          url.search = lang.query
          await page.goto(url.href)
          await expect(page.getByTestId('board')).toBeVisible()
          expect(await overflowing(page)).toEqual([])
        })
      }
    })
  }

  test('toolbar buttons keep their labels when they fit and turn icon-only, still named, when they do not', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const toolbar = page.locator('header.toolbar')
    await expect(toolbar).not.toHaveAttribute('data-compact', '')
    const share = page.getByTestId('btn-share')
    expect((await share.locator('span').first().boundingBox())!.width).toBeGreaterThan(8) // the label shows
    // 768 px: the pseudo-locale labels no longer fit.
    await page.setViewportSize({ width: 768, height: 900 })
    const url = new URL(page.url())
    url.search = '?lang=pseudo'
    await page.goto(url.href)
    await expect(toolbar).toHaveAttribute('data-compact', '')
    const buttons = page.locator('nav.tools .icon-btn')
    const n = await buttons.count()
    expect(n).toBeGreaterThan(6)
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i)
      const named = (await b.getAttribute('aria-label')) || (await b.getAttribute('title')) || (await b.innerText()).trim() || (await b.locator('.sr-only, span').first().textContent())?.trim()
      expect(named, `tool ${i} has a name`).toBeTruthy()
      expect((await b.boundingBox())!.width, `tool ${i} is a real target`).toBeGreaterThanOrEqual(44)
    }
    // The tools fit their row: nothing scrolls.
    expect(await page.locator('nav.tools').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    expect((await axe(page).include('header.toolbar').withRules(['button-name', 'target-size']).analyze()).violations).toEqual([])
  })

  for (const width of WIDTHS) {
    test(`the landing and creation pages fit ${width} px in pseudo`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      for (const path of ['/?lang=pseudo', '/new?lang=pseudo']) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        expect(await overflowing(page), path).toEqual([])
      }
    })
  }
})
