import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { closeShare, createBoard, noteByText, publishNote } from './helpers'

for (const scheme of ['light', 'dark'] as const) {
  test(`the home page puts the recent boards up front and reopens one (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
    await publishNote(page, 0, 'Still here')
    await page.goto('/')
    const card = page.getByTestId('landing-recents')
    await expect(card).toBeVisible()
    await expect(card).toContainText('Sprint 42')
    await expect(card).toContainText(/à l'instant|il y a/)
    const axe = await new AxeBuilder({ page }).include('[data-testid="landing-recents"]').analyze()
    expect(axe.violations).toEqual([])
    await card.getByRole('link', { name: /Sprint 42/ }).click()
    await expect(noteByText(page, 'Still here')).toBeVisible({ timeout: 15_000 })
  })
}

test('switch board from the board title: the other recent boards, not the current one', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop menu')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Board A' })
  await publishNote(page, 0, 'In A')
  // The name is remembered on this device: the second board opens straight away.
  await page.goto('/new')
  await page.getByTestId('setup-title').fill('Board B')
  await page.getByTestId('theme-studio').click()
  await page.getByTestId('tab-all').click()
  await page.getByTestId('template-start-stop-continue').click()
  await page.getByTestId('setup-submit').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await closeShare(page)
  await publishNote(page, 0, 'In B')
  await page.getByTestId('btn-boards').click()
  const menu = page.getByTestId('boards-menu')
  await expect(menu).toContainText('Board A')
  await expect(menu).not.toContainText('Board B')
  await menu.getByRole('link', { name: /Board A/ }).click()
  await expect(noteByText(page, 'In A')).toBeVisible({ timeout: 15_000 })
})

test('the creation page suggests the next sprint number from the last board (change smart-title)', async ({ page }) => {
  await page.goto('/new')
  await page.getByTestId('setup-title').fill('Sprint 42')
  await page.getByTestId('tab-all').click()
  await page.getByTestId('template-halloween').click()
  await page.getByTestId('setup-submit').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.goto('/new')
  await expect(page.getByTestId('setup-title')).toHaveValue('Sprint 43')
})

test('the boards menu ends with a New board entry (change boards-menu-new)', async ({ page }) => {
  await createBoard(page, { title: 'Menu' })
  await page.getByTestId('btn-boards').click()
  await page.getByTestId('boards-new').click()
  await expect(page).toHaveURL(/\/new\/?$/)
})
