import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

test.describe('presenter column focus (presenter-mode-v2)', () => {
  test.skip(({ isMobile }) => isMobile, 'presenter mode is for large screens')

  test('arrow keys focus a column, the style switches and Escape steps back', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-presenter').click()
    const bar = page.getByTestId('presenter-focus')
    await expect(bar).toBeVisible()
    const root = page.locator('html')
    await expect(root).not.toHaveAttribute('data-focus', /.*/)

    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.col[data-focused]')).toHaveCount(1)
    await expect(page.getByTestId('focus-current')).toHaveText('Start')
    await expect(root).toHaveAttribute('data-focus', 'centre')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('focus-current')).toHaveText('Stop')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByTestId('focus-current')).toHaveText('Continue')

    await page.getByTestId('focus-accordion').click()
    await expect(root).toHaveAttribute('data-focus', 'accordion')
    const folded = await page.locator('.col:not([data-focused])').first().boundingBox()
    const open = await page.locator('.col[data-focused]').boundingBox()
    expect(folded!.width).toBeLessThan(120)
    expect(open!.width).toBeGreaterThan(folded!.width * 3)
    const found = (await new AxeBuilder({ page }).include('[data-testid="presenter-focus"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])

    await page.keyboard.press('Escape')
    await expect(root).not.toHaveAttribute('data-focus', /.*/)
    await expect(page.getByTestId('btn-presenter')).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('btn-presenter')).toHaveAttribute('aria-pressed', 'false')
  })

  for (const width of [1440, 2560]) test(`the focus layout fits at ${width} wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('btn-presenter').click()
    await page.getByTestId('focus-next').click()
    await page.getByTestId('focus-next').click()
    await expect(page.locator('.col[data-focused]')).toBeInViewport()
    await expect(page.getByTestId('presenter-focus')).toBeInViewport()
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/focus-${width}.png` })
    await page.getByTestId('focus-accordion').click()
    await expect(page.locator('.col[data-focused]')).toBeInViewport()
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/accordion-${width}.png` })
  })
})
