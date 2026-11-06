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
  // Focus off the composer first, or the key is typed into it.
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('?')
  const bug = page.getByTestId('feedback-bug')
  await expect(bug).toBeVisible()
  const href = (await bug.getAttribute('href'))!
  const decoded = decodeURIComponent(href.replace(/\+/g, ' '))
  expect(decoded).toMatch(/RetroBoard \d+\.\d+\.\d+, \w+ \d+, (phone|tablet|desktop|tv), (fr|en)/)
  const hash = new URL(page.url()).hash
  // The compact link (ADR-0029): room id, room key and facilitator secret, none of which may reach the report.
  expect(hash).toMatch(/^#c=[A-Za-z0-9_-]{66}$/)
  for (const part of [hash.slice(3, 25), hash.slice(25, 47), hash.slice(47)]) expect(href).not.toContain(part)
  expect(href).not.toContain('#c=')
})
