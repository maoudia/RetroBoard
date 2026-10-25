import { expect, test } from '@playwright/test'
import { createBoard, enterName, join, setOneFacilitator } from './helpers'

async function link(page: import('@playwright/test').Page) {
  // A new board opens the invite panel by itself.
  if (!(await page.getByTestId('share-url').isVisible())) await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

test('everyone facilitates by default: a participant runs the timer and the facilitator link is advanced', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await join(browser, await link(page), 'Bob')
  await bob.page.getByTestId('agenda-ring').click()
  await expect(bob.page.getByTestId('agenda-start')).toBeVisible()
  await bob.page.keyboard.press('Escape')
  // A participant has no switch for the mode.
  await bob.page.getByTestId('btn-options').click()
  await expect(bob.page.getByTestId('opt-open-facilitation')).toHaveCount(0)
  await bob.page.keyboard.press('Escape')
  // The creator finds the facilitator link under "Advanced".
  await page.getByTestId('btn-share').click()
  await expect(page.getByTestId('share-facilitator-toggle')).toContainText(/Advanced|Avancé/)
  await bob.ctx.close()
})

test('"One facilitator" at creation keeps the controls to the facilitator', async ({ page, browser }) => {
  await page.goto('/new')
  await page.getByTestId('theme-studio').click()
  await page.getByTestId('tab-all').click()
  await page.getByTestId('template-start-stop-continue').click()
  await expect(page.getByTestId('setup-fac-everyone')).toBeChecked()
  await page.getByTestId('setup-fac-one').check()
  await page.getByTestId('setup-submit').click()
  await enterName(page, 'Alice')
  await expect(page.getByTestId('board')).toBeVisible()
  const bob = await join(browser, await link(page), 'Bob')
  await bob.page.getByTestId('agenda-ring').click()
  await expect(bob.page.getByTestId('agenda-panel')).toBeVisible()
  await expect(bob.page.getByTestId('agenda-start')).toHaveCount(0)
  await bob.ctx.close()
})

test('the creator switches an open board to one facilitator from the options', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await join(browser, await link(page), 'Bob')
  await bob.page.getByTestId('agenda-ring').click()
  await expect(bob.page.getByTestId('agenda-start')).toBeVisible()
  await bob.page.keyboard.press('Escape')
  await setOneFacilitator(page)
  await bob.page.getByTestId('agenda-ring').click()
  await expect(bob.page.getByTestId('agenda-panel')).toBeVisible()
  await expect(bob.page.getByTestId('agenda-start')).toHaveCount(0)
  await bob.ctx.close()
})
