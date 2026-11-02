import { expect, test } from '@playwright/test'
import { createBoard, publishNote } from './helpers'

test('results show insights and keep tied ideas on the same podium step (change results-insights)', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  await publishNote(page, 0, 'Reunions trop longues')
  await publishNote(page, 0, 'Reunions sans ordre du jour')
  await publishNote(page, 1, 'Moins de reunions')
  const votes = page.locator('[data-testid^="vote-"]')
  await votes.nth(0).click()
  await votes.nth(1).click()
  await page.getByTestId('close-voting').click()
  await page.getByTestId('open-ranking').click()
  await expect(page.getByTestId('insights')).toBeVisible()
  await expect(page.getByTestId('chart-energy')).toBeVisible()
  await expect(page.getByTestId('chart-words')).toContainText('reunions')
  // Two ideas with one vote each stand on the same first step.
  const first = page.locator('[data-testid="podium"] .step.r1 .winner')
  await expect(first).toHaveCount(2)
})
