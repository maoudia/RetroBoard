import { expect, type Page, test } from '@playwright/test'
import { axe, closeShare, columnId, createBoard, enterName, join, publishNote } from './helpers'

// Change phase-transition-guidance: the empty Previous actions phase and the writing areas hidden when going back.
const shareLink = async (page: Page) => {
  if (!(await page.getByTestId('share-url').isVisible())) await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}
const panel = async (page: Page, testid: string) => {
  await page.getByTestId('agenda-ring').click()
  await expect(page.getByTestId('agenda-panel')).toBeVisible()
  await page.getByTestId(testid).click()
  await page.keyboard.press('Escape')
}
const toReview = async (page: Page) => { await panel(page, 'agenda-start'); await panel(page, 'agenda-next') }

test.describe('empty Previous actions phase', () => {
  test('a card for everyone, a button for who steers, a toast once, one click to the next phase', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await toReview(page)

    await expect(page.getByTestId('review-nudge')).toContainText(/Nothing to review|Rien à passer/)
    await expect(page.getByTestId('review-nudge-start')).toBeVisible()
    await expect(bob.page.getByTestId('review-nudge')).toBeVisible()
    await expect(bob.page.getByTestId('review-nudge-start')).toHaveCount(0)
    await expect(bob.page.getByTestId('review-nudge-wait')).toBeVisible()
    expect((await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])

    // The second, lighter suggestion arrives after six seconds, for who can act on it; nothing advances by itself.
    await expect(page.getByTestId('review-nudge-toast-start')).toBeVisible({ timeout: 12_000 })
    await expect(bob.page.getByTestId('review-nudge-toast-start')).toHaveCount(0)
    await expect(page.getByTestId('review-nudge')).toBeVisible()

    await page.getByTestId('review-nudge-start').click()
    await expect(page.getByTestId('review-nudge')).toHaveCount(0)
    await expect(bob.page.getByTestId('review-nudge')).toHaveCount(0)
    await expect(page.getByTestId('review-nudge-toast-start')).toHaveCount(0)
    await bob.ctx.close()
  })

  test('Escape dismisses the card for the rest of the phase, in that tab only', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await toReview(page)
    await expect(bob.page.getByTestId('review-nudge')).toBeVisible()
    await bob.page.keyboard.press('Escape')
    await expect(bob.page.getByTestId('review-nudge')).toHaveCount(0)
    await expect(page.getByTestId('review-nudge')).toBeVisible()
    await bob.ctx.close()
  })

  test('everyone facilitates: every participant gets the button', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await toReview(page)
    await expect(bob.page.getByTestId('review-nudge-start')).toBeVisible()
    await bob.ctx.close()
  })

  test('the phase timer ending on a board that is not chained leaves the phase as it is', async ({ page }) => {
    await page.clock.install()
    await page.goto('/new')
    await page.getByTestId('mode-advanced').click()
    const auto = page.getByTestId('agenda-autostart')
    if ((await auto.count()) && (await auto.isChecked())) await auto.uncheck()
    await page.getByTestId('agenda-chain').uncheck()
    await page.getByTestId('setup-passcode').fill('')
    await page.getByTestId('setup-submit').click()
    await page.getByTestId('confirm').click()
    await enterName(page, 'Alice')
    await closeShare(page)
    await toReview(page)
    await expect(page.getByTestId('review-nudge')).toBeVisible()
    await page.clock.fastForward('30:00')
    await expect(page.getByTestId('agenda-phase')).toContainText(/Previous actions|Actions précédentes/)
    await expect(page.getByTestId('review-nudge')).toBeVisible()
  })

  test('carried-over actions: all closed is a one-line moment, an open one keeps the list', async ({ page }) => {
    await page.goto('/new')
    await page.getByTestId('mode-advanced').click()
    const auto = page.getByTestId('agenda-autostart')
    if ((await auto.count()) && (await auto.isChecked())) await auto.uncheck()
    await page.getByTestId('carry-file').setInputFiles({
      name: 'jira.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Issue key,Summary,Assignee,Status\nRB-1,Upgrade Node,Ana,In Progress\n'),
    })
    await page.getByTestId('setup-submit').click()
    await enterName(page, 'Alice')
    await expect(page.getByTestId('review-list')).toContainText('Upgrade Node')
    await page.getByTestId('review-done').click()
    await page.getByTestId('review-close').click()
    await closeShare(page)
    await toReview(page)
    await expect(page.getByTestId('review-nudge-title')).toContainText(/All previous actions are done|Toutes les actions précédentes/)
    await expect(page.getByTestId('review-nudge-start')).toBeVisible()
  })

  test('with an open carried-over action the review list shows and no empty card does', async ({ page }) => {
    await page.goto('/new')
    await page.getByTestId('mode-advanced').click()
    const auto = page.getByTestId('agenda-autostart')
    if ((await auto.count()) && (await auto.isChecked())) await auto.uncheck()
    await page.getByTestId('carry-file').setInputFiles({
      name: 'jira.csv', mimeType: 'text/csv',
      buffer: Buffer.from('Issue key,Summary,Assignee,Status\nRB-1,Upgrade Node,Ana,In Progress\n'),
    })
    await page.getByTestId('setup-submit').click()
    await enterName(page, 'Alice')
    await expect(page.getByTestId('review-list')).toContainText('Upgrade Node')
    await page.getByTestId('review-close').click()
    await closeShare(page)
    await toReview(page)
    await expect(page.getByTestId('review-nudge')).toHaveCount(0)
  })
})

