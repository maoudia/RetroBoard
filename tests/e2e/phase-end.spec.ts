import AxeBuilder from '@axe-core/playwright'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createBoard, enterName, setOneFacilitator } from './helpers'

/** One-minute phases (the protocol minimum); the tests move the page clock instead of waiting. */
async function startShortAgenda(page: Page, firstMinutes = 1) {
  await page.evaluate((first) => {
    const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { commands: { setAgenda: (p: unknown, o: unknown) => void; startAgenda: () => void } }> } } } } }).__vue_app__
    const board = app.config.globalProperties.$pinia._s.get('board')!
    board.commands.setAgenda([{ kind: 'write', minutes: first }, { kind: 'group', minutes: 5 }, { kind: 'vote', minutes: 5 }], { rules: false, autoPublish: false })
    board.commands.startAgenda()
  }, firstMinutes)
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
    await page.waitForTimeout(1200) // both watchers take a first sample before the jump
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

  test('"1 minute left" toast, silenced by the personal setting', async ({ page }) => {
    await page.clock.install()
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await startShortAgenda(page, 3)
    await expect(page.getByTestId('agenda-phase')).toHaveText('Écriture')
    await page.waitForTimeout(1200)
    await page.clock.fastForward(2 * 60_000 + 5_000)
    await expect(page.locator('.toasts')).toContainText('Plus qu\'une minute pour Écriture')
    await expect(page.getByTestId('phase-end')).toHaveCount(0)

    await page.getByTestId('btn-profile').click()
    await page.getByTestId('set-phase-warning').uncheck()
    await page.keyboard.press('Escape')
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-next').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1200)
    await page.clock.fastForward(4 * 60_000 + 5_000)
    await page.waitForTimeout(800)
    await expect(page.locator('.toasts')).not.toContainText('Plus qu\'une minute')
  })

  test('a started phase is announced on open boards only', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await joinWithClock(browser, await shareLink(page), 'Bob')
    await startShortAgenda(page, 5)
    await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Écriture')
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-next').click()
    await page.keyboard.press('Escape')
    await expect(bob.page.locator('.toasts')).toContainText('Alice a démarré Regroupement')
    await bob.ctx.close()

    await setOneFacilitator(page)
    const carl = await joinWithClock(browser, await shareLink(page), 'Carl')
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-next').click()
    await page.keyboard.press('Escape')
    await expect(carl.page.getByTestId('agenda-phase')).toHaveText('Vote')
    await carl.page.waitForTimeout(800)
    await expect(carl.page.locator('.toasts')).not.toContainText('a démarré')
    await carl.ctx.close()
  })

  test('system notification: asked on opt-in, shown only when the tab is hidden', async ({ page }) => {
    await page.addInitScript(() => {
      const calls: string[][] = []
      class FakeNotification {
        static permission: NotificationPermission = 'default'
        static requestPermission = async () => { FakeNotification.permission = 'granted'; return 'granted' as NotificationPermission }
        onclick: (() => void) | null = null
        constructor(title: string, opts?: { body?: string }) { calls.push([title, opts?.body ?? '']) }
        close() {}
      }
      ;(window as unknown as { Notification: unknown; __notes: string[][] }).Notification = FakeNotification
      ;(window as unknown as { __notes: string[][] }).__notes = calls
    })
    await page.clock.install()
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('set-system-notify')).not.toBeChecked()
    await page.getByTestId('set-system-notify').check()
    await expect(page.getByTestId('set-system-notify')).toBeChecked()
    await page.keyboard.press('Escape')

    await startShortAgenda(page, 1)
    await page.waitForTimeout(1200)
    await page.clock.fastForward(61_000)
    await expect(page.getByTestId('phase-end')).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { __notes: string[][] }).__notes)).toEqual([])

    await page.getByTestId('phase-end-ok').click()
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }))
    await page.getByTestId('phase-end-more').count()
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-next').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1200)
    await page.clock.fastForward(6 * 60_000)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __notes: string[][] }).__notes.length)).toBe(1)
    expect(await page.evaluate(() => (window as unknown as { __notes: string[][] }).__notes[0]![0])).toContain('Regroupement')
  })
})

test.describe('phase end popup placement', () => {
  test('fits a 360x640 screen and hides itself after 20 seconds', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await page.clock.install()
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    await startShortAgenda(page)
    await page.waitForTimeout(1200)
    await page.mouse.move(1, 1) // a pointer resting on the popup would pause its timer
    await page.clock.fastForward(61_000)
    const popup = page.getByTestId('phase-end')
    await expect(popup).toBeVisible()
    const box = (await popup.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(360)
    expect(box.y + box.height).toBeLessThanOrEqual(640)
    await page.clock.fastForward(21_000)
    await expect(popup).toHaveCount(0)
  })
})
