import { expect, test } from '@playwright/test'
import { axe, createBoard } from './helpers'

// AGPL section 13: users of the network service are offered the source (change licensing-and-monetization, task 1.3).
const SOURCE = 'https://github.com/maoudia/retroboard'

test('the landing footer offers the source code', async ({ page }) => {
  await page.goto('/')
  const link = page.locator('footer.foot').getByTestId('link-source')
  await expect(link).toHaveAttribute('href', SOURCE)
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
  await expect(link).toHaveText(/Code source|Source code/)
})

test('the board menu offers the source code, with no axe violation', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.getByTestId('btn-profile').click()
  const link = page.getByRole('dialog').getByTestId('link-source')
  await expect(link).toHaveAttribute('href', SOURCE)
  const result = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(result.violations).toEqual([])
})
