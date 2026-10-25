import { expect, type Page, test } from '@playwright/test'
import { createBoard, join } from './helpers'

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
