import { expect, type Page, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}
const options = async (page: Page, fn: () => Promise<void>) => {
  await page.getByTestId('btn-options').click()
  await fn()
  await page.keyboard.press('Escape')
}
const voteBtn = (page: Page, text: string) => noteByText(page, text).locator('[data-testid^="vote-"]')

test.describe('voting v2', () => {
  test('several votes per idea, my vote dots and undo', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Pairing')
    await options(page, async () => { await page.getByTestId('opt-per-item-more').click(); await expect(page.getByTestId('opt-per-item')).toHaveText('2') })

    await voteBtn(page, 'Pairing').click()
    await voteBtn(page, 'Pairing').click()
    await expect(noteByText(page, 'Pairing').locator('[data-testid^="my-votes-"] i')).toHaveCount(2)
    await expect(page.getByTestId('votes-left')).toContainText('1')
    // A third vote on the same idea is refused (2 per idea).
    await voteBtn(page, 'Pairing').click()
    await expect(page.getByText('Tu as déjà mis le maximum de votes sur cette idée.')).toBeVisible()

    await noteByText(page, 'Pairing').locator('[data-testid^="unvote-"]').click()
    await expect(page.getByTestId('votes-left')).toContainText('2')
    await expect(noteByText(page, 'Pairing').locator('.vote .n')).toHaveText('1')
  })

  test('hidden counts appear for everyone at the same time when the facilitator closes voting', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Flaky tests')
    const bob = await join(browser, await shareLink(page), 'Bob')
    await page.getByTestId('secret-toggle').click()

    await voteBtn(bob.page, 'Flaky tests').click()
    await expect(bob.page.getByTestId('votes-left')).toContainText('2')
    await expect(noteByText(page, 'Flaky tests').locator('.vote .n')).toHaveCount(0)
    await expect(noteByText(bob.page, 'Flaky tests').locator('.vote .n')).toHaveCount(0)
    // Participants cannot close voting.
    await expect(bob.page.getByTestId('close-voting')).toHaveCount(0)

    await page.getByTestId('close-voting').click()
    await expect(noteByText(page, 'Flaky tests').locator('.vote .n')).toHaveText('1')
    await expect(noteByText(bob.page, 'Flaky tests').locator('.vote .n')).toHaveText('1')
    await expect(bob.page.getByTestId('voting-closed')).toBeVisible()
    // No more votes once closed.
    await voteBtn(bob.page, 'Flaky tests').click()
    await expect(noteByText(page, 'Flaky tests').locator('.vote .n')).toHaveText('1')
    await bob.ctx.close()
  })

  test('a cluster is voted as one idea; its notes have no vote button', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Slow builds')
    await publishNote(page, 0, 'Slow deploys')
    await noteByText(page, 'Slow deploys').dragTo(noteByText(page, 'Slow builds'))
    const cluster = page.locator('.cluster').first()
    await expect(cluster).toBeVisible()
    await cluster.locator('[data-testid^="vote-"]').click()
    await expect(cluster.locator('.vote .n')).toHaveText('1')
    await expect(page.getByTestId('votes-left')).toContainText('2')
    await cluster.locator('.stack').click()
    await expect(page.getByTestId('group-panel').locator('[data-testid^="vote-"]')).toHaveCount(0)
  })

  test('results: podium with ties, full ranking, and an action from an idea', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    for (const t of ['Alpha', 'Beta', 'Gamma', 'Delta']) await publishNote(page, 0, t)
    await options(page, async () => {
      await page.getByRole('button', { name: /Plus de votes|more/i }).first().click()
      await page.getByTestId('opt-per-item-more').click()
      await page.getByTestId('opt-per-item-more').click()
    })
    // Alpha 2 votes, Beta 1, Gamma 1, Delta 0 -> ranks 1, 2, 2, 4.
    await voteBtn(page, 'Alpha').click()
    await voteBtn(page, 'Alpha').click()
    await voteBtn(page, 'Beta').click()
    await voteBtn(page, 'Gamma').click()
    await page.getByTestId('close-voting').click()
    await page.getByTestId('open-ranking').click()

    const list = page.getByTestId('ranking-list')
    await expect(list.locator('li')).toHaveCount(4)
    await expect(list.locator('li').nth(0)).toHaveAttribute('data-rank', '1')
    await expect(list.locator('li', { hasText: 'Beta' })).toHaveAttribute('data-rank', '2')
    await expect(list.locator('li', { hasText: 'Gamma' })).toHaveAttribute('data-rank', '2')
    await expect(list.locator('li', { hasText: 'Delta' })).toHaveAttribute('data-rank', '4')
    await expect(page.getByTestId('podium').locator('[data-rank="2"] .winner')).toHaveCount(2)

    await list.locator('li', { hasText: 'Alpha' }).getByRole('button').click()
    await expect(list.locator('li', { hasText: 'Alpha' }).getByRole('button')).toBeDisabled()
    await page.keyboard.press('Escape')
    await page.getByTestId('btn-actions').click()
    await expect(page.getByText('Alpha').last()).toBeVisible()
  })
})
