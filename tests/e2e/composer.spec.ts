import { expect, test } from '@playwright/test'
import { createBoard, noteByText } from './helpers'

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
  for (let i = 0; i < 12; i++) await page.getByTestId('opt-note-max-less').click()
  await expect(page.getByTestId('opt-note-max')).toHaveText('40')
  await page.keyboard.press('Escape')

  const col = page.locator('[data-testid^="column-"]').first()
  const area = col.locator('textarea')
  const counter = col.getByTestId('note-counter')
  await expect(counter).toContainText('0 / 40')
  await area.fill('x'.repeat(30))
  await expect(counter).toHaveAttribute('data-level', 'ok')
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
