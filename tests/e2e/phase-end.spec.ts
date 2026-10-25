import AxeBuilder from '@axe-core/playwright'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createBoard, enterName } from './helpers'

/** One-minute phases (the protocol minimum); the tests move the page clock instead of waiting. */
async function startShortAgenda(page: Page) {
  await page.evaluate(() => {
    const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { commands: { setAgenda: (p: unknown, o: unknown) => void; startAgenda: () => void } }> } } } } }).__vue_app__
    const board = app.config.globalProperties.$pinia._s.get('board')!
    board.commands.setAgenda([{ kind: 'write', minutes: 1 }, { kind: 'group', minutes: 5 }], { rules: false, autoPublish: false })
    board.commands.startAgenda()
  })
}
const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}
/** A participant whose clock runs `aheadMs` in front of the real one. */
async function joinWithClock(browser: Browser, url: string, name: string, aheadMs = 0) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.clock.install({ time: Date.now() + aheadMs })
  const page = await ctx.newPage()
  await page.goto(url)
  await enterName(page, name)
  await expect(page.getByTestId('board')).toBeVisible()
  return { page, ctx }
}

test.describe('phase end popup', () => {
  test('everyone sees it, typing keeps the focus, a facilitator moves on, axe clean', async ({ page, browser }) => {
    await page.clock.install()
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await joinWithClock(browser, await shareLink(page), 'Bob')
    await startShortAgenda(page)
    await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Écriture')
    await expect(page.getByTestId('phase-end')).toHaveCount(0)

    const composer = bob.page.locator('section[data-testid^="column-"]').nth(0).locator('textarea')
    await composer.focus()
    await composer.pressSequentially('still typing')
    await page.clock.fastForward(61_000)
    await bob.page.clock.fastForward(61_000)

    await expect(bob.page.getByTestId('phase-end')).toBeVisible()
    await expect(bob.page.getByTestId('phase-end')).toContainText('Écriture')
    await expect(bob.page.getByTestId('phase-end')).toContainText('Regroupement')
    await expect(composer).toBeFocused()
    await expect(composer).toHaveValue('still typing')
    await expect(bob.page.getByTestId('phase-end-next')).toHaveCount(0)
    await expect(bob.page.getByTestId('phase-end-ok')).toBeVisible()

    await expect(page.getByTestId('phase-end')).toBeVisible()
    expect((await new AxeBuilder({ page }).analyze()).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])

    await page.getByTestId('phase-end-next').click()
    await expect(page.getByTestId('phase-end')).toHaveCount(0)
    await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Regroupement')
    await expect(bob.page.getByTestId('phase-end')).toHaveCount(0)
    await bob.ctx.close()
  })

  test('plus 2 minutes extends the phase and closes the popup; OK dismisses', async ({ page }) => {
    await page.clock.install()
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await startShortAgenda(page)
    await expect(page.getByTestId('agenda-phase')).toHaveText('Écriture')
    await page.waitForTimeout(1200) // let the watcher take a first sample
    await page.clock.fastForward(61_000)
    await expect(page.getByTestId('phase-end')).toBeVisible()
    await page.getByTestId('phase-end-more').click()
    await expect(page.getByTestId('phase-end')).toHaveCount(0)
    await page.waitForTimeout(1200)
    await page.clock.fastForward(2 * 60_000)
    await expect(page.getByTestId('phase-end')).toBeVisible()
    await page.getByTestId('phase-end-ok').click()
    await expect(page.getByTestId('phase-end')).toHaveCount(0)
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('phase-end')).toHaveCount(0)
  })

  test('a participant arriving after the end is not shown the popup', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await startShortAgenda(page)
    await expect(page.getByTestId('agenda-phase')).toHaveText('Écriture')
    const late = await joinWithClock(browser, await shareLink(page), 'Carl', 120_000)
    await expect(late.page.getByTestId('agenda-phase')).toHaveText('Écriture')
    await late.page.waitForTimeout(1800)
    await expect(late.page.getByTestId('phase-end')).toHaveCount(0)
    await late.ctx.close()
  })
})
