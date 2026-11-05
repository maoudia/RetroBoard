import { expect, test } from '@playwright/test'
import { createBoard, noteByText, publishNote } from './helpers'

// Change hotfix-ux-wave8: the 14 findings of the owner screenshots of 2026-11-05.

test.describe('phone', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('my own row shows my name even when I stay anonymous, and the direct line never says 0 person(s)', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Moncef' })
    // Hide the name from the others through the profile of this browser, then open the menu.
    await page.evaluate(() => {
      const raw = localStorage.getItem('retroboard:identity')
      if (raw) localStorage.setItem('retroboard:identity', JSON.stringify({ ...JSON.parse(raw), showName: false }))
    })
    await page.getByTestId('btn-participants').click()
    await expect(page.getByTestId('peer-0')).toContainText('Moncef')
    await expect(page.getByTestId('links-state')).not.toContainText('0 person')
    await expect(page.getByTestId('links-state')).not.toContainText('0 personne')
  })

  test('a note footer keeps every control inside the card', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'A rather long idea that wraps on a narrow phone screen for sure')
    const note = page.locator('article.note').first()
    const box = (await note.boundingBox())!
    for (const el of await note.locator('footer > *').all()) {
      const b = await el.boundingBox()
      if (!b) continue
      expect(b.x).toBeGreaterThanOrEqual(box.x - 6)
      expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 6)
      expect(b.y + b.height).toBeLessThanOrEqual(box.y + box.height + 6)
    }
  })

  test('on a phone the bar keeps touch-sized steps and the info button lists every step', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', autoAgenda: true })
    const stepper = page.getByTestId('stepper')
    await expect(stepper).toBeVisible()
    for (const hit of await stepper.locator('.hit').all()) expect((await hit.boundingBox())!.width).toBeGreaterThanOrEqual(24)
    await page.getByTestId('stepper-info').click()
    expect(await page.getByTestId('stepper-all').locator('li').count()).toBeGreaterThan(2)
  })

  test('the minimised chat bubble can be dragged away and closed', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await page.getByTestId('btn-chat').click()
    await page.getByTestId('chat-minimize').click()
    const bubble = page.getByTestId('chat-bubble')
    await expect(bubble).toBeVisible()
    const before = (await bubble.boundingBox())!
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
    await page.mouse.down()
    await page.mouse.move(before.x + 20, before.y - 200, { steps: 8 })
    await page.mouse.up()
    const after = (await bubble.boundingBox())!
    expect(before.y - after.y).toBeGreaterThan(100)
    // Dragging does not open the drawer.
    await expect(page.getByTestId('chat-panel')).toHaveCount(0)
    await page.getByTestId('chat-bubble-close').click()
    await expect(bubble).toHaveCount(0)
  })
})

test('on a wide screen the stepper is one row: phase, bar, info', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await createBoard(page, { template: 'start-stop-continue', autoAgenda: true })
  expect((await page.getByTestId('stepper').boundingBox())!.height).toBeLessThan(48)
  await expect(page.getByTestId('stepper-info')).toBeVisible()
})

test('the column width menu uses equal cells like the writing size', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const col = page.locator('[data-testid^="column-"]').first()
  await col.locator('[data-testid^="col-size-"]').click()
  // The popover springs open: measure once it has settled.
  await expect(async () => {
    const widths: number[] = []
    for (const b of await page.locator('[popover]:popover-open .size-pick button').all()) widths.push(Math.round((await b.boundingBox())!.width))
    expect(widths.length).toBe(4)
    expect(new Set(widths).size).toBe(1)
  }).toPass()
})

test('a stack previews up to eight notes then says how many more', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const texts = 'ABCDEFGHIJ'.split('').map((c) => `Idea ${c}${c}${c}`)
  for (const t of texts) await publishNote(page, 0, t)
  await noteByText(page, texts[1]!).dragTo(noteByText(page, texts[0]!))
  for (const t of texts.slice(2)) {
    await page.waitForTimeout(500)
    await noteByText(page, t).dragTo(page.locator('.stack').first())
  }
  await expect(page.locator('.stack .count').first()).toContainText('10')
  const stack = page.locator('.stack').first()
  await expect(stack).toBeVisible()
  await page.mouse.move(2, 2)
  await stack.hover()
  const peek = page.locator('.peek').first()
  await expect(peek).toBeVisible()
  await expect(peek.locator('li')).toHaveCount(9)
  await expect(peek.locator('li.more')).toBeVisible()
})

test('the Simple / Advanced switch keeps its place when the mode changes', async ({ page }) => {
  await page.goto('/new')
  const sw = page.getByTestId('mode-switch')
  await expect(sw).toBeVisible()
  await page.getByTestId('mode-simple').click()
  const a = (await sw.boundingBox())!
  await page.getByTestId('mode-advanced').click()
  const b = (await sw.boundingBox())!
  expect(Math.abs(a.x - b.x)).toBeLessThan(1)
  expect(Math.abs(a.y - b.y)).toBeLessThan(1)
})

test('the clone entries of the board menu look like menu items', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  await page.getByTestId('btn-boards').click()
  const clone = page.getByTestId('boards-clone')
  await expect(clone).toBeVisible()
  const css = await clone.evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, w: s.borderTopWidth } })
  expect(css.bg).toBe('rgba(0, 0, 0, 0)')
  const link = await page.getByTestId('boards-new').boundingBox()
  const cl = await clone.boundingBox()
  expect(Math.abs(link!.width - cl!.width)).toBeLessThan(2)
})

test('the action form fields stay inside the dialog and share one height', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await createBoard(page, { template: 'start-stop-continue' })
  await page.getByTestId('btn-actions').click()
  const dialog = (await page.locator('dialog[open]').boundingBox())!
  const owner = (await page.getByTestId('owner-input').boundingBox())!
  const due = (await page.getByTestId('action-due').boundingBox())!
  expect(due.x + due.width).toBeLessThanOrEqual(dialog.x + dialog.width)
  expect(Math.abs(owner.height - due.height)).toBeLessThan(2)
})
