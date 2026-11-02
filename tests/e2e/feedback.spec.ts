import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test('landing and help offer bug, idea, discussion and the owner profiles (change community-feedback)', async ({ page }) => {
  await page.goto('/')
  const block = page.getByTestId('landing-community')
  await block.scrollIntoViewIfNeeded()
  await expect(block.getByTestId('feedback-bug')).toBeVisible()
  await expect(block.getByTestId('follow-linkedin')).toHaveAttribute('href', /linkedin\.com/)
  await expect(page.getByTestId('link-feedback')).toBeVisible()
})

test('the bug link from a board carries the environment and no board data', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  await page.keyboard.press('?')
  const bug = page.getByTestId('feedback-bug')
  await expect(bug).toBeVisible()
  const href = (await bug.getAttribute('href'))!
  const decoded = decodeURIComponent(href.replace(/\+/g, ' '))
  expect(decoded).toMatch(/RetroBoard \d+\.\d+\.\d+, \w+ \d+, (phone|tablet|desktop|tv), (fr|en)/)
  const hash = new URL(page.url()).hash
  expect(hash).toContain('r=')
  expect(href).not.toContain(hash.slice(3, 20))
  expect(href).not.toContain('#r=')
})
