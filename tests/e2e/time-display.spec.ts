import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { createBoard } from './helpers'

async function startAgenda(page: Page) {
  await page.evaluate(() => {
    const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { commands: { setAgenda: (p: unknown, o: unknown) => void; startAgenda: () => void } }> } } } } }).__vue_app__
    const board = app.config.globalProperties.$pinia._s.get('board')!
    board.commands.setAgenda([{ kind: 'write', minutes: 1 }, { kind: 'group', minutes: 5 }], { rules: false, autoPublish: false })
    board.commands.startAgenda()
  })
}

test.describe('time display options', () => {
  test('bar shows time elapsed, ring the time left of the retro, and a late phase turns red', async ({ page }) => {
    await page.clock.install()
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await startAgenda(page)
    await expect(page.getByTestId('agenda-phase')).toHaveText('Écriture')
    // 6 minutes planned in all.
    await expect(page.getByTestId('agenda-time')).toHaveText('6:00')
    await expect(page.getByTestId('stepper-line')).toContainText(/0:0\d écoulées/)
    await expect(page.getByTestId('stepper-over')).toHaveCount(0)

    await page.clock.fastForward(75_000)
    await expect(page.getByTestId('stepper-line')).toContainText(/1:\d\d écoulées/)
    await expect(page.getByTestId('agenda-time')).toHaveText(/^4:[34]\d$/)
    await expect(page.getByTestId('stepper-over')).toContainText(/\+0:\d\d/)
    const red = await page.getByTestId('stepper-over').evaluate((el) => getComputedStyle(el).color)
    const ink = await page.getByTestId('stepper-mode').evaluate((el) => getComputedStyle(el).color)
    expect(ink).toBe(red)

    // Time left on the bar: stays at 0:00, the excess is spelled out next to it.
    await page.getByTestId('stepper-mode').click()
    await expect(page.getByTestId('stepper-line')).toContainText('0:00 restantes')
    await expect(page.getByTestId('stepper-over')).toContainText(/\+0:\d\d/)

    // The ring can show the time elapsed of the retro too.
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('ring-mode').click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('agenda-time')).toHaveText(/^1:\d\d$/)

    const axe = await new AxeBuilder({ page }).include('[data-testid="stepper"]').analyze()
    expect(axe.violations).toEqual([])
  })
})
