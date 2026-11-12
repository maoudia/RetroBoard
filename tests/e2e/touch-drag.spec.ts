import { expect, type Locator, type Page, test } from '@playwright/test'
import { axe, column, createBoard, noteByText, publishNote, settle } from './helpers'

/**
 * Touch grouping and moving (change responsive-and-i18n-hardening, task 3.2): on a 768 px tablet a long press lifts a note
 * or a cluster, dropping it on another note groups them, on a cluster merges or adds to it, on a column moves it.
 * Playwright has no long-press gesture: the finger is driven through the DevTools touch events (Chromium).
 */
test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })
test.skip(({ browserName }) => browserName !== 'chromium', 'the finger is driven through the DevTools protocol, a Chromium API')

const centre = async (loc: Locator) => {
  const box = (await loc.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** One finger: down on `from`, held for `holdMs`, then moved to `to` and lifted. */
async function finger(page: Page, from: Locator, to: Locator, holdMs: number) {
  const cdp = await page.context().newCDPSession(page)
  const a = await centre(from)
  const b = await centre(to)
  const touch = (x: number, y: number) => [{ x, y, id: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(a.x, a.y) })
  await page.waitForTimeout(holdMs)
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touch(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8) })
    await page.waitForTimeout(30)
  }
  await page.waitForTimeout(100)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await settle(page) // the cards slide to their new places
}
const LONG = 600
const clusters = (page: Page) => page.locator('[data-testid^="group-"]:not([data-testid^="group-with-"]):not([data-testid^="group-onto-"]):not([data-testid^="group-bulk"]):not([data-testid="group-panel"])')

test.describe('long press on a tablet', () => {
  test('a note dropped on another note makes a cluster', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await publishNote(page, 0, 'Three')
    await settle(page)

    await finger(page, noteByText(page, 'One'), noteByText(page, 'Two'), LONG)
    await expect(noteByText(page, 'One')).toHaveCount(0) // stacked in the cluster
    await expect(noteByText(page, 'Two')).toHaveCount(0)
    await expect(clusters(page)).toHaveCount(1)
    await expect(noteByText(page, 'Three')).toBeVisible()
    // Nothing is left half-dragged: no picture of the note on the screen and no marker on the cards.
    await expect(page.locator('.touch-ghost, [data-lifted]')).toHaveCount(0)
    expect((await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)).toEqual([])
  })

  test('a note dropped on a cluster joins it', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await publishNote(page, 0, 'Three')
    await settle(page)
    await finger(page, noteByText(page, 'One'), noteByText(page, 'Two'), LONG)
    await expect(clusters(page)).toHaveCount(1)

    await finger(page, noteByText(page, 'Three'), clusters(page).first(), LONG)
    await expect(noteByText(page, 'Three')).toHaveCount(0)
    await expect(clusters(page)).toHaveCount(1)
    await clusters(page).first().click()
    await expect(page.getByTestId('group-panel').locator('article.note')).toHaveCount(3)
  })

  test('a note dropped on another column moves there, a cluster too', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await publishNote(page, 0, 'Three')
    await settle(page)

    await finger(page, noteByText(page, 'Three'), column(page, 1).locator('.notes'), LONG)
    await expect(column(page, 1).getByTestId('note-text').filter({ hasText: 'Three' })).toHaveCount(1)
    await expect(column(page, 0).getByTestId('note-text').filter({ hasText: 'Three' })).toHaveCount(0)

    await finger(page, noteByText(page, 'One'), noteByText(page, 'Two'), LONG)
    await expect(clusters(page)).toHaveCount(1)
    await finger(page, clusters(page).first(), column(page, 1).locator('.notes'), LONG)
    await expect(column(page, 1).locator('[data-testid^="group-"]:not([data-testid="group-panel"])')).toHaveCount(1)
    await expect(column(page, 0).locator('[data-testid^="group-"]')).toHaveCount(0)
  })

  test('a short press or a swipe scrolls and never drags', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await settle(page)

    await finger(page, noteByText(page, 'One'), noteByText(page, 'Two'), 100) // lifted too early: a swipe
    await expect(noteByText(page, 'One')).toBeVisible()
    await expect(noteByText(page, 'Two')).toBeVisible()
    await expect(clusters(page)).toHaveCount(0)
  })

  test('a frozen board cannot be dragged', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await settle(page)
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-lock').check()
    await page.keyboard.press('Escape')
    await finger(page, noteByText(page, 'One'), noteByText(page, 'Two'), LONG)
    await expect(clusters(page)).toHaveCount(0)
    await expect(noteByText(page, 'One')).toBeVisible()
  })
})
