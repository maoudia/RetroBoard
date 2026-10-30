import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText } from './helpers'

test.describe('phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })

  test('publish an idea with the button, no Enter key; return adds a line', async ({ page }) => {
    await createBoard(page)
    const col = page.locator('[data-testid^="column-"]').first()
    const area = col.locator('textarea')
    await area.fill('première ligne')
    await area.press('Enter')
    await area.pressSequentially('seconde')
    await expect(area).toHaveValue('première ligne\nseconde')
    await col.locator('[data-testid^="compose-publish-"]').tap()
    await expect(noteByText(page, 'seconde')).toBeVisible()
    await expect(area).toHaveValue('')
  })
})

test('Add keeps a private draft, Publish now publishes at once, typed text survives a reload', async ({ page }) => {
  await createBoard(page)
  const col = page.locator('[data-testid^="column-"]').first()
  const area = col.locator('textarea')
  await area.fill('brouillon A')
  await col.locator('[data-testid^="compose-add-"]').click()
  await expect(col.locator('[data-draft-id]')).toHaveCount(1)
  await expect(area).toHaveValue('')

  await area.fill('pas fini')
  await page.reload()
  await expect(page.locator('[data-testid^="column-"]').first().locator('textarea')).toHaveValue('pas fini')

  await page.locator('[data-testid^="column-"]').first().locator('textarea').fill('direct')
  await page.locator('[data-testid^="column-"]').first().locator('[data-testid^="compose-publish-"]').click()
  await expect(noteByText(page, 'direct')).toBeVisible()
})

test('the facilitator sets the note length; the counter warns near the limit and blocks at it', async ({ page }) => {
  await createBoard(page)
  await page.getByTestId('btn-options').click()
  for (let i = 0; i < 6; i++) await page.getByTestId('opt-note-max-less').click()
  await expect(page.getByTestId('opt-note-max')).toHaveText('40')
  await page.keyboard.press('Escape')

  const col = page.locator('[data-testid^="column-"]').first()
  const area = col.locator('textarea')
  const counter = col.getByTestId('note-counter')
  await expect(counter).toHaveAttribute('data-level', 'ok')
  await expect(counter).not.toContainText('/')
  await area.fill('x'.repeat(33))
  await expect(counter).toHaveAttribute('data-level', 'near')
  await expect(counter).toContainText('33 / 40')
  await area.fill('x'.repeat(37))
  await expect(counter).toHaveAttribute('data-level', 'warn')
  await area.fill('x'.repeat(60))
  await expect(area).toHaveValue('x'.repeat(40))
  await expect(counter).toHaveAttribute('data-level', 'limit')
  await expect(counter).toContainText('40 / 40')

  await col.locator('[data-testid^="compose-publish-"]').click()
  await expect(noteByText(page, 'x'.repeat(40))).toBeVisible()
  const note = page.locator('article.note').first()
  await note.locator('[data-testid^="note-menu-"]').click()
  await page.getByRole('menuitem', { name: /Modifier/i }).click()
  await expect(note.getByTestId('note-counter')).toContainText('40 / 40')
})

test('draft-first: Add is the primary button on the right, Publish now the secondary one before it', async ({ page }) => {
  await createBoard(page)
  const col = page.locator('[data-testid^="column-"]').first()
  await col.locator('textarea').fill('une idee')
  const now = await col.locator('[data-testid^="compose-publish-"]').boundingBox()
  const add = await col.locator('[data-testid^="compose-add-"]').boundingBox()
  expect(now!.x).toBeLessThan(add!.x)
  await expect(col.locator('[data-testid^="compose-add-"]')).toHaveClass(/btn-primary/)
  await expect(col.locator('[data-testid^="compose-publish-"]')).not.toHaveClass(/btn-primary/)
  // Focus order follows the visual order.
  await col.locator('[data-testid^="compose-publish-"]').focus()
  await page.keyboard.press('Tab')
  await expect(col.locator('[data-testid^="compose-add-"]')).toBeFocused()
})

test.describe('draft-first on a phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })
  test('same order and 24 px targets at 360 px', async ({ page }) => {
    await createBoard(page)
    const col = page.locator('[data-testid^="column-"]').first()
    await col.locator('textarea').fill('une idee')
    const now = await col.locator('[data-testid^="compose-publish-"]').boundingBox()
    const add = await col.locator('[data-testid^="compose-add-"]').boundingBox()
    expect(now!.x).toBeLessThan(add!.x)
    expect(Math.min(now!.height, add!.height)).toBeGreaterThanOrEqual(24)
  })
})

test('a new board takes notes of 160 characters; the composer has swatches, a short hint and a help popover (#179)', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const col = page.locator('[data-testid^="column-"]').first()
  await expect(col.getByTestId('note-counter')).not.toContainText('/')
  await col.locator('textarea').fill('x'.repeat(200))
  await expect(col.locator('textarea')).toHaveValue('x'.repeat(160))
  await col.locator('textarea').fill('Vert')
  // The hint is one short line; the keyboard tips live in a popover.
  await expect(col.locator('.hint-row')).toContainText('Visible de toi seul.')
  await expect(col.getByText('Ctrl+Entrée')).toHaveCount(0)
  await col.locator('[data-testid^="compose-help-"]').click()
  await expect(col.getByText(/Ctrl\+Entrée/)).toBeVisible()
  await page.keyboard.press('Escape')
  // Swatches: the colour is chosen before publishing and the published note keeps it, for everyone.
  const bobSide = await join(browser, page.url(), 'Bob')
  const bob = bobSide.page
  await col.locator('[data-testid^="compose-colour-toggle-"]').click()
  await col.locator('[data-testid*="compose-color-"][data-testid$="-4"]').click()
  const paper = await col.locator('label.composer').evaluate((el) => getComputedStyle(el).backgroundColor)
  await col.locator('[data-testid^="compose-publish-"]').click()
  await expect(noteByText(page, 'Vert')).toBeVisible()
  await expect(noteByText(bob, 'Vert')).toBeVisible()
  expect(await noteByText(bob, 'Vert').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(paper)
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
  await bobSide.ctx.close()
})
