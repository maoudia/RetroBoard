import { expect, type Page, test } from '@playwright/test'
import { closeShare, createBoard, join } from './helpers'

const openActions = (page: Page) => page.getByTestId('btn-actions').click()
async function addAction(page: Page, text: string, owner?: string, due?: string) {
  await page.getByTestId('action-text').fill(text)
  if (owner !== undefined) await page.getByTestId('owner-input').fill(owner)
  if (due) await page.getByTestId('action-due').fill(due)
  await page.getByTestId('action-add').click()
}
const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}

test.describe('actions v2', () => {
  test('workflow statuses, due date and owner suggestions, shared live', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-action-workflow').click()
    await page.keyboard.press('Escape')

    await openActions(page)
    await page.getByTestId('action-text').fill('Fix flaky tests')
    await page.getByTestId('owner-input').fill('')
    await page.getByTestId('owner-input').fill('bo')
    // Bob is connected: suggested first; the typed text comes last.
    await expect(page.getByTestId('owner-options').locator('[role="option"]').first()).toContainText('Bob')
    await expect(page.getByTestId('owner-options').locator('[role="option"]').last()).toContainText('bo')
    await page.getByTestId('owner-input').press('ArrowDown')
    await page.getByTestId('owner-input').press('Enter')
    await expect(page.getByTestId('owner-input')).toHaveValue('Bob')
    await page.getByTestId('action-due').fill('2026-11-07')
    await page.getByTestId('action-add').click()

    const row = page.getByTestId('actions').locator('li').first()
    await expect(row).toContainText('Bob')
    await expect(row).toContainText('2026-11-07')
    await row.getByTestId('action-status').selectOption('blocked')
    await openActions(bob.page)
    await expect(bob.page.getByTestId('actions').locator('li').first()).toHaveAttribute('data-status', 'blocked')
    await bob.ctx.close()
  })

  test('a custom owner can be typed when nobody matches', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await openActions(page)
    await page.getByTestId('owner-input').fill('Carla')
    await expect(page.getByTestId('owner-option-custom')).toContainText('Carla')
    await page.getByTestId('owner-option-custom').click()
    await addAction(page, 'Write the runbook')
    await expect(page.getByTestId('actions').locator('li').first()).toContainText('Carla')
  })

  test('save for next time, then the next board carries open actions over with a review', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-action-workflow').click()
    await page.keyboard.press('Escape')
    await openActions(page)
    await addAction(page, 'Cache dependencies', 'Ana')
    await addAction(page, 'Already done', 'Bob')
    await page.getByTestId('actions').locator('li', { hasText: 'Already done' }).getByTestId('action-status').selectOption('done')
    await page.getByTestId('actions-save-team').click()
    await expect(page.getByText(/1 action\(s\) ouverte\(s\)/)).toBeVisible()
    await page.keyboard.press('Escape')

    // Next retro: the open action is offered and preselected; the done one is not.
    await page.goto('/new')
    await expect(page.getByTestId('carry-list').locator('li')).toHaveCount(1)
    await expect(page.getByTestId('carry-list')).toContainText('Cache dependencies')
    await page.getByTestId('setup-title').fill('Sprint 43')
    await page.getByTestId('setup-submit').click()
    // Same browser: the name is remembered, no prompt this time.

    // Review at the start of the retro, with quick statuses.
    const review = page.getByTestId('review-list')
    await expect(review.locator('li')).toHaveCount(1)
    await expect(review).toContainText('Ana')
    await review.getByTestId('review-done').click()
    await expect(review.locator('li').first()).toHaveAttribute('data-status', 'done')
    await page.getByTestId('review-close').click()
    await closeShare(page)
    await openActions(page)
    await expect(page.getByTestId('actions-carried')).toContainText('Sprint 42')
  })

  test('carry over from a Jira CSV file at creation', async ({ page }) => {
    await page.goto('/new')
    await page.getByTestId('carry-file').setInputFiles({
      name: 'jira.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Issue key,Summary,Assignee,Status\nRB-1,Upgrade Node,Ana,In Progress\nRB-2,Closed one,Bob,Done\n'),
    })
    await expect(page.getByTestId('carry-list').locator('li')).toHaveCount(1)
    await page.getByTestId('setup-submit').click()
    await page.getByTestId('name-input').fill('Alice')
    await page.getByTestId('name-save').click()
    await expect(page.getByTestId('review-list')).toContainText('Upgrade Node')
    await expect(page.getByTestId('review-list').locator('li').first()).toHaveAttribute('data-status', 'doing')
  })

  test('actions-only CSV export uses Jira columns', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await openActions(page)
    await addAction(page, 'Pin versions', 'Ana', '2026-12-01')
    await page.keyboard.press('Escape')
    await page.getByTestId('btn-export').click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-actions').click()])
    const csv = Buffer.concat(await (await download.createReadStream()).toArray()).toString('utf8')
    expect(csv.split('\n')[0]).toBe('"Summary","Assignee","Status","Due Date","Labels"')
    expect(csv).toContain('"Pin versions","Ana","To Do","2026-12-01"')
  })
})
