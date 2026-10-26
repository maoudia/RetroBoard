import { expect, test } from '@playwright/test'
import { column, createBoard, noteByText, publishNote, settle } from './helpers'

const clusters = (page: import('@playwright/test').Page) => page.locator('.cluster')

test.describe('clusters as merged ideas', () => {
  test('title suggestions from the notes, rename by picking one', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Tests lents en CI')
    await publishNote(page, 0, 'Les tests sont trop lents')
    await noteByText(page, 'Les tests sont trop lents').dragTo(noteByText(page, 'Tests lents en CI'))
    await clusters(page).first().locator('.stack').click()
    const sugg = page.getByTestId('cluster-suggestion')
    await expect(sugg.first()).toHaveText('Tests lents')
    await sugg.first().click()
    await expect(page.getByTestId('group-title')).toHaveValue('Tests lents')
  })

  test('hover peek: resting the mouse on a cluster lists its notes, leaving or Escape hides them', async ({ page, isMobile }) => {
    test.skip(isMobile, 'touch devices open the cluster with a tap, they never peek')
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Peek one')
    await publishNote(page, 0, 'Peek two')
    await noteByText(page, 'Peek two').dragTo(noteByText(page, 'Peek one'))
    await settle(page)
    const stack = clusters(page).first().locator('.stack')
    const peek = page.locator('[data-testid^="peek-"]')
    await page.mouse.move(0, 0)
    await expect(peek).toHaveCount(0)
    await stack.hover()
    await expect(peek).toBeVisible()
    await expect(peek).toContainText('Peek one')
    await expect(peek).toContainText('Peek two')
    await page.mouse.move(0, 0)
    await expect(peek).toHaveCount(0)
    await stack.hover()
    await expect(peek).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(peek).toHaveCount(0)
    // A click opens the cluster and no peek stays behind.
    await stack.click()
    await expect(page.getByTestId('group-panel')).toBeVisible()
    await expect(peek).toHaveCount(0)
  })

  async function twoNoteCluster(page: import('@playwright/test').Page) {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Motion one')
    await publishNote(page, 0, 'Motion two')
    await noteByText(page, 'Motion two').dragTo(noteByText(page, 'Motion one'))
    await settle(page)
  }

  test('spring open and close: the panel animates in under 400 ms and closes back into the stack', async ({ page }) => {
    await twoNoteCluster(page)
    await page.evaluate(() => {
      const w = window as unknown as { longTasks: number[] }
      w.longTasks = []
      new PerformanceObserver((l) => l.getEntries().forEach((e) => w.longTasks.push(e.duration))).observe({ entryTypes: ['longtask'] })
    })
    await clusters(page).first().locator('.stack').click()
    const panel = page.getByTestId('group-panel')
    await expect(panel).toBeVisible()
    const total = await panel.evaluate((el) => el.getAnimations().reduce((n, a) => Math.max(n, Number(a.effect?.getComputedTiming().endTime ?? 0)), 0))
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThan(400)
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => (window as unknown as { longTasks: number[] }).longTasks.filter((d) => d >= 50))).toEqual([])
    await page.getByTestId('group-close').click()
    await expect(panel).toHaveCount(0)
    // A second Escape or click during the close never throws or reopens anything.
    await clusters(page).first().locator('.stack').click()
    await expect(panel).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
  })

  test('reduced motion: the cluster opens and closes without any animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await twoNoteCluster(page)
    await clusters(page).first().locator('.stack').click()
    const panel = page.getByTestId('group-panel')
    await expect(panel).toBeVisible()
    expect(await panel.evaluate((el) => el.getAnimations().length)).toBe(0)
    await page.getByTestId('group-close').click()
    await expect(panel).toHaveCount(0)
  })

  test('expand all shows notes inline for me; collapse brings stacks back', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    for (const t of ['A1', 'A2']) await publishNote(page, 0, t)
    await noteByText(page, 'A2').dragTo(noteByText(page, 'A1'))
    await settle(page)
    const btn = column(page, 0).locator('[data-testid^="expand-"]')
    await btn.click()
    await expect(column(page, 0).locator('[data-testid^="cluster-inline-"] article.note')).toHaveCount(2)
    await btn.click()
    await expect(column(page, 0).locator('[data-testid^="cluster-inline-"]')).toHaveCount(0)
  })

  test('merge two clusters from the menu (touch-friendly); the target keeps its title', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    for (const t of ['B1', 'B2', 'C1', 'C2']) await publishNote(page, 0, t)
    await noteByText(page, 'B2').dragTo(noteByText(page, 'B1'))
    await settle(page)
    await noteByText(page, 'C2').dragTo(noteByText(page, 'C1'))
    await settle(page)
    await expect(clusters(page)).toHaveCount(2)
    // Name the target, then merge the other one into it.
    await clusters(page).nth(1).locator('.stack').click()
    await page.getByTestId('group-title').fill('Target')
    await page.getByTestId('group-title').press('Enter')
    await page.getByTestId('group-close').click()
    await clusters(page).nth(0).locator('.stack').click()
    await page.getByTestId('cluster-merge').click()
    await page.locator('[data-testid^="merge-into-"]').first().click()
    await expect(clusters(page)).toHaveCount(1)
    await expect(clusters(page).first()).toContainText('Target')
    await expect(clusters(page).first()).toContainText('4')
  })
})
