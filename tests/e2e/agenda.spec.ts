import { expect, type Page, test } from '@playwright/test'
import { createBoard, join, noteByText } from './helpers'

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
