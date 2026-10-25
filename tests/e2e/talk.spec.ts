import { expect, test } from '@playwright/test'
import { createBoard, join } from './helpers'

async function setTalk(page: import('@playwright/test').Page, mode: 'ring' | 'popup', budget: number, self = false) {
  await page.getByTestId('btn-options').click()
  await page.getByTestId(`opt-talk-${mode}`).click()
  await page.getByTestId(`opt-talk-budget-${budget}`).click()
  if (self) await page.getByTestId('opt-talk-self').check()
  await page.keyboard.press('Escape')
}

test('the facilitator gives the floor; everyone sees the ring; overtime shows; the turn ends', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await setTalk(page, 'popup', 1)
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, link, 'Bob')

  await page.getByTestId('btn-participants').click()
  const bobRow = page.locator('li[data-testid^="peer-"]', { hasText: 'Bob' })
  await bobRow.locator('[data-testid^="talk-give-"]').click()
  await page.keyboard.press('Escape')

  for (const p of [page, bob.page]) await expect(p.getByTestId('talk-banner')).toContainText('Bob a la parole')
  // Popup mode announces the turn to everyone.
  await expect(bob.page.getByText('Bob prend la parole (1 min)')).toBeVisible()

  // One minute later (fast-forward the clock): overtime for everyone.
  await bob.page.clock.install()
  await bob.page.clock.fastForward(61_000)
  await expect(bob.page.getByTestId('talk-banner')).toHaveAttribute('data-overtime', 'true')
  await expect(bob.page.getByText('Temps écoulé pour Bob')).toBeVisible()

  // The speaker gives it back.
  await bob.page.getByTestId('talk-end').click()
  await expect(page.getByTestId('talk-banner')).toHaveCount(0)
  await bob.ctx.close()
})

test('participants take the floor themselves when allowed; the report shows the shares', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await setTalk(page, 'ring', 2, true)
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, link, 'Bob')

  await bob.page.getByTestId('btn-participants').click()
  const me = bob.page.locator('li[data-testid^="peer-"]', { hasText: 'Bob' })
  await me.locator('[data-testid^="talk-give-"]').click()
  await expect(me.getByTestId('badge-speaking')).toBeVisible()
  await bob.page.keyboard.press('Escape')
  await expect(page.getByTestId('talk-banner')).toContainText('Bob a la parole')
  await bob.page.waitForTimeout(1200)
  await bob.page.getByTestId('talk-end').click()
  await expect(page.getByTestId('talk-banner')).toHaveCount(0)

  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-report').click()
  await expect(page.getByTestId('report-talk')).toContainText('Bob: 100 %')
  await bob.ctx.close()
})
