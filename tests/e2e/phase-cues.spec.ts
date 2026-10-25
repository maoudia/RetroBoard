import { expect, type Page, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

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

test('phases that do not allow writing grey the composer with the reason; facilitators keep it open', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  const bob = await join(browser, await shareLink(page), 'Bob')
  const colId = (await bob.page.locator('section[data-testid^="column-"]').first().getAttribute('data-testid'))!.replace('column-', '')
  const area = (p: Page) => p.getByTestId(`draft-${colId}`)
  const hint = (p: Page) => p.getByTestId(`gated-${colId}`)

  // No running agenda: nothing is closed.
  await expect(area(bob.page)).toBeEnabled()
  await expect(hint(bob.page)).toHaveCount(0)

  // Check-in phase: closed for Bob with the reason, open for the facilitator with a hint.
  await panel(page, 'agenda-start')
  await expect(area(bob.page)).toBeDisabled()
  await expect(hint(bob.page)).toContainText(/Inclusion/)
  await expect(hint(bob.page)).toContainText(/Écriture|Write/)
  await expect(area(bob.page)).toHaveAttribute('aria-describedby', `gated-${colId}`)
  await expect(area(page)).toBeEnabled()
  await expect(hint(page)).toContainText(/facilitator|animateur/)

  // Write phase: open for everyone, no cue.
  await panel(page, 'agenda-next')
  await panel(page, 'agenda-next')
  await expect(area(bob.page)).toBeEnabled()
  await expect(hint(bob.page)).toHaveCount(0)

  // Vote phase (two steps after Write: Group, Vote): closed again.
  await panel(page, 'agenda-next')
  await panel(page, 'agenda-next')
  await expect(area(bob.page)).toBeDisabled()
  await expect(hint(bob.page)).toContainText(/Vote/)
  await bob.ctx.close()
})

test('votes and actions get the same closed cue; a phase change says what opened and closed', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await publishNote(page, 0, 'Cue me')
  const bob = await join(browser, await shareLink(page), 'Bob')
  await expect(noteByText(bob.page, 'Cue me')).toBeVisible()

  // Write phase (start, then two steps): votes and actions are closed for Bob.
  await panel(page, 'agenda-start')
  await panel(page, 'agenda-next')
  await panel(page, 'agenda-next')
  const note = noteByText(bob.page, 'Cue me')
  await expect(note.locator('[data-testid^="gated-vote-"]')).toBeDisabled()
  await expect(note.locator('[data-testid^="gated-vote-"]')).toHaveAttribute('aria-label', /Write|Écriture/)
  await bob.page.getByTestId('btn-actions').click()
  await expect(bob.page.getByTestId('gated-actions')).toBeVisible()
  await expect(bob.page.getByTestId('action-add')).toBeDisabled()
  await bob.page.keyboard.press('Escape')

  // Group phase: the polite live region says what opened (nothing closes: drafts still land).
  await panel(page, 'agenda-next')
  await expect(bob.page.getByTestId('agenda-live')).toContainText(/Ouvert|Opened/)
  // Vote phase: voting opens, grouping closes.
  await panel(page, 'agenda-next')
  await expect(bob.page.getByTestId('agenda-live')).toContainText(/Ouvert : le vote|Opened: voting/)
  await expect(bob.page.getByTestId('agenda-live')).toContainText(/Fermé|Closed/)
  await bob.ctx.close()
})
