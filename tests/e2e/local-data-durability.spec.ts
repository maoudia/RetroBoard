import { expect, test, type Page } from '@playwright/test'
import { addDraft, axe, createBoard, publishNote, settle } from './helpers'

/** The browser answers `persist()` the way the test says. */
const stubPersistence = (page: Page, granted: boolean) => page.addInitScript((answer) => {
  localStorage.setItem('retroboard:durability-delay', '200')
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist: async () => answer, persisted: async () => answer, estimate: async () => ({}) } })
}, granted)

test('the profile says that boards are protected when the browser agreed', async ({ page }) => {
  await stubPersistence(page, true)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-profile').click()
  await expect(page.getByTestId('durability-protected')).toBeVisible()
  await expect(page.getByTestId('durability-volatile')).toHaveCount(0)
  expect((await axe(page).analyze()).violations).toEqual([])
})

test('the profile says that boards may be cleared, and links to the board file', async ({ page }) => {
  await stubPersistence(page, false)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-profile').click()
  await expect(page.getByTestId('durability-volatile')).toBeVisible()
  expect((await axe(page).analyze()).violations).toEqual([])
  await page.getByTestId('durability-save').click()
  await expect(page.getByTestId('export-retro')).toBeVisible()
})

test('a board only this browser holds proposes a board file once, never twice', async ({ page }) => {
  await stubPersistence(page, false)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Worth keeping')
  const propose = page.getByTestId('durability-propose-save')
  await expect(propose).toBeVisible()
  await propose.click()
  await expect(page.getByTestId('export-retro')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByTestId('board')).toBeVisible()
  await settle(page)
  await page.waitForTimeout(1_000)
  await expect(propose).toHaveCount(0)
})

test('no proposal when the browser keeps the boards', async ({ page }) => {
  await stubPersistence(page, true)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Safe')
  await page.waitForTimeout(1_000)
  await expect(page.getByTestId('durability-propose-save')).toHaveCount(0)
})

test('private drafts are sealed at rest and still reopen after a reload', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await addDraft(page, 0, 'my very private thought')
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('retroboard:drafts:')))).toBe(true)
  const stored = await page.evaluate(() => Object.entries(localStorage).filter(([k]) => /^retroboard:(drafts|compose):/.test(k)).map(([, v]) => v).join('\n'))
  expect(stored).not.toContain('private')
  await page.reload()
  await expect(page.getByTestId('board')).toBeVisible()
  await expect(page.getByText('my very private thought')).toBeVisible()
})
