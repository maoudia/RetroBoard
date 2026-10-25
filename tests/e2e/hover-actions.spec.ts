import { expect, test } from '@playwright/test'
import { createBoard, noteByText, publishNote } from './helpers'

const opacity = (loc: ReturnType<import('@playwright/test').Page['locator']>) => loc.evaluate((el) => Number(getComputedStyle(el).opacity))

test('mouse: draft actions appear on hover; dismiss deletes, validate publishes', async ({ page }) => {
  await createBoard(page)
  const col = page.locator('[data-testid^="column-"]').first()
  const area = col.locator('textarea')
  await area.fill('à jeter')
  await col.locator('[data-testid^="compose-add-"]').click()
  await area.fill('à publier')
  await col.locator('[data-testid^="compose-add-"]').click()
  const drafts = col.locator('[data-draft-id]')
  await expect(drafts).toHaveCount(2)

  const first = drafts.filter({ hasText: 'à jeter' })
  await page.mouse.move(0, 0)
  expect(await opacity(first.locator('.acts'))).toBe(0)
  await first.hover()
  await expect.poll(() => opacity(first.locator('.acts'))).toBe(1)
  await first.locator('[data-testid^="draft-dismiss-"]').click()
  await expect(drafts).toHaveCount(1)

  const second = drafts.first()
  await second.hover()
  await second.locator('[data-testid^="draft-publish-"]').click()
  await expect(noteByText(page, 'à publier')).toBeVisible()
  await expect(drafts).toHaveCount(0)
})

test('mouse: a note being edited shows validate and dismiss; dismiss keeps the old text', async ({ page }) => {
  await createBoard(page)
  await publishNote(page, 0, 'Texte initial')
  const note = page.locator('article.note').first()
  await note.locator('[data-testid^="note-menu-"]').click()
  await page.getByRole('menuitem', { name: 'Modifier' }).click()
  await note.locator('textarea').fill('Texte changé')
  await note.hover()
  await note.locator('[data-testid^="note-cancel-"]').click()
  await expect(noteByText(page, 'Texte initial')).toBeVisible()

  await note.locator('[data-testid^="note-menu-"]').click()
  await page.getByRole('menuitem', { name: 'Modifier' }).click()
  await note.locator('textarea').fill('Texte validé')
  await note.locator('[data-testid^="note-save-"]').click()
  await expect(noteByText(page, 'Texte validé')).toBeVisible()
})

test.describe('touch', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })
  test('draft actions are always visible and tappable', async ({ page }) => {
    await createBoard(page)
    const col = page.locator('[data-testid^="column-"]').first()
    await col.locator('textarea').fill('mobile')
    await col.locator('[data-testid^="compose-add-"]').tap()
    const acts = col.locator('[data-draft-id] .acts')
    expect(await opacity(acts)).toBe(1)
    await col.locator('[data-testid^="draft-dismiss-"]').tap()
    await expect(col.locator('[data-draft-id]')).toHaveCount(0)
  })
})
