import { expect, type Page, test } from '@playwright/test'
import { addDraft, axe, column, columnId as colId, composeField, createBoard, noteByText, settle } from './helpers'

/**
 * Notes at scale (change postit-visual-system, tasks 1.2 and 1.3): a column of 60 notes of every length packs into a masonry, the text
 * never goes under 14 px, long text is clipped with a "read more" and the density and zoom shortcuts change the look and stay on this device.
 * No screenshot baseline exists yet (a future visual-regression change): the checks are on the geometry and the sizes the specification promises.
 */
const FILLER = 'une idee qui prend de la place et qui revient souvent dans les retrospectives de toute equipe '
/** 60 notes, from a few words to the longest text a new board accepts (160 characters). */
const fixture = Array.from({ length: 60 }, (_, i) => `Note ${i + 1} ${FILLER.repeat(1 + (i % 4)).slice(0, 8 + ((i * 37) % 140))}`.trim())

/**
 * Publishes `texts` in one go. More than a few drafts are written straight into the private draft store of this browser (what the
 * composer does for each one: sixty clicks would take two minutes), after one real draft has created the store; a reload loads them.
 */
async function publishAll(page: Page, colIndex: number, texts: string[]) {
  if (texts.length <= 3) for (const t of texts) await addDraft(page, colIndex, t)
  else {
    await addDraft(page, colIndex, 'seed')
    const columnId = await colId(page, colIndex)
    await page.evaluate(([cid, all]) => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('retroboard:drafts:'))!
      localStorage.setItem(key, JSON.stringify((all as string[]).map((text, i) => ({ id: `seed${i}`, columnId: cid, text, color: i % 8 }))))
    }, [columnId, texts] as const)
    await page.reload()
    await expect(page.getByTestId('board')).toBeVisible()
  }
  await column(page, colIndex).locator('[data-testid^="publish-"]').click()
  await expect(column(page, colIndex).locator('article.note')).toHaveCount(texts.length)
  await settle(page)
}

const fontSizes = (page: Page) => page.getByTestId('note-text').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)))
/** Layout boxes inside the grid: a note is tilted a degree or two, which moves its bounding box but not its place in the masonry. */
const rects = (page: Page) => column(page, 0).locator('article.note').evaluateAll((els) => els.map((el) => { const n = el as HTMLElement; return { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight } }))

test.describe('60 notes in a column', () => {
  test.skip(({ isMobile }) => isMobile, 'laptop geometry')

  test('masonry, a 14 px text floor, the column scrolls and long notes offer "read more"', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    // The facilitator's smallest text size must not take the notes under the floor either.
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-noteText-small').click()
    await page.keyboard.press('Escape')
    await publishAll(page, 0, fixture)

    // Readable: every note text is at least 14 px.
    const fonts = await fontSizes(page)
    expect(fonts).toHaveLength(60)
    for (const px of fonts) expect(px).toBeGreaterThanOrEqual(14)

    // The column scrolls instead of growing the page.
    const notes = column(page, 0).locator('.notes')
    expect(await notes.evaluate((el) => el.scrollHeight > el.clientHeight + 50)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBeLessThanOrEqual(1)

    // Masonry: the notes sit in several visual columns, none overlaps another, and a column has no hole (the next note starts right under the previous one).
    const boxes = await rects(page)
    const xs = [...new Set(boxes.map((b) => b.x))]
    expect(xs.length).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!
      const apart = a.x + a.w <= b.x + 1 || b.x + b.w <= a.x + 1 || a.y + a.h <= b.y + 1 || b.y + b.h <= a.y + 1
      expect(apart, `notes ${i + 1} and ${j + 1} overlap`).toBe(true)
    }
    for (const x of xs) {
      const stack = boxes.filter((b) => b.x === x).sort((a, b) => a.y - b.y)
      for (let k = 1; k < stack.length; k++) expect(stack[k]!.y - (stack[k - 1]!.y + stack[k - 1]!.h), 'gap between stacked notes').toBeLessThan(24)
    }
    // Different heights: a row grid would have given every note of a row the height of the tallest.
    expect(new Set(boxes.map((b) => b.h)).size).toBeGreaterThan(3)

    // At the comfortable level a 160-character note still fits its eight lines; the dense level keeps three, so the long ideas are clipped
    // with a way to the rest, and the short ones show everything and no button.
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await page.keyboard.press('d')
    await page.keyboard.press('d')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'dense')
    for (const px of await fontSizes(page)) expect(px).toBeGreaterThanOrEqual(14)
    const more = column(page, 0).locator('[data-testid^="note-more-"]')
    await expect(async () => expect(await more.count()).toBeGreaterThan(0)).toPass()
    expect(await more.count()).toBeLessThan(60)
    const longNote = column(page, 0).locator('article.note:has([data-testid^="note-more-"])').first()
    const text = longNote.getByTestId('note-text')
    expect(await text.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true)
    await expect(more.first()).toHaveAttribute('aria-expanded', 'false')
    await expect(more.first()).toHaveText('Lire la suite')
    await more.first().click()
    await expect(more.first()).toHaveAttribute('aria-expanded', 'true')
    await expect(more.first()).toHaveText('Réduire')
    expect(await text.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
    await more.first().click()
    await expect(more.first()).toHaveText('Lire la suite')
    expect(await text.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true)
  })

  test('a short note is not clipped and has no "read more"', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishAll(page, 0, ['Bref'])
    await expect(page.locator('[data-testid^="note-more-"]')).toHaveCount(0)
    expect(await page.getByTestId('note-text').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
  })

  test('an expanded cluster takes the whole width of the column, its notes inside', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishAll(page, 0, ['Premiere', 'Deuxieme', 'Troisieme'])
    // A drop that lands while the column is still reflowing misses: drop again until the cluster is there.
    await expect(async () => {
      await noteByText(page, 'Deuxieme').dragTo(noteByText(page, 'Premiere'))
      await settle(page)
      await expect(column(page, 0).locator('[data-testid^="expand-"]')).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 10_000 })
    await column(page, 0).locator('[data-testid^="expand-"]').click()
    const inline = column(page, 0).locator('[data-testid^="cluster-inline-"]')
    await expect(inline).toBeVisible()
    const widths = await Promise.all([inline, column(page, 0).locator('.grid')].map((l) => l.evaluate((el) => el.getBoundingClientRect().width)))
    expect(widths[0]!).toBeGreaterThan(widths[1]! - 2)
  })

  test('the page passes axe with clipped notes in light and dark', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishAll(page, 0, fixture.slice(0, 20))
    // The dense level keeps three lines: the long ideas are clipped.
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await page.keyboard.press('d')
    await page.keyboard.press('d')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'dense')
    await expect(page.locator('[data-testid^="note-more-"]').first()).toBeVisible()
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      const found = (await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
      expect(found, scheme).toEqual([])
    }
  })
})

