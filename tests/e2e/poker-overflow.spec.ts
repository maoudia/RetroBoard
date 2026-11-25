import { expect, type Page, test } from '@playwright/test'
import { overflowing } from './helpers'

/**
 * Overflow of the Scrum Poker routes (change poker-design-v2, task 6.2, K12): at 360, 390, 768 and 1440 px, in French, English and the pseudo-locale
 * (`?lang=pseudo`, about 40% longer), with eight voters whose names have 24 characters, nothing leaves the screen sideways, no control is cut off, a
 * button label stays on one line and a hint takes two lines at most, on the start page, the name step and the room in every state. The eight
 * voters are eight tabs of one browser (the seat lives in the tab's session storage).
 */
const WIDTHS = [360, 390, 768, 1440] as const
const LANGS = [{ id: 'fr', locale: 'fr-FR', query: '' }, { id: 'en', locale: 'en-US', query: '' }, { id: 'pseudo', locale: 'fr-FR', query: '?lang=pseudo' }] as const
const longName = (i: number) => `Maximilienne-Alexandra ${String(i).padStart(2, '0')}`.slice(0, 24)
const participantLink = (page: Page) => page.url().replace(/(#c=[A-Za-z0-9_-]{44})[A-Za-z0-9_-]+$/, '$1')

/** What `overflowing` does not know about the poker pages: a label on two lines, a hint on three, a seat name that escapes its seat. */
async function crowded(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('button, a.btn, .chip')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || el.closest('[hidden], .sr-only')) continue
      const line = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3
      // Chips and buttons are 44 px or more high; two lines of text would add a line height to it.
      if (r.height > 44 + line * 0.9 && !el.closest('[data-testid="poker-hand"], [data-testid="poker-ghost"]') && r.width > 60) out.push(`${el.getAttribute('data-testid') ?? el.className} wraps its label: ${Math.round(r.height)} px high`)
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-testid="poker-hint"], .hint, .line')) {
      const line = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3
      if (el.getBoundingClientRect().height > line * 2.2 + 2) out.push(`a hint takes more than two lines: ${Math.round(el.getBoundingClientRect().height)} px`)
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-testid="poker-seat"]')) {
      const seat = el.getBoundingClientRect()
      for (const child of el.querySelectorAll<HTMLElement>('*')) {
        const r = child.getBoundingClientRect()
        if (r.width > 0 && (r.left < seat.left - 2 || r.right > seat.right + 2)) out.push(`${child.className} leaves its seat`)
      }
    }
    return out
  })
}

for (const lang of LANGS) {
  test.describe(`poker, ${lang.id}`, () => {
    for (const width of WIDTHS) {
      test(`the start page, the name step and a room of eight with 24-character names fit ${width} px`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 700 : 900 }, locale: lang.locale, reducedMotion: 'reduce' })
        const pages = await Promise.all(Array.from({ length: 8 }, () => ctx.newPage()))
        const a = pages[0]!
        const fits = async (page: Page, where: string) => { expect([...await overflowing(page), ...await crowded(page)], `${lang.id} ${width}: ${where}`).toEqual([]) }

        await a.goto(`/poker${lang.query}`)
        // The pseudo-locale reaches the poker strings (the room is lengthened too, on the page the guests open as well).
        await expect(a.getByTestId('poker-start-action')).toHaveText(lang.id === 'pseudo' ? /^\s*\[.*\]\s*$/ : /^[^[]+$/)
        await a.getByTestId('poker-deck-custom').check({ force: true })
        await fits(a, 'start page (Custom)')
        await a.getByTestId('poker-start-action').click()
        await expect(a.getByTestId('poker-name')).toBeVisible()
        await a.getByTestId('poker-name').fill(longName(0))
        await fits(a, 'name step')
        await a.getByTestId('poker-name-join').click()
        await expect(a.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
        await expect(a.getByTestId('poker-round')).toHaveText(lang.id === 'pseudo' ? /^\[.*\]$/ : /^[^[]+$/)
        await fits(a, 'room alone')

        const [base, hash] = participantLink(a).split('#')
        await Promise.all(pages.slice(1).map(async (page, i) => {
          await page.goto(`${base}${lang.query}#${hash}`)
          await page.getByTestId('poker-name').fill(longName(i + 1))
          await page.getByTestId('poker-name-join').click()
          await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
        }))
        await expect(a.getByTestId('poker-seat')).toHaveCount(8)
        await fits(a, 'lobby of eight')
        await fits(pages[1]!, 'a guest, lobby of eight')
        await a.getByTestId('poker-card-4').check({ force: true })
        await expect(a.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(1)
        await fits(a, 'waiting')
        for (const [i, page] of pages.slice(1).entries()) await page.getByTestId(`poker-card-${[4, 4, 6, 5, 4, 7, 11][i]}`).check({ force: true })
        await expect(a.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(8)
        await a.getByTestId('poker-reveal').click()
        await expect(a.getByTestId('poker-results')).toBeVisible()
        await fits(a, 'revealed')
        await fits(pages[1]!, 'a guest, revealed')
        await ctx.close()
      })
    }
  })
}
