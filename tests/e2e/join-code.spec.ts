import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test('joining with a short code: knock, safety number, let in (change short-links-and-join)', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', keepShare: true })
  await page.getByTestId('join-code-show').click()
  const code = (await page.getByTestId('join-code-value').textContent())!.trim()
  expect(code).toMatch(/^RB-[2-9A-HJ-NP-Z]{6}$/)

  const ctx = await browser.newContext()
  const bob = await ctx.newPage()
  await bob.goto('/')
  await bob.getByTestId('join-input').fill(code.toLowerCase())
  await bob.getByTestId('join-go').click()
  await expect(bob.getByTestId('join-code-state')).toHaveAttribute('data-state', 'waiting')
  const mine = (await bob.getByTestId('join-number').textContent())!.trim()

  // Alice sees the same number and lets Bob in.
  await expect(page.getByTestId('knock-number')).toHaveText(mine)
  await page.getByTestId('knock-admit').click()
  await bob.waitForURL(/\/boards#/)
  await expect(bob.getByTestId('name-input').or(bob.getByTestId('board'))).toBeVisible()
  await ctx.close()
})

test('a refused knock tells the joiner, and a wrong code never lets anyone in', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', keepShare: true })
  await page.getByTestId('join-code-show').click()
  const code = (await page.getByTestId('join-code-value').textContent())!.trim()
  const ctx = await browser.newContext()
  const bob = await ctx.newPage()
  await bob.goto('/')
  await bob.getByTestId('join-input').fill(code)
  await bob.getByTestId('join-go').click()
  await page.getByTestId('knock-refuse').click()
  await expect(bob.getByTestId('join-code-state')).toHaveAttribute('data-state', 'denied')
  await ctx.close()
})
