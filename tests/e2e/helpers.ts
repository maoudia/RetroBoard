import { type Browser, expect, type Page } from '@playwright/test'

export async function enterName(page: Page, name: string, show = true) {
  await page.getByTestId('name-input').fill(name)
  if (show) await page.getByTestId('name-show').check()
  await page.getByTestId('name-save').click()
}

export async function createBoard(page: Page, opts: { theme?: string; template?: string; name?: string; title?: string } = {}) {
  await page.goto('/new')
  if (opts.title) await page.getByTestId('setup-title').fill(opts.title)
  await page.getByTestId(`theme-${opts.theme ?? 'studio'}`).click()
  await page.getByTestId('tab-all').click()
  await page.getByTestId(`template-${opts.template ?? 'halloween'}`).click()
  await page.getByTestId('setup-submit').click()
  await enterName(page, opts.name ?? 'Alice')
  await expect(page.getByTestId('board')).toBeVisible()
}

export async function join(browser: Browser, url: string, name: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(url)
  await enterName(page, name)
  await expect(page.getByTestId('board')).toBeVisible()
  return { page, ctx }
}

export const column = (page: Page, i: number) => page.locator('section[data-testid^="column-"]').nth(i)

/** Waits for finite animations (flights, drops) so drag and drop targets stop moving. */
export async function settle(page: Page) {
  await page.evaluate(() => Promise.all(
    document.getAnimations()
      .filter((a) => (a.effect?.getComputedTiming().iterations ?? 1) !== Infinity)
      .map((a) => a.finished.catch(() => undefined)),
  ))
}

/** Writes a private draft then publishes it from the column. */
export async function publishNote(page: Page, colIndex: number, text: string) {
  const col = column(page, colIndex)
  await col.locator('textarea').fill(text)
  await col.locator('textarea').press('Enter')
  await col.locator('[data-testid^="publish-"]').click()
  await expect(noteByText(page, text)).toBeVisible()
  await settle(page)
}

export const noteByText = (page: Page, text: string) => page.locator('article.note', { hasText: text })

/**
 * Collects console errors, page errors and CSP violations with their details
 * (browsers word CSP console messages differently and some omit the blocked resource).
 */
export async function collectProblems(page: Page): Promise<string[]> {
  const problems: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  page.on('pageerror', (e) => problems.push(String(e)))
  await page.exposeFunction('__reportCsp', (s: string) => problems.push(s))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const report = (window as unknown as { __reportCsp: (s: string) => void }).__reportCsp
      report(`CSP ${e.effectiveDirective} blocked=${e.blockedURI} source=${e.sourceFile}:${e.lineNumber} sample=${e.sample}`)
    })
  })
  return problems
}
