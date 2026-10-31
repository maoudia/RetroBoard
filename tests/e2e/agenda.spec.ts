import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}
const panel = async (page: Page, fn: () => Promise<void>) => {
  await page.getByTestId('agenda-ring').click()
  await expect(page.getByTestId('agenda-panel')).toBeVisible()
  await fn()
  await page.keyboard.press('Escape')
}
const next = (page: Page) => panel(page, () => page.getByTestId('agenda-next').click())

test.describe('time-boxed agenda', () => {
  test('a new board has the default one-hour agenda with 8 phases', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await expect(page.getByTestId('agenda-time')).toHaveText('60 min')
    await panel(page, async () => {
      await expect(page.getByTestId('agenda-panel').locator('ol li')).toHaveCount(8)
    })
  })

  test('activity rings: three concentric rings follow the phase, in the theme colours', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const rings = page.getByTestId('activity-rings')
    await expect(rings.locator('circle.track')).toHaveCount(3)
    await panel(page, () => page.getByTestId('agenda-start').click())
    await next(page)
    await expect(rings.locator('[data-ring="outer"]')).toHaveCount(1)
    const stroke = await rings.locator('[data-ring="outer"]').evaluate((el) => getComputedStyle(el).stroke)
    const token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ring-1').trim())
    expect(token).toMatch(/^#[0-9a-f]{6}$/i)
    expect(stroke).not.toBe('none')
    // Large rings in the panel; the toolbar rings do not change in presenter mode.
    await panel(page, async () => { await expect(page.getByTestId('agenda-panel').getByTestId('activity-rings')).toHaveAttribute('width', '96') })
    const small = (await rings.first().boundingBox())!.width
    await page.getByTestId('btn-presenter').click()
    // Presenter mode zooms the columns, never the toolbar: the rings keep their size.
    await expect.poll(async () => Math.round((await rings.first().boundingBox())!.width)).toBe(Math.round(small))
    await page.keyboard.press('Escape')
    // The text alternative says where the team is.
    await expect(page.getByTestId('agenda-ring')).toContainText(/%/)
  })

  test('the facilitator drives phases for everyone; participants follow phase rules', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await panel(page, () => page.getByTestId('agenda-start').click())
    await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Inclusion')
    await expect(bob.page.getByTestId('live-polite')).toContainText('Inclusion')

    // To Write (2 steps): Bob writes a draft, publishes it, and has no vote buttons.
    await next(page)
    await next(page)
    await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Écriture')
    const col = bob.page.locator('section[data-testid^="column-"]').nth(0)
    await col.locator('textarea').fill('Published in write')
    await col.locator('[data-testid^="compose-add-"]').click()
    await col.locator('[data-testid^="publish-"]').click()
    await expect(noteByText(page, 'Published in write')).toBeVisible()
    await expect(noteByText(bob.page, 'Published in write').locator('[data-testid^="vote-"]')).toHaveCount(0)

    // A draft left at the end of Write is published automatically.
    await col.locator('textarea').fill('Left as a draft')
    await col.locator('[data-testid^="compose-add-"]').click()
    await next(page)
    await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Regroupement')
    await expect(noteByText(page, 'Left as a draft')).toBeVisible()

    // Vote phase: vote buttons appear for Bob.
    await next(page)
    await expect(noteByText(bob.page, 'Published in write').locator('[data-testid^="vote-"]')).toHaveCount(1)
    await bob.ctx.close()
  })

  test('voting controls follow the phase: no vote buttons and a disabled Close voting outside Vote (#231)', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Votable idea')
    await panel(page, () => page.getByTestId('agenda-start').click())
    await next(page)
    await next(page)
    await expect(page.getByTestId('agenda-phase')).toHaveText('Écriture')
    await expect(noteByText(page, 'Votable idea').locator('[data-testid^="vote-"]')).toHaveCount(0)
    await expect(page.getByTestId('close-voting')).toBeDisabled()
    await next(page)
    await next(page)
    await expect(page.getByTestId('agenda-phase')).toHaveText('Vote')
    await expect(noteByText(page, 'Votable idea').locator('[data-testid^="vote-"]')).toHaveCount(1)
    await expect(page.getByTestId('close-voting')).toBeEnabled()
  })

  test('the facilitator opens voting now outside the Vote phase and goes straight to closing (facilitator-controls-v2)', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Votable idea')
    const url = await shareLink(page)
    await panel(page, () => page.getByTestId('agenda-start').click())
    await next(page)
    await next(page)
    await expect(page.getByTestId('agenda-phase')).toHaveText('Écriture')
    const bob = await join(browser, url, 'Bob')
    await expect(page.getByTestId('voting-state-text')).toHaveText('Ouvre à la phase Vote')
    await expect(bob.page.getByTestId('voting-state-text')).toHaveText('Ouvre à la phase Vote')
    await page.getByTestId('voting-open').click()
    await expect(page.getByTestId('voting-state-text')).toHaveText('Ouvert par l\'animateur jusqu\'au prochain changement de phase')
    await expect(noteByText(bob.page, 'Votable idea').locator('[data-testid^="vote-"]')).toHaveCount(1)
    const found = (await new AxeBuilder({ page }).include('[data-testid="votebar"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])
    // Changing phase drops the override.
    await next(page)
    await expect(page.getByTestId('voting-state-text')).not.toHaveText(/animateur/)
    // Jump to closing, with a confirmation.
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-to-close').click()
    await page.getByTestId('confirm').click()
    await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Clôture')
    await bob.ctx.close()
  })

  test('the clock starts and pauses the agenda from the toolbar (facilitator-controls-v2)', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const toggle = page.getByTestId('agenda-toggle')
    await expect(toggle).toHaveAccessibleName('Démarrer')
    await toggle.click()
    await expect(toggle).toHaveAccessibleName('Pause')
    await expect(page.getByTestId('agenda-ring')).not.toHaveClass(/paused/)
    await toggle.click()
    await expect(toggle).toHaveAccessibleName('Reprendre')
    await expect(page.getByTestId('agenda-ring')).toHaveClass(/paused/)
    await toggle.click()
    await expect(toggle).toHaveAccessibleName('Pause')
  })

  test('the timer can start as soon as the board is created (facilitator-controls-v2)', async ({ page }) => {
    await page.goto('/new')
    await page.getByTestId('theme-studio').click()
    await page.getByTestId('tab-all').click()
    await page.getByTestId('template-start-stop-continue').click()
    await expect(page.getByTestId('agenda-autostart')).not.toBeChecked()
    await page.getByTestId('agenda-autostart').check()
    await page.getByTestId('setup-submit').click()
    await page.getByTestId('name-input').fill('Alice')
    await page.getByTestId('name-save').click()
    await expect(page.getByTestId('board')).toBeVisible()
    await expect(page.getByTestId('agenda-toggle')).toHaveAccessibleName('Pause')
    await expect(page.getByTestId('agenda-phase')).not.toHaveText('Pas commencé')
  })

  test('extending a phase borrows from later phases and keeps the total', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await panel(page, async () => {
      await page.getByTestId('agenda-start').click()
      await expect(page.getByTestId('phase-0')).toContainText('5 min')
      await page.getByTestId('agenda-plus3').click()
      await expect(page.getByTestId('phase-0')).toContainText('8 min')
      await expect(page.getByTestId('agenda-panel')).toContainText('sur 60 min')
      await page.getByTestId('agenda-borrow').uncheck()
      await page.getByTestId('agenda-plus1').click()
      await expect(page.getByTestId('agenda-panel')).toContainText('sur 61 min')
    })
  })

  test('creation: the time available picks the agenda preset until the agenda is edited by hand (#224)', async ({ page }) => {
    await page.goto('/new')
    await page.getByTestId('tp-time-45').click()
    await expect(page.getByTestId('agenda-total')).toContainText('45')
    await page.getByTestId('tp-time-15').click()
    await expect(page.getByTestId('agenda-total')).toContainText('30') // the shortest preset
    await page.getByTestId('agenda-minutes-2').fill('10')
    await page.getByTestId('agenda-minutes-2').blur()
    await page.getByTestId('tp-time-60').click()
    await expect(page.getByTestId('agenda-total')).not.toContainText(/^60$/)
    await expect(page.getByTestId('agenda-minutes-2')).toHaveValue('10') // the manual edit is kept
  })

  test('creation: presets, durations and turning the agenda off', async ({ page }) => {
    await page.goto('/new')
    await page.getByTestId('agenda-preset-30').click()
    await expect(page.getByTestId('agenda-total')).toContainText('30')
    await page.getByTestId('agenda-minutes-2').fill('10')
    await page.getByTestId('agenda-minutes-2').blur()
    await expect(page.getByTestId('agenda-total')).toContainText('34')
    await page.getByTestId('agenda-enabled').uncheck()
    await page.getByTestId('setup-submit').click()
    await page.getByTestId('name-input').fill('Alice')
    await page.getByTestId('name-save').click()
    await expect(page.getByTestId('board')).toBeVisible()
    await expect(page.getByTestId('agenda-ring')).toHaveCount(0)
    await expect(page.getByTestId('timer-toggle')).toBeVisible()
  })
})

test.describe('phase stepper (board-activity-feed)', () => {
  test('shows the phases, the current one with its time left and the next one', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const stepper = page.getByTestId('stepper')
    await expect(stepper).toBeVisible()
    await expect(page.locator('[data-testid^="step-"]')).toHaveCount(8)
    await expect(page.locator('[data-testid^="step-"][data-state="current"]')).toHaveCount(0)
    await expect(page.getByTestId('stepper-line')).toContainText('Pas commencé')
    await page.getByTestId('agenda-toggle').click()
    await expect(page.locator('[data-testid^="step-"][data-state="current"]')).toHaveCount(1)
    await expect(page.getByTestId('stepper-line')).toContainText('restantes')
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-next').click()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid^="step-"][data-state="done"]')).toHaveCount(1)
    const found = (await new AxeBuilder({ page }).include('[data-testid="stepper"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])
  })
})