test.describe('writing areas hidden when going back', () => {
  const goBackFromWrite = async (page: Page) => {
    await panel(page, 'agenda-start')
    await panel(page, 'agenda-next')
    await panel(page, 'agenda-next') // Write
    await publishNote(page, 0, 'First idea')
    await panel(page, 'agenda-prev') // Previous actions
  }

  test('back to Previous actions collapses the areas, one banner shows them again, later phases are unchanged', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareLink(page), 'Bob')
    const colId = await columnId(bob.page, 0)
    await goBackFromWrite(page)

    await expect(bob.page.getByTestId('writing-hidden')).toContainText(/Writing is closed|L'écriture est fermée/)
    await expect(bob.page.getByTestId(`draft-${colId}`)).toBeHidden()
    await expect(bob.page.getByTestId('live-polite')).toContainText(/hidden|masquées/)
    expect((await axe(bob.page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])

    // Show anyway: this person only, still closed by the phase rules, until the phase changes.
    await bob.page.getByTestId('writing-hidden-show').click()
    await expect(bob.page.getByTestId('writing-hidden')).toHaveCount(0)
    await expect(bob.page.getByTestId(`draft-${colId}`)).toBeVisible()
    await expect(bob.page.getByTestId(`draft-${colId}`)).toBeDisabled()
    await expect(page.getByTestId('writing-hidden')).toBeVisible()

    // A later phase keeps the greyed composer and no banner.
    await panel(page, 'agenda-next')
    await panel(page, 'agenda-next')
    await panel(page, 'agenda-next') // Group
    await panel(page, 'agenda-next') // Vote
    await expect(page.getByTestId('writing-hidden')).toHaveCount(0)
    await expect(bob.page.getByTestId(`draft-${colId}`)).toBeVisible()
    await bob.ctx.close()
  })

  test('drafts survive the collapse and the first pass of a new retro is unchanged', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareLink(page), 'Bob')
    const colId = await columnId(bob.page, 0)
    // First pass: no idea yet, the greyed composer stays.
    await toReview(page)
    await dismissNudge(page)
    await expect(bob.page.getByTestId('writing-hidden')).toHaveCount(0)
    await expect(bob.page.getByTestId(`draft-${colId}`)).toBeVisible()
    await panel(page, 'agenda-next') // Write
    await publishNote(page, 0, 'An idea')
    await bob.page.getByTestId(`draft-${colId}`).fill('Bob draft')
    await panel(page, 'agenda-prev')
    await expect(bob.page.getByTestId('writing-hidden')).toBeVisible()
    await bob.page.getByTestId('writing-hidden-show').click()
    await expect(bob.page.getByTestId(`draft-${colId}`)).toHaveValue('Bob draft')
    await bob.ctx.close()
  })

  test('the board option turns it off for everyone, a participant sees the facilitator choice', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareLink(page), 'Bob')
    const colId = await columnId(bob.page, 0)
    await page.getByTestId('btn-options').click()
    const toggle = page.getByTestId('opt-hide-writing')
    await expect(toggle).toBeChecked()
    await toggle.uncheck()
    await page.keyboard.press('Escape')
    await goBackFromWrite(page)
    await expect(page.getByTestId('writing-hidden')).toHaveCount(0)
    await expect(bob.page.getByTestId('writing-hidden')).toHaveCount(0)
    await expect(bob.page.getByTestId(`draft-${colId}`)).toBeDisabled()
    await bob.ctx.close()
  })
})

async function dismissNudge(page: Page) {
  await page.getByTestId('review-nudge-dismiss').click()
}
