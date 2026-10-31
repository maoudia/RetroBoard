import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test('the activity bell counts missed events, lists them and clears when opened', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
  await expect(page.getByTestId('activity-unread')).toHaveCount(0)

  await page.getByTestId('close-voting').click()
  await expect(page.getByTestId('activity-unread')).toHaveText('1')

  await page.getByTestId('btn-activity').click()
  await expect(page.getByTestId('activity-panel')).toContainText(/Les votes sont clos|Voting is closed/)
  await expect(page.getByTestId('activity-unread')).toHaveCount(0)

  const results = await new AxeBuilder({ page }).include('[data-testid="activity-panel"]').analyze()
  expect(results.violations).toEqual([])
})
