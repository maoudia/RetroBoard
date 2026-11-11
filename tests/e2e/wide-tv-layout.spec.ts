import { expect, test } from '@playwright/test'
import { createBoard, publishNote } from './helpers'

/**
 * Wide and TV layouts (change responsive-and-i18n-hardening, task 2.3): at 2560 and 3840 px a five-column board shows every
 * column side by side, nothing scrolls sideways and the text of a note is at least 24 px, even with the smallest text size.
 * The regression is on the geometry the screen class promises (sizes and boxes), not on pixels: a picture baseline taken on
 * a laptop would not match the Linux runners, and no screenshot baseline workflow exists in this repository.
 */
const SIZES = [{ width: 2560, height: 1440 }, { width: 3840, height: 2160 }] as const

for (const size of SIZES) {
  test(`a five-column board fits ${size.width} px with readable notes`, async ({ page }) => {
    await page.setViewportSize(size)
    await createBoard(page, { template: 'starfish', name: 'Alice' })
    // The facilitator's smallest text size must not take the notes under the TV floor.
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-noteText-small').click()
    await page.keyboard.press('Escape')
    await publishNote(page, 0, 'Un retour assez long pour que la carte passe a la ligne et se lise du fond de la salle')
    await expect(page.locator('html')).toHaveAttribute('data-screen', 'tv')

    const fonts = await page.getByTestId('note-text').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)))
    expect(fonts.length).toBeGreaterThan(0)
    for (const px of fonts) expect(px).toBeGreaterThanOrEqual(24)

    const cols = await page.locator('section[data-testid^="column-"]').evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width } }))
    expect(cols).toHaveLength(5)
    // All columns are on screen at once, side by side and of a similar width.
    for (const c of cols) { expect(c.left).toBeGreaterThanOrEqual(0); expect(c.right).toBeLessThanOrEqual(size.width) }
    for (let i = 1; i < cols.length; i++) expect(cols[i]!.left).toBeGreaterThanOrEqual(cols[i - 1]!.right - 1)
    const widths = cols.map((c) => c.width)
    expect(Math.max(...widths) / Math.min(...widths)).toBeLessThan(1.25)
    expect(Math.min(...widths)).toBeGreaterThan(size.width * 0.1)

    const scroll = await page.evaluate(() => ({ page: document.documentElement.scrollWidth - document.documentElement.clientWidth, board: (document.querySelector('main.board') as HTMLElement | null)?.scrollWidth, boardBox: (document.querySelector('main.board') as HTMLElement | null)?.clientWidth }))
    expect(scroll.page).toBeLessThanOrEqual(1)
    expect(scroll.board).toBeLessThanOrEqual(scroll.boardBox! + 1)
  })
}
