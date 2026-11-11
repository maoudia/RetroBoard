import { expect, test } from '@playwright/test'
import { axe, createBoard, noteByText, publishNote, settle } from './helpers'

/** Phone layout (change responsive-and-i18n-hardening, tasks 2.1 and 2.4): 360 px wide, touch, French. */
test.use({ viewport: { width: 360, height: 740 }, hasTouch: true })

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.describe('board on a 360 px phone', () => {
  test('write, publish and vote with the tab bar and thumb-sized buttons', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const col = page.locator('section[data-testid^="column-"]').first()

    // The composer's add and publish buttons are thumb-sized.
    await col.locator('textarea').fill('Daily trop long')
    for (const id of ['compose-add-', 'compose-publish-']) {
      const box = (await col.locator(`[data-testid^="${id}"]`).boundingBox())!
      expect(box.height, id).toBeGreaterThanOrEqual(48)
      expect(box.width, id).toBeGreaterThanOrEqual(48)
    }
    await col.locator('[data-testid^="compose-add-"]').click()
    const pub = col.locator('[data-testid^="publish-"]')
    expect((await pub.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    await pub.click()
    await expect(noteByText(page, 'Daily trop long')).toBeVisible()
    await settle(page)

    // Vote.
    await noteByText(page, 'Daily trop long').locator('[data-testid^="vote-"]').click()
    await expect(page.getByTestId('votes-left')).toContainText('2')

    // The tab bar: one tab per column, thumb high, the current one is marked, a tap brings the column.
    const tabs = page.getByTestId('col-tabs')
    await expect(tabs.locator('.tab')).toHaveCount(3)
    const tab = page.getByTestId('col-tab-2')
    expect((await tab.boundingBox())!.height).toBeGreaterThanOrEqual(48)
    const bar = (await tabs.boundingBox())!
    expect(bar.y + bar.height).toBeGreaterThanOrEqual(740 - 1) // at the foot of the screen
    await tab.click()
    await expect(tab).toHaveAttribute('aria-current', 'true')
    await expect.poll(async () => (await page.locator('section[data-testid^="column-"]').nth(2).boundingBox())!.x).toBeLessThan(40)

    const found = (await axe(page).withTags(WCAG).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    expect(found).toEqual([])
  })

  test('group two notes from the note menu, a bottom sheet in the thumb zone', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await publishNote(page, 0, 'Three')

    // Menus need settle time (Firefox, WebKit): open and act together until it sticks.
    await expect(async () => {
      await noteByText(page, 'One').locator('[data-testid^="note-menu-"]').click()
      await expect(page.locator('[data-testid^="group-with-"]')).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 10_000 })

    // The menu is a sheet: full width, glued to the bottom edge, rows 48 px high.
    const sheet = page.locator('.dd-panel:popover-open')
    await expect(sheet).toHaveAttribute('data-sheet', '')
    await settle(page) // the sheet slides up from the bottom edge
    const box = (await sheet.boundingBox())!
    expect(box.x).toBe(0)
    expect(box.width).toBe(360)
    expect(box.y + box.height).toBeCloseTo(740, 0)
    expect((await page.locator('[data-testid^="group-with-"]').boundingBox())!.height).toBeGreaterThanOrEqual(48)
    const found = (await axe(page).withTags(WCAG).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])

    await page.locator('[data-testid^="group-with-"]').click()
    await page.locator('[data-testid^="group-onto-"]').filter({ hasText: 'Two' }).click()
    await page.getByTestId('group-bulk-go').click()
    await expect(noteByText(page, 'One')).toHaveCount(0) // stacked in the cluster
    await expect(page.locator('.cluster').first()).toBeVisible()
  })

  test('a tap on the dimmed backdrop closes the sheet', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'One')
    await expect(async () => {
      await noteByText(page, 'One').locator('[data-testid^="note-menu-"]').click()
      await expect(page.locator('.dd-panel:popover-open')).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 10_000 })
    await page.mouse.click(180, 60)
    await expect(page.locator('.dd-panel:popover-open')).toHaveCount(0)
  })
})

test.describe('primary actions in the thumb zone on a 360 px phone', () => {
  test('landing: "Start a retro" spans the width at the bottom of the screen', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByTestId('hero-create')
    await expect(cta).toBeVisible()
    const at = async () => (await cta.boundingBox())!
    const first = await at()
    expect(first.height).toBeGreaterThanOrEqual(48)
    expect(first.width).toBeGreaterThanOrEqual(360 - 32)
    expect(first.y + first.height).toBeGreaterThan(740 - 32)
    // It stays there while the page scrolls.
    await page.evaluate(() => window.scrollTo(0, 1200))
    const scrolled = await at()
    expect(scrolled.y).toBeCloseTo(first.y, 0)
    // Joining is as easy to hit.
    await page.getByTestId('join-go').scrollIntoViewIfNeeded()
    await expect.poll(async () => (await page.getByTestId('join-go').boundingBox())!.height).toBeGreaterThanOrEqual(48) // the form is revealed with a short zoom
    const found = (await axe(page).withTags(WCAG).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    expect(found).toEqual([])
  })

  test('creation page: "Create board" is full width and stays at the bottom while the form scrolls', async ({ page }) => {
    await page.goto('/new')
    const go = page.getByTestId('setup-submit')
    await expect(go).toBeVisible()
    const box = (await go.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(48)
    expect(box.width).toBeGreaterThanOrEqual((await page.getByTestId('setup-form').boundingBox())!.width - 1) // as wide as the form
    // At the top of a long form the button is already in view, at the foot of the screen.
    expect(box.y + box.height).toBeGreaterThan(740 - 32)
    expect(box.y + box.height).toBeLessThanOrEqual(740)
    // axe target-size on the button where it floats over the form, then the whole page at the end of the form, where it rests in place
    // (a floating bar always covers a little of what scrolls under it: that is not a page defect).
    const onTop = (await axe(page).include('[data-testid="setup-submit"]').withRules(['target-size']).analyze()).violations.map((v) => v.id)
    expect(onTop).toEqual([])
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect.poll(async () => (await go.boundingBox())!.y + (await go.boundingBox())!.height).toBeLessThanOrEqual(740)
    const found = (await axe(page).withTags(WCAG).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    expect(found).toEqual([])
  })
})
