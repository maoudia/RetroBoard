import { expect, test } from '@playwright/test'
import { closeShare, createBoard, enterName, join, publishNote } from './helpers'

async function link(page: import('@playwright/test').Page) {
  if (!(await page.getByTestId('share-url').isVisible())) await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

test('a participant without a name is invited once, can choose one, and the invitation can be dismissed', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const url = await link(page)
  // Alice has a name: never nudged.
  await publishNote(page, 0, 'Named idea')
  await expect(page.getByTestId('name-nudge')).toHaveCount(0)

  // Bob joins with an empty name and publishes: the floating suggestion appears.
  const bob = await join(browser, url, '')
  await publishNote(bob.page, 0, 'Anonymous idea')
  await expect(bob.page.getByTestId('name-nudge')).toBeVisible()
  // It does not steal the focus.
  expect(await bob.page.evaluate(() => !!document.activeElement?.closest('[data-testid="name-nudge"]'))).toBe(false)
  await bob.page.getByTestId('nudge-choose').click()
  await expect(bob.page.getByTestId('name-input')).toBeVisible()
  await bob.page.getByTestId('name-input').fill('Bob')
  await bob.page.getByTestId('name-save').click()
  await expect(bob.page.getByTestId('name-nudge')).toHaveCount(0)
  await bob.ctx.close()
})

test('"Not now" hides it for this board; "Don\'t ask again" hides it on every board', async ({ browser, page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const url = await link(page)

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const carol = await ctx.newPage()
  await carol.goto(url)
  await enterName(carol, '')
  await expect(carol.getByTestId('board')).toBeVisible()
  await publishNote(carol, 0, 'Carol idea')
  await expect(carol.getByTestId('name-nudge')).toBeVisible()
  await carol.getByTestId('nudge-later').click()
  await expect(carol.getByTestId('name-nudge')).toHaveCount(0)
  await publishNote(carol, 0, 'Another idea')
  await expect(carol.getByTestId('name-nudge')).toHaveCount(0)

  // A second board in the same browser asks again, until "Don't ask again".
  const second = await ctx.newPage()
  await second.goto('/new')
  await second.getByTestId('theme-studio').click()
  await second.getByTestId('tab-all').click()
  await second.getByTestId('template-start-stop-continue').click()
  await second.getByTestId('setup-submit').click()
  await expect(second.getByTestId('board')).toBeVisible()
  await closeShare(second)
  await publishNote(second, 0, 'Own board idea')
  await expect(second.getByTestId('name-nudge')).toBeVisible()
  await second.getByTestId('nudge-never').click()
  await expect(second.getByTestId('name-nudge')).toHaveCount(0)

  const third = await ctx.newPage()
  await third.goto('/new')
  await third.getByTestId('theme-studio').click()
  await third.getByTestId('tab-all').click()
  await third.getByTestId('template-start-stop-continue').click()
  await third.getByTestId('setup-submit').click()
  await expect(third.getByTestId('board')).toBeVisible()
  await closeShare(third)
  await publishNote(third, 0, 'Third board idea')
  await third.waitForTimeout(1_500)
  await expect(third.getByTestId('name-nudge')).toHaveCount(0)
  await ctx.close()
})
