import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { createBoard, publishNote } from './helpers'

/** Serious and critical WCAG 2.x A/AA violations fail the build. */
async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) - ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
}

test.describe('accessibility (axe)', () => {
  // Contrast is measured on settled frames: mid-animation opacity is transient, not a violation.
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }) })

  test('landing page', async ({ page }) => {
    await page.goto('/')
    await page.mouse.wheel(0, 6000)
    await page.waitForTimeout(1200)
    expect(await audit(page)).toEqual([])
  })

  test('board creation page', async ({ page }) => {
    await page.goto('/new')
    await expect(page.getByTestId('setup-form')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('board with notes and the profile dialog', async ({ page }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue' })
    await publishNote(page, 0, 'Accessible note')
    expect(await audit(page)).toEqual([])
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('profile-name')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })
})