test.describe('density and zoom shortcuts', () => {
  test.skip(({ isMobile }) => isMobile, 'hardware keyboard')

  async function boardWithNotes(page: Page) {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishAll(page, 0, ['Premiere idee un peu longue pour passer a la ligne', 'Deuxieme idee', 'Troisieme idee avec un texte plus long encore pour voir ce que fait la densite sur trois lignes'])
    await page.locator('body').click({ position: { x: 5, y: 300 } })
  }
  const html = (page: Page, attr: string) => page.locator('html').getAttribute(attr)
  const gridFont = (page: Page) => page.locator('.grid').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const colWidth = (page: Page) => page.locator('.grid').first().evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('column-width')))

  test('d cycles the density, + - 0 zoom the notes, and the choice survives a reload', async ({ page }) => {
    await boardWithNotes(page)
    expect(await html(page, 'data-density')).toBe('comfortable')
    expect(await html(page, 'data-zoom')).toBe('100')
    const w0 = await colWidth(page)
    const f0 = await gridFont(page)

    await page.keyboard.press('d')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
    await expect(page.getByText('Densité des post-its : Compacte')).toBeVisible()
    await page.keyboard.press('d')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'dense')
    await expect(async () => expect(await colWidth(page)).toBeLessThan(w0)).toPass()
    await page.keyboard.press('d')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'comfortable')

    await page.keyboard.press('+')
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '115')
    await expect(page.getByText('Zoom des post-its : 115 %')).toBeVisible()
    await expect(async () => { expect(await gridFont(page)).toBeGreaterThan(f0); expect(await colWidth(page)).toBeGreaterThan(w0) }).toPass()
    await page.keyboard.press('=')
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '130')
    await page.keyboard.press('-')
    await page.keyboard.press('-')
    await page.keyboard.press('-')
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '90')

    // Reload: both choices are kept on this device, for this kind of screen.
    await page.keyboard.press('d')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
    await page.reload()
    await expect(page.getByTestId('board')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '90')
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await page.keyboard.press('0')
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '100')
  })

  test('the zoom stops at both ends and the text never goes under 14 px', async ({ page }) => {
    await boardWithNotes(page)
    for (let i = 0; i < 8; i++) await page.keyboard.press('-')
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '80')
    await page.keyboard.press('d')
    await page.keyboard.press('d')
    await expect(page.locator('html')).toHaveAttribute('data-density', 'dense')
    for (const px of await fontSizes(page)) expect(px).toBeGreaterThanOrEqual(14)
    await page.keyboard.press('0')
    for (let i = 0; i < 8; i++) await page.keyboard.press('+')
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '150')
    // Zoomed in, nothing overflows the column sideways.
    expect(await column(page, 0).locator('.notes').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  })

  test('typing + - 0 d in a field does not zoom; the keys are off when shortcuts are off', async ({ page }) => {
    await boardWithNotes(page)
    const field = await composeField(page, 0)
    await field.fill('')
    await field.press('+')
    await field.press('d')
    expect(await html(page, 'data-zoom')).toBe('100')
    expect(await html(page, 'data-density')).toBe('comfortable')
    await page.keyboard.press('Escape')
    await page.evaluate(() => localStorage.setItem('retroboard:settings', JSON.stringify({ uiMode: 'advanced', shortcuts: false })))
    await page.reload()
    await expect(page.getByTestId('board')).toBeVisible()
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await page.keyboard.press('+')
    await page.keyboard.press('d')
    expect(await html(page, 'data-zoom')).toBe('100')
    expect(await html(page, 'data-density')).toBe('comfortable')
  })

  test('the profile offers the three densities and a zoom control, and the help lists the keys', async ({ page }) => {
    await boardWithNotes(page)
    await page.getByTestId('btn-profile').click()
    await page.getByTestId('density-dense').click()
    await expect(page.locator('html')).toHaveAttribute('data-density', 'dense')
    await page.getByTestId('zoom-in').click()
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '115')
    await expect(page.getByTestId('zoom-reset')).toHaveText('115%')
    await page.getByTestId('zoom-reset').click()
    await expect(page.locator('html')).toHaveAttribute('data-zoom', '100')
    for (let i = 0; i < 2; i++) await page.getByTestId('zoom-out').click()
    await expect(page.getByTestId('zoom-out')).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('zoom-in')).toBeHidden()
    // The key may land while the profile still closes: press it until the help opens.
    await expect(async () => {
      await page.locator('body').press('?')
      await expect(page.getByText('Changer la densité des post-its')).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 8000 })
    await expect(page.getByText('Agrandir les post-its')).toBeVisible()
  })
})
