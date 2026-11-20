import { expect, test, type Page } from '@playwright/test'
import { addDraft, axe, column, columnId, createBoard, noteByText, settle } from './helpers'

/**
 * The writing zone sits at the foot of its column (change writing-zone-at-column-bottom): below the published notes on every
 * screen, in view while the notes scroll, a new note scrolled into view, the keyboard reaching it first, and the fold and size
 * controls still working. On a phone the field is the bottom sheet and only the drafts tray is in the column.
 */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const problems = async (page: Page) => (await axe(page).withTags(WCAG).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)

/** Publishes `n` long ideas of the first column in one go (the column's own publish button). */
async function fillColumn(page: Page, n: number) {
  for (let i = 0; i < n; i++) await addDraft(page, 0, `Idea ${i} ${'long text '.repeat(6)}`)
  await column(page, 0).locator('[data-testid^="publish-"]').click()
  await expect(noteByText(page, `Idea ${n - 1} `)).toBeVisible()
  await settle(page)
}

const sizes = [
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'tablet', viewport: { width: 800, height: 900 } },
]
for (const { name, viewport } of sizes) {
  test.describe(`${name} ${viewport.width} px`, () => {
    test.use({ viewport })

    test('the zone is below the notes and stays in view when the column is long', async ({ page }) => {
      await createBoard(page, { template: 'start-stop-continue' })
      await fillColumn(page, 14)
      const col = column(page, 0)
      const id = await columnId(page, 0)
      const notes = col.locator('.notes')
      // The notes scroll inside the column, the zone does not move with them.
      expect(await notes.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
      await notes.evaluate((e) => { e.scrollTop = 0 })
      const field = (await col.getByTestId(`draft-${id}`).boundingBox())!
      const box = (await notes.boundingBox())!
      const colBox = (await col.boundingBox())!
      expect(field.y).toBeGreaterThanOrEqual(box.y + box.height - 1) // under the notes area
      expect(field.y + field.height).toBeLessThanOrEqual(colBox.y + colBox.height + 1) // inside the column
      expect(field.y + field.height).toBeLessThanOrEqual(viewport.height) // in view without scrolling
      await notes.evaluate((e) => { e.scrollTop = e.scrollHeight }) // at the end of the notes the last one sits right above the zone
      const lastNow = (await noteByText(page, 'Idea 13 ').boundingBox())!
      expect(field.y).toBeGreaterThanOrEqual(lastNow.y + lastNow.height - 1)
    })

    test('a note I publish is scrolled into view above the zone', async ({ page }) => {
      await createBoard(page, { template: 'start-stop-continue' })
      await fillColumn(page, 14)
      const col = column(page, 0)
      await col.locator('.notes').evaluate((e) => { e.scrollTop = 0 })
      await addDraft(page, 0, 'Brand new idea')
      await col.locator('[data-testid^="publish-"]').click()
      await expect(noteByText(page, 'Brand new idea')).toBeVisible()
      await expect(async () => {
        const note = (await noteByText(page, 'Brand new idea').boundingBox())!
        const notes = (await col.locator('.notes').boundingBox())!
        expect(note.y).toBeGreaterThanOrEqual(notes.y - 1)
        expect(note.y + note.height).toBeLessThanOrEqual(notes.y + notes.height + 1)
      }).toPass()
    })

    test('the skip link is the first stop after the title and reaches the field; fold and size controls work', async ({ page }) => {
      await createBoard(page, { template: 'start-stop-continue' })
      const col = column(page, 0)
      const id = await columnId(page, 0)
      await fillColumn(page, 3)
      const skip = col.getByTestId(`skip-write-${id}`)
      await skip.focus()
      await expect(skip).toBeVisible() // shows when it has the focus
      // Reading order: the link comes before the first note, the notes before the field.
      const order = await col.evaluate((el, fieldId) => {
        const link = el.querySelector('.skip-write')!
        const note = el.querySelector('.note')!
        const field = el.querySelector(`[data-testid="draft-${fieldId}"]`)!
        const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
        return { linkFirst: before(link, note), noteBeforeField: before(note, field) }
      }, id)
      expect(order).toEqual({ linkFirst: true, noteBeforeField: true })
      await page.keyboard.press('Enter')
      await expect(col.getByTestId(`draft-${id}`)).toBeFocused()

      // The size picker of the zone still grows the field.
      const small = (await col.getByTestId(`draft-${id}`).boundingBox())!.height
      await col.getByTestId(`area-large-${id}`).click()
      await expect(async () => expect((await col.getByTestId(`draft-${id}`).boundingBox())!.height).toBeGreaterThan(small + 40)).toPass()
      await col.getByTestId(`area-small-${id}`).click()

      // Fold: the zone slides away to a handle at the foot, the privacy line is gone, unfold brings it back.
      await col.getByTestId(`write-hide-${id}`).click()
      await expect(col.getByTestId(`draft-${id}`)).toBeHidden()
      await settle(page)
      const handle = (await col.getByTestId(`write-handle-${id}`).boundingBox())!
      const notes = (await col.locator('.notes').boundingBox())!
      expect(handle.y).toBeGreaterThanOrEqual(notes.y + notes.height - 1)
      await col.getByTestId(`write-handle-${id}`).click()
      await expect(col.getByTestId(`draft-${id}`)).toBeVisible()
      await expect(col.getByTestId(`only-you-${id}`)).toBeVisible()

      // The width control of the column (its header) still opens.
      await col.getByTestId(`col-size-${id}`).click()
      await expect(col.getByTestId(`size-wide-${id}`)).toBeVisible()
    })

    test.describe('dark', () => {
      test.use({ colorScheme: 'dark' })
      test('no accessibility violation with the zone at the foot', async ({ page }) => {
        await createBoard(page, { template: 'start-stop-continue' })
        await addDraft(page, 0, 'A draft in the tray')
        expect(await problems(page)).toEqual([])
      })
    })
  })
}

test.describe('360 px phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true })

  test('the drafts tray is below the notes and the composer is still the bottom sheet', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const id = await columnId(page, 0)
    const col = column(page, 0)
    await expect(col.locator('textarea')).toHaveCount(0)
    await expect(col.getByTestId(`skip-write-${id}`)).toHaveCount(0) // no zone in the column to skip to
    // A published note, then a draft: the tray is under the note.
    await page.getByTestId('compose-open').click()
    await page.getByTestId(`compose-chip-${id}`).click()
    await page.getByTestId(`draft-${id}`).fill('Published first')
    await page.getByTestId(`compose-publish-${id}`).click()
    await expect(noteByText(page, 'Published first')).toBeVisible()
    await addDraft(page, 0, 'Held in hand')
    const tray = (await col.getByTestId('drafts-tray').boundingBox())!
    const note = (await noteByText(page, 'Published first').boundingBox())!
    expect(tray.y).toBeGreaterThanOrEqual(note.y + note.height - 1)
    const colBox = (await col.boundingBox())!
    expect(tray.y + tray.height).toBeLessThanOrEqual(colBox.y + colBox.height + 1)
    // The write button floats over the foot of the column: the tray's own actions stay clear of it and tappable.
    const hit = await col.getByTestId('drafts-tray').locator('[data-testid^="draft-dismiss-"]').evaluate((b) => {
      const r = b.getBoundingClientRect()
      return b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
    })
    expect(hit).toBe(true)
    expect(await problems(page)).toEqual([])
  })

  test('bringing a new note into view does not fold the menus away', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    for (let i = 0; i < 6; i++) await addDraft(page, 0, `Idea ${i} ${'long text '.repeat(6)}`)
    await column(page, 0).locator('[data-testid^="publish-"]').click()
    await expect(noteByText(page, 'Idea 5 ')).toBeVisible()
    await settle(page)
    expect(await column(page, 0).locator('.notes').evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
    await expect(page.locator('nav.tools')).toBeVisible()
  })
})
