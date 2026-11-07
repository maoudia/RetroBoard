import { expect, test } from '@playwright/test'
import { axe, createBoard, join, noteByText, publishNote, settle } from './helpers'

test.describe('presenter column focus (presenter-mode-v2)', () => {
  test.skip(({ isMobile }) => isMobile, 'presenter mode is for large screens')

  test('arrow keys focus a column, the style switches and Escape steps back', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-presenter').click()
    const bar = page.getByTestId('presenter-focus')
    await expect(bar).toBeVisible()
    const root = page.locator('html')
    await expect(root).not.toHaveAttribute('data-focus', /.*/)

    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.col[data-focused]')).toHaveCount(1)
    await expect(page.getByTestId('focus-current')).toHaveText('Start')
    await expect(root).toHaveAttribute('data-focus', 'centre')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('focus-current')).toHaveText('Stop')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByTestId('focus-current')).toHaveText('Continue')

    await page.getByTestId('focus-accordion').click()
    await expect(root).toHaveAttribute('data-focus', 'accordion')
    // The fold is animated (change presenter-accordion-motion): wait for it to settle.
    await expect(async () => {
      const folded = await page.locator('.col:not([data-focused])').first().boundingBox()
      const open = await page.locator('.col[data-focused]').boundingBox()
      expect(folded!.width).toBeLessThan(120)
      expect(open!.width).toBeGreaterThan(folded!.width * 3)
    }).toPass()
    const found = (await axe(page).include('[data-testid="presenter-focus"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])

    await page.keyboard.press('Escape')
    await expect(root).not.toHaveAttribute('data-focus', /.*/)
    await expect(page.getByTestId('btn-presenter')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('btn-presenter')).toHaveAttribute('aria-pressed', 'false')
  })

  test('the accordion animates the fold, a click on a spine unfolds it, and folded content leaves the tab order (change presenter-accordion-motion)', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 1, 'Hidden while folded')
    await page.getByTestId('btn-presenter').click()
    await page.getByTestId('focus-accordion').click()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('focus-current')).toHaveText('Start')
    const second = page.locator('.board > .col').nth(1)
    await expect(async () => expect((await second.boundingBox())!.width).toBeLessThan(120)).toPass()
    // Folded: label only, content invisible and not focusable.
    await expect(second.locator('article.note')).toBeHidden()
    await expect(second.locator('h2')).toBeVisible()
    // A click on the spine unfolds it; the previous one folds, with an in-between width on the way.
    const widths: number[] = []
    await second.click({ position: { x: 20, y: 60 } })
    for (let i = 0; i < 6; i++) { widths.push((await second.boundingBox())!.width); await page.waitForTimeout(90) }
    await expect(page.getByTestId('focus-current')).toHaveText('Stop')
    await expect(async () => expect((await second.boundingBox())!.width).toBeGreaterThan(400)).toPass()
    await expect(second.locator('article.note')).toBeVisible()
    expect(widths.some((w) => w > 90 && w < (widths.at(-1) ?? 0) + 400)).toBe(true)
    expect(new Set(widths.map((w) => Math.round(w))).size).toBeGreaterThan(1)
  })

  test('a sideways swipe moves the focus from column to column (change presenter-accordion-motion)', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox desktop has no TouchEvent to dispatch')
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-presenter').click()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('focus-current')).toHaveText('Start')
    const swipe = (dx: number, dy = 0) => page.getByTestId('board').evaluate((el, [x, y]) => {
      const mk = (cx: number, cy: number) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy })
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [mk(400, 400)], changedTouches: [mk(400, 400)] }))
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [mk(400 + x!, 400 + y!)] }))
    }, [dx, dy])
    await swipe(-120)
    await expect(page.getByTestId('focus-current')).toHaveText('Stop')
    await swipe(20)
    await expect(page.getByTestId('focus-current')).toHaveText('Stop')
    await swipe(-120, 200)
    await expect(page.getByTestId('focus-current')).toHaveText('Stop')
    await swipe(120)
    await expect(page.getByTestId('focus-current')).toHaveText('Start')
  })

  test('reduced motion switches the accordion at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-presenter').click()
    await page.getByTestId('focus-accordion').click()
    await page.keyboard.press('ArrowRight')
    const folded = page.locator('.board > .col').nth(1)
    expect((await folded.boundingBox())!.width).toBeLessThan(120)
    const transition = await folded.evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(transition.split(',').every((d) => parseFloat(d) === 0)).toBe(true)
  })

  for (const width of [1440, 2560]) test(`the focus layout fits at ${width} wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-presenter').click()
    await page.getByTestId('focus-next').click()
    await page.getByTestId('focus-next').click()
    await expect(page.locator('.col[data-focused]')).toBeInViewport()
    await expect(page.getByTestId('presenter-focus')).toBeInViewport()
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/focus-${width}.png` })
    await page.getByTestId('focus-accordion').click()
    await expect(page.locator('.col[data-focused]')).toBeInViewport()
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/accordion-${width}.png` })
  })
})

test.describe('voted ideas walk-through (presenter-mode-v2)', () => {
  test.skip(({ isMobile }) => isMobile, 'presenter mode is for large screens')

  test('next and previous go through the ranking; Escape ends the walk, then presenter mode', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Pairing')
    await publishNote(page, 1, 'Flaky tests')
    await publishNote(page, 2, 'Nobody voted here')
    for (const text of ['Pairing', 'Flaky tests']) await page.locator('article.note', { hasText: text }).locator('[data-testid^="vote-"]').click()
    await page.getByTestId('btn-presenter').click()
    await page.getByTestId('walk-start').click()
    await expect(page.getByTestId('walk')).toBeVisible()
    await expect(page.getByTestId('walk-text')).toHaveText('Pairing')
    await expect(page.getByTestId('walk-rank')).toHaveText('#1')
    // Nothing is hidden: the idea in turn is ringed on the board, which stays visible behind the dock.
    await expect(page.locator('article.note[data-walk]')).toContainText('Pairing')
    await expect(page.locator('article.note', { hasText: 'Nobody voted here' })).toBeVisible()
    await expect(page.getByTestId('walk-prev')).toBeDisabled()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByTestId('walk-text')).toHaveText('Flaky tests')
    await expect(page.getByTestId('walk-next')).toBeDisabled()
    await page.getByTestId('walk-top').click()
    await expect(page.getByTestId('walk-text')).toHaveText('Pairing')
    const found = (await axe(page).include('[data-testid="walk"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('walk')).toHaveCount(0)
    await expect(page.getByTestId('btn-presenter')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('btn-presenter')).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('note spotlight (presenter-mode-v2)', () => {
  test.skip(({ isMobile }) => isMobile, 'presenter mode is for large screens')

  test('a note is enlarged over the dimmed board, arrows move inside the column, Escape closes it', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Pairing')
    await publishNote(page, 0, 'Code review')
    await expect(page.locator('[data-testid^="note-spotlight-"]')).toHaveCount(0)
    await page.getByTestId('btn-presenter').click()
    await page.locator('article.note', { hasText: 'Pairing' }).locator('[data-testid^="note-spotlight-"]').dispatchEvent('click')
    await expect(page.getByTestId('spotlight')).toBeVisible()
    const first = await page.getByTestId('spotlight-text').innerText()
    await expect(page.getByTestId('spotlight-prev')).toBeDisabled()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('spotlight-text')).not.toHaveText(first)
    await expect(page.getByTestId('spotlight-next')).toBeDisabled()
    const found = (await axe(page).include('[data-testid="spotlight"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('spotlight')).toHaveCount(0)
    await expect(page.getByTestId('btn-presenter')).toHaveAttribute('aria-pressed', 'true')
  })
})

test('on a phone the presenter controls do not overlap and the walk button is an icon (change ux-irritants-wave-2)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Pairing')
  await page.locator('article.note', { hasText: 'Pairing' }).locator('[data-testid^="vote-"]').click()
  await page.getByTestId('btn-presenter').click()
  const ids = ['walk-start', 'presenter-focus', 'presenter-join']
  const boxes = []
  for (const id of ids) {
    const el = page.getByTestId(id)
    if (await el.count()) boxes.push({ id, b: (await el.boundingBox())! })
  }
  expect(boxes.length).toBeGreaterThanOrEqual(2)
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i]!.b, c = boxes[j]!.b
    const overlap = a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height
    expect(overlap, `${boxes[i]!.id} vs ${boxes[j]!.id}`).toBe(false)
  }
  expect((await page.getByTestId('walk-start').boundingBox())!.width).toBeLessThan(60)
})

test('accordion on a phone keeps the focused column fully visible going forward and backward (change ux-irritants-wave-3)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-presenter').click()
  await page.getByTestId('focus-accordion').click()
  const visible = async () => {
    const b = (await page.locator('.col[data-focused]').boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(-1)
    expect(b.x + b.width).toBeLessThanOrEqual(391)
  }
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowRight']) {
    await page.keyboard.press(key)
    await expect(page.locator('.col[data-focused]')).toHaveCount(1)
    await expect(visible).toPass()
  }
})

test('in presentation a long word never leaves its note, and notes grow with the screen (change toast-notifications-v2)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'presenter mode is for large screens: a phone is too narrow for notes to grow')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Supercalifragilisticexpialidocious-and-a-very-long-unbroken-token-that-must-wrap')
  await page.getByTestId('btn-presenter').click()
  const note = page.locator('article.note').first()
  const n = (await note.boundingBox())!
  const over = await note.locator('.text').evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(over).toBeLessThanOrEqual(1)
  const t = (await note.locator('.text').boundingBox())!
  expect(t.x + t.width).toBeLessThanOrEqual(n.x + n.width + 1)
  expect(n.width).toBeGreaterThan(210)
})

test('the laser pointer: the presenter shows a red dot to everybody, even with pointers hidden, and turns it off (change presenter-mode-v2)', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'presenter mode is for large screens')
  await page.setViewportSize({ width: 1100, height: 760 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', keepShare: true })
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  await publishNote(page, 1, 'Laser target')
  const bob = await join(browser, link, 'Bob')
  await expect(noteByText(bob.page, 'Laser target')).toBeVisible()
  // Alice shares no pointer at all: only the laser goes out.
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('set-share-cursor').uncheck()
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-presenter').click()
  await page.getByTestId('focus-laser').click()
  await settle(page)
  const box = (await noteByText(page, 'Laser target').boundingBox())!
  // The direct link may still be opening: keep moving until the dot shows.
  await expect(async () => {
    await page.mouse.move(box.x + 20, box.y + 20)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
    await expect(bob.page.locator('[data-testid^="laser-"]')).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20_000 })
  await expect(bob.page.locator('[data-testid^="cursor-"]')).toHaveCount(1)
  await page.getByTestId('focus-laser').click()
  await expect(bob.page.locator('[data-testid^="laser-"]')).toHaveCount(0, { timeout: 15_000 })
  await bob.ctx.close()
})
