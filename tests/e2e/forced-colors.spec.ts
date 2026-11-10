import { expect, test } from '@playwright/test'
import { createBoard, noteByText, publishNote } from './helpers'

/** change a11y-gate-and-derived-contrast: in a forced-colours palette (Windows High Contrast) notes and pressed buttons keep a visible boundary. */
test('forced colours: a note has a border and a pressed toolbar button has an outline', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
  await createBoard(page, { template: 'start-stop-continue' })
  await publishNote(page, 0, 'High contrast')
  const note = noteByText(page, 'High contrast')
  expect(await note.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('solid')
  expect(await note.evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth))).toBeGreaterThanOrEqual(1)
  const filter = page.getByTestId('btn-filter')
  await filter.click()
  await expect(filter).toHaveAttribute('aria-pressed', 'true')
  expect(await filter.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
  expect(await filter.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2)
})
