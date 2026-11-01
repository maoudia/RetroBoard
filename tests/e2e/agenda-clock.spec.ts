import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { createBoard } from './helpers'

async function start(page: Page) {
  await page.evaluate(() => {
    const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { commands: { setAgenda: (p: unknown, o: unknown) => void; startAgenda: () => void } }> } } } } }).__vue_app__
    const board = app.config.globalProperties.$pinia._s.get('board')!
    board.commands.setAgenda([{ kind: 'write', minutes: 10 }, { kind: 'group', minutes: 15 }, { kind: 'vote', minutes: 35 }], { rules: false, autoPublish: false })
    board.commands.startAgenda()
  })
}

test.describe('agenda clock v2', () => {
  test('start and pause live inside the ring frame', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await start(page)
    const frame = page.locator('.clockrow')
    await expect(frame.getByTestId('agenda-ring')).toBeVisible()
    await expect(frame.getByTestId('agenda-toggle')).toBeVisible()
    const f = (await frame.boundingBox())!
    const g = (await frame.getByTestId('agenda-toggle').boundingBox())!
    expect(g.x).toBeGreaterThanOrEqual(f.x)
    expect(g.x + g.width).toBeLessThanOrEqual(f.x + f.width + 1)
  })

  test('skipping a phase does not move the global time by its plan; segments tell the real time', async ({ page }) => {
    await page.clock.install()
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await start(page)
    await expect(page.getByTestId('agenda-time')).toHaveText('60:00')
    await page.clock.fastForward(60_000)
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-next').click()
    await page.keyboard.press('Escape')
    // One minute spent in a ten minute phase: fifty-nine minutes are left, not fifty.
    await expect(page.getByTestId('agenda-time')).toHaveText(/^59:|^58:/)

    await page.getByTestId('step-btn-0').click()
    await expect(page.getByTestId('step-pop-0')).toContainText('passées')
    await expect(page.getByTestId('step-pop-0')).toContainText('Prévu : 10 min')
    await page.keyboard.press('Escape')
    await page.getByTestId('step-btn-2').click()
    await expect(page.getByTestId('step-pop-2')).toContainText('Pas encore commencée')
    const axe = await new AxeBuilder({ page }).include('[data-testid="stepper"]').analyze()
    expect(axe.violations).toEqual([])
    await page.keyboard.press('Escape')

    // Left at once, the next phase is flagged as skipped.
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-next').click()
    await page.keyboard.press('Escape')
    await page.getByTestId('step-btn-1').click()
    await expect(page.getByTestId('step-pop-1')).toContainText(/passées|Passée/)
  })
})
