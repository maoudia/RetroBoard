import { expect, test } from '@playwright/test'
import { axe, createBoard, enterName } from './helpers'

// Change simple-mode-ux-pass (groups 1 and 2): the simple creation page and its one-tap carry-over offer.
test.use({ storageState: { cookies: [], origins: [] } })

test('simple creation shows the title, a password line, the theme, the format and the agenda switch only', async ({ page }) => {
  await page.goto('/new')
  await expect(page.getByTestId('mode-simple')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('setup-title')).toBeVisible()
  await expect(page.getByTestId('setup-passcode')).toHaveAttribute('readonly', '')
  await expect(page.getByTestId('passcode-copy')).toBeVisible()
  await expect(page.getByTestId('theme-studio')).toBeVisible()
  await expect(page.getByTestId('tab-all')).toBeVisible()
  await expect(page.getByTestId('agenda-enabled')).toBeChecked()
  // Everything else moved to advanced.
  for (const id of ['setup-ambient', 'new-solo-switch', 'new-presenter-switch', 'team-card', 'setup-facilitation', 'setup-voting', 'passcode-generator', 'passcode-regen', 'agenda-editor', 'carry-over']) {
    await expect(page.getByTestId(id), id).toHaveCount(0)
  }
  // "Try solo" stays in the footer.
  await expect(page.getByTestId('solo-new')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  expect((await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])

  await page.getByTestId('mode-advanced').click()
  for (const id of ['setup-ambient', 'new-solo-switch', 'new-presenter-switch', 'team-card', 'setup-facilitation', 'passcode-generator', 'agenda-editor']) {
    await expect(page.getByTestId(id), id).toBeVisible()
  }
  await expect(page.getByTestId('setup-passcode')).not.toHaveAttribute('readonly', '')
})

test('a first board takes three interactions: open Create, press Create, enter a name', async ({ page }) => {
  await page.goto('/')
  let interactions = 0
  await page.getByTestId('hero-create').click()
  interactions++
  await expect(page).toHaveURL(/\/new/)
  await page.getByTestId('setup-submit').click()
  interactions++
  await enterName(page, 'Alice')
  interactions++
  await expect(page.getByTestId('board')).toBeVisible()
  expect(interactions).toBe(3)
  // Defaults: an automatic password (the board is encrypted) and a timed agenda that is on.
  await expect(page.getByTestId('agenda-ring')).toBeVisible()
})

test('turning the agenda switch off creates a board without an agenda', async ({ page }) => {
  await page.goto('/new')
  await page.getByTestId('agenda-enabled').uncheck()
  await page.getByTestId('setup-submit').click()
  await enterName(page, 'Alice')
  await expect(page.getByTestId('board')).toBeVisible()
  await expect(page.getByTestId('agenda-ring')).toHaveCount(0)
})

test('one tap brings the open actions of the previous board of the team', async ({ page }) => {
  await page.goto('/new')
  // No previous board: no offer.
  await expect(page.getByTestId('carry-offer')).toHaveCount(0)

  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Cache dependencies')
  await page.getByTestId('owner-input').fill('Ana')
  await page.getByTestId('owner-input').press('Tab')
  await page.getByTestId('action-add').click()
  await page.getByTestId('actions-save-team').click()
  await page.keyboard.press('Escape')

  await page.goto('/new')
  await page.getByTestId('mode-simple').click()
  const offer = page.getByTestId('carry-offer')
  await expect(offer).toBeVisible()
  await expect(offer).not.toBeChecked()
  await offer.check()
  await page.getByTestId('setup-submit').click()
  // The name is remembered on this device: the board opens straight away, with the review of the carried actions.
  await expect(page.getByTestId('board')).toBeVisible()
  await expect(page.getByTestId('review-list')).toContainText('Cache dependencies')
})

test('the simple creation page fits 360 px in the lengthened pseudo-locale', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/new?lang=pseudo')
  await expect(page.getByTestId('agenda-enabled')).toBeVisible()
  await expect(page.getByTestId('passcode-copy')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  for (const id of ['setup-passcode', 'agenda-enabled', 'setup-submit']) {
    const box = await page.getByTestId(id).boundingBox()
    expect(box!.x + box!.width, id).toBeLessThanOrEqual(360)
  }
})
