import { expect, test } from '@playwright/test'
import { addDraft, axe, column, columnId, createBoard, narrow, noteByText, publishNote, settle } from './helpers'

/** Publishing UX (change publishing-ux-redesign, tasks 2.1 and 2.2): the composer at the top of each column, the tray of drafts, the toolbar counter, the phone sheet. */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const problems = async (page: import('@playwright/test').Page) => (await axe(page).withTags(WCAG).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)

test.describe('wide screen', () => {
  test.skip(narrow, 'a phone writes in the bottom sheet (the 360 px describe below)')
  test('the composer sits at the top of the column, above the notes, and says who sees what', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Already there')
    const col = column(page, 0)
    const head = (await col.locator('header').first().boundingBox())!
    const composer = (await col.locator('label.composer').boundingBox())!
    const note = (await noteByText(page, 'Already there').boundingBox())!
    expect(composer.y).toBeGreaterThan(head.y)
    expect(composer.y + composer.height).toBeLessThan(note.y)
    await expect(col.getByTestId(`only-you-${await columnId(page, 0)}`)).toHaveText('Visible de toi seul jusqu\'à la publication.')
  })

  test('drafts hang in a tray under the composer, tilted with a ribbon; the toolbar counts them and publishes them all', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await expect(page.getByTestId('publish-all')).toHaveCount(0)
    await addDraft(page, 0, 'Premier')
    await addDraft(page, 0, 'Deuxième')
    await addDraft(page, 1, 'Troisième')
    await expect(page.getByTestId('draft-count')).toHaveText('3')
    await expect(page.getByTestId('publish-all')).toHaveAccessibleName('Tout publier 3 brouillon(s) privé(s)')

    const col = column(page, 0)
    const tray = col.getByTestId('drafts-tray')
    await expect(tray.locator('.ribbon')).toHaveText(['Brouillon', 'Brouillon'])
    const composer = (await col.locator('label.composer').boundingBox())!
    expect((await tray.boundingBox())!.y).toBeGreaterThan(composer.y + composer.height - 1)
    const tilts = await tray.locator('.draft').evaluateAll((els) => els.map((e) => getComputedStyle(e).rotate))
    expect(tilts.every((r) => r !== 'none' && r !== '0deg')).toBe(true)
    expect(new Set(tilts).size).toBe(2) // the papers do not all lean the same way

    expect(await problems(page)).toEqual([])

    await page.getByTestId('publish-all').click()
    for (const text of ['Premier', 'Deuxième', 'Troisième']) await expect(noteByText(page, text)).toBeVisible()
    await expect(page.getByTestId('draft-count')).toHaveCount(0)
    await expect(page.locator('[data-draft-id]')).toHaveCount(0)
  })

  test('the writing area folds up, and its handle brings it back at the top of the column', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const id = await columnId(page, 0)
    const col = column(page, 0)
    await col.getByTestId(`write-hide-${id}`).click()
    await expect(col.getByTestId(`draft-${id}`)).toBeHidden()
    await settle(page)
    const handle = (await col.getByTestId(`write-handle-${id}`).boundingBox())!
    const head = (await col.locator('header').first().boundingBox())!
    expect(handle.y).toBeGreaterThanOrEqual(head.y + head.height - 1)
    await col.getByTestId(`write-handle-${id}`).click()
    await expect(col.getByTestId(`draft-${id}`)).toBeVisible()
  })
})

test.describe('wide screen in English', () => {
  test.use({ locale: 'en-US' })
  test.skip(narrow, 'a phone writes in the bottom sheet (the 360 px describe below)')
  test('label, ribbon and toolbar counter are translated', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await addDraft(page, 0, 'First')
    await addDraft(page, 1, 'Second')
    await expect(column(page, 0).getByTestId(`only-you-${await columnId(page, 0)}`)).toHaveText('Only you see this until you publish.')
    await expect(page.locator('.ribbon').first()).toHaveText('Draft')
    await expect(page.getByTestId('draft-count')).toHaveText('2')
    await expect(page.getByTestId('publish-all')).toHaveAccessibleName('Publish all 2 private draft(s)')
  })
})

