import { expect, test } from '@playwright/test'
import { createBoard, settle } from './helpers'

test.describe('the toolbar list panels share one style (history-panel-phone-layout)', () => {
  test.skip(({ isMobile }) => isMobile, 'the viewport is set by the test')

  test('History, Activity and Participants have the same width, padding and row gap at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const measures: Array<{ width: number; padding: string; gap: string }> = []
    for (const [button, panel] of [['btn-history', 'history-panel'], ['btn-activity', 'activity-panel'], ['btn-participants', 'participants-panel']] as const) {
      const show = page.getByTestId('chrome-show')
      if (await show.isVisible()) await show.click()
      const trigger = page.getByTestId(button)
      await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
      await trigger.click()
      await expect(page.getByTestId(panel)).toBeVisible()
      await settle(page)
      measures.push(await page.getByTestId(panel).evaluate((el) => {
        const dd = el.closest('.dd-panel') as HTMLElement
        const list = el.querySelector('ul')
        return { width: Math.round(dd.getBoundingClientRect().width), padding: getComputedStyle(el).padding, gap: list ? getComputedStyle(list).rowGap : '' }
      }))
      await page.keyboard.press('Escape')
      await expect(page.getByTestId(panel)).toBeHidden()
    }
    const [history, activity, people] = measures as [typeof measures[number], typeof measures[number], typeof measures[number]]
    expect(activity.width).toBe(history.width)
    expect(people.width).toBe(history.width)
    expect(activity.padding).toBe(history.padding)
    expect(people.padding).toBe(history.padding)
    expect(people.gap).toBe(history.gap || people.gap)
    expect(activity.gap || history.gap).toBe(history.gap || activity.gap)
    expect(people.gap).toBe(activity.gap || people.gap)
  })
})
