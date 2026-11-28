import { expect, test } from '@playwright/test'
import { axe, createBoard, join, noteByText, publishNote, showChrome } from './helpers'

const up = (p: Parameters<typeof noteByText>[0], text: string) => noteByText(p, text).locator('[data-testid^="up-"]')
const down = (p: Parameters<typeof noteByText>[0], text: string) => noteByText(p, text).locator('[data-testid^="down-"]')
const score = (p: Parameters<typeof noteByText>[0], text: string) => noteByText(p, text).locator('[data-testid^="score-"]')

test.describe('up and down votes', () => {
  test('chosen at creation: one up or down per person, change of mind, results with ups and downs', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', voteStyle: 'updown', keepShare: true })
    const link = await page.getByTestId('share-url').inputValue()
    await page.keyboard.press('Escape')
    await publishNote(page, 0, 'Pairing')
    await expect(page.getByTestId('votes-updown')).toBeVisible()
    const bob = await join(browser, link, 'Bob')

    await up(page, 'Pairing').click()
    await expect(up(page, 'Pairing')).toHaveAttribute('aria-pressed', 'true')
    await expect(score(bob.page, 'Pairing')).toHaveText('+1')
    // Bob: an up, then a down: only the down counts.
    await up(bob.page, 'Pairing').click()
    await expect(score(page, 'Pairing')).toHaveText('+2')
    await down(bob.page, 'Pairing').click()
    await expect(down(bob.page, 'Pairing')).toHaveAttribute('aria-pressed', 'true')
    await expect(up(bob.page, 'Pairing')).toHaveAttribute('aria-pressed', 'false')
    await expect(score(page, 'Pairing')).toHaveText('0')
    await expect(up(page, 'Pairing')).toContainText('1')
    await expect(down(page, 'Pairing')).toContainText('1')
    // Pressing the same button again takes the choice back.
    await down(bob.page, 'Pairing').click()
    await expect(score(page, 'Pairing')).toHaveText('+1')

    await page.getByTestId('btn-options').click()
    await expect(page.getByTestId('opt-vote-style-updown')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('opt-votes')).toHaveCount(0)
    // The style is fixed once a vote exists.
    await page.getByTestId('opt-vote-style-dots').click()
    await expect(page.getByTestId('opt-vote-style-updown')).toHaveAttribute('aria-pressed', 'true')
    const found = (await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])
    await page.keyboard.press('Escape')
    await bob.ctx.close()
  })

  test('the vote controls pass axe', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', voteStyle: 'updown' })
    await publishNote(page, 0, 'Retros')
    await up(page, 'Retros').click()
    const found = (await axe(page).include('article.note').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])
  })

  test('results show the score with ups and downs, ordered by score then ups', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', voteStyle: 'updown' })
    for (const t of ['Alpha', 'Beta']) await publishNote(page, 0, t)
    await up(page, 'Alpha').click()
    await up(page, 'Beta').click()
    await down(page, 'Beta').click()
    await showChrome(page)
    await page.getByTestId('close-voting').click()
    await page.getByTestId('open-ranking').click()
    const list = page.getByTestId('ranking-list')
    await expect(list.locator('li').nth(0)).toContainText('Alpha')
    await expect(list.locator('li').nth(0).locator('[data-testid^="rank-score-"]')).toHaveAttribute('title', /1.*1.*0|score 1|score\s*1/i)
    await expect(list.locator('li').nth(1)).toContainText('Beta')
    await expect(list.locator('li').nth(1).locator('[data-testid^="rank-score-"]')).toHaveText('-1')
  })
})