test.describe('360 px phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true })

  test('a write button opens a bottom sheet with one chip per column; the note goes to the chosen column', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    // The column keeps no field of its own: writing starts from the button in the thumb zone.
    await expect(page.locator('section[data-testid^="column-"] textarea')).toHaveCount(0)
    const fab = page.getByTestId('compose-open')
    const fabBox = (await fab.boundingBox())!
    expect(fabBox.height).toBeGreaterThanOrEqual(48)
    expect(fabBox.x + fabBox.width).toBeGreaterThan(360 / 2) // right half, where the thumb rests
    expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(740)
    const tabs = (await page.getByTestId('col-tabs').boundingBox())!
    expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(tabs.y + 1) // above the tab bar, never over it

    await fab.click()
    const sheet = page.getByTestId('compose-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.locator('textarea')).toBeFocused()
    const box = (await sheet.boundingBox())!
    expect(box.x).toBe(0)
    expect(box.width).toBe(360)
    expect(box.y + box.height).toBeCloseTo(740, 0) // glued to the foot of the screen

    const chips = sheet.locator('[data-testid^="compose-chip-"]')
    await expect(chips).toHaveCount(3)
    for (const chip of await chips.all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true') // the column in view

    const third = await columnId(page, 2)
    await page.getByTestId(`compose-chip-${third}`).click()
    await expect(page.getByTestId(`compose-chip-${third}`)).toHaveAttribute('aria-pressed', 'true')
    await expect(sheet.locator('textarea')).toHaveAttribute('data-testid', `draft-${third}`)
    await expect(sheet.locator('textarea')).toBeFocused()
    await sheet.locator('textarea').fill('Pour la troisième')
    await page.getByTestId(`compose-add-${third}`).click()
    await expect(page.getByTestId(`compose-chip-${third}`)).toContainText('1') // the chip counts the drafts of its column

    expect(await problems(page)).toEqual([])

    await page.getByTestId('compose-close').click()
    await expect(sheet).toHaveCount(0)
    await expect(fab).toBeFocused()
    await expect(column(page, 2).locator('[data-draft-id]')).toContainText('Pour la troisième')
    await expect(column(page, 0).locator('[data-draft-id]')).toHaveCount(0)
    await expect(page.getByTestId('draft-count')).toHaveText('1')
  })

  test('Escape, a tap beside the sheet and Publish now close it; the sheet stays open after Add', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const sheet = page.getByTestId('compose-sheet')
    const open = async () => { await page.getByTestId('compose-open').click(); await expect(sheet.locator('textarea')).toBeFocused() }

    await open()
    await page.keyboard.press('Escape') // empty field: the sheet closes
    await expect(sheet).toHaveCount(0)

    await open()
    await sheet.locator('textarea').fill('à moitié')
    await page.keyboard.press('Escape') // first Escape clears the text, the sheet stays
    await expect(sheet.locator('textarea')).toHaveValue('')
    await expect(sheet).toBeVisible()
    await page.mouse.click(180, 40) // the dimmed page above the sheet
    await expect(sheet).toHaveCount(0)

    await open()
    await sheet.locator('textarea').fill('Un')
    await sheet.locator('[data-testid^="compose-add-"]').click()
    await expect(sheet).toBeVisible()
    await sheet.locator('textarea').fill('Deux')
    await sheet.locator('[data-testid^="compose-publish-"]').click()
    await expect(sheet).toHaveCount(0)
    for (const text of ['Un', 'Deux']) await expect(noteByText(page, text)).toBeVisible()
  })

  test('the tray stays in the column: ribbon, publish count, and nothing leaves the screen sideways', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await addDraft(page, 0, 'Un brouillon assez long pour passer à la ligne sur un écran de 360 px de large')
    const col = column(page, 0)
    await expect(col.locator('.ribbon')).toHaveText('Brouillon')
    const pub = col.locator('[data-testid^="publish-"]')
    expect((await pub.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(await problems(page)).toEqual([])
    await pub.click()
    await expect(noteByText(page, 'Un brouillon')).toBeVisible()
    await expect(col.locator('[data-draft-id]')).toHaveCount(0)
  })
})
