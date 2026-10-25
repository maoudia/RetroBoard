import { type Browser, expect, type Page } from '@playwright/test'

export async function enterName(page: Page, name: string, show = true) {
  await page.getByTestId('name-input').fill(name)
  if (show) await page.getByTestId('name-show').check()
  await page.getByTestId('name-save').click()
}

export async function createBoard(page: Page, opts: { theme?: string; template?: string; name?: string; title?: string; keepShare?: boolean; oneFacilitator?: boolean } = {}) {
  await page.goto('/new')
  if (opts.title) await page.getByTestId('setup-title').fill(opts.title)
  await page.getByTestId(`theme-${opts.theme ?? 'studio'}`).click()
  await page.getByTestId('tab-all').click()
  await page.getByTestId(`template-${opts.template ?? 'halloween'}`).click()
  await page.getByTestId('setup-submit').click()
  await enterName(page, opts.name ?? 'Alice')
  await expect(page.getByTestId('board')).toBeVisible()
  if (!opts.keepShare) await closeShare(page)
  if (opts.oneFacilitator) await setOneFacilitator(page)
}

/** Boards are open ("Everyone facilitates") by default; role tests switch to "One facilitator" first. */
export async function setOneFacilitator(page: Page) {
  const share = await page.getByTestId('share-url').isVisible()
  if (share) await page.keyboard.press('Escape')
  await page.getByTestId('btn-options').click()
  const toggle = page.getByTestId('opt-open-facilitation')
  await toggle.uncheck()
  await expect(toggle).not.toBeChecked()
  await page.keyboard.press('Escape')
}

/** A new board opens the invite panel: close it so tests start from the board. */
export async function closeShare(page: Page) {
  await expect(page.getByTestId('share-url')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('share-url')).toBeHidden()
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
  const webkit = page.context().browser()?.browserType().name() === 'webkit'
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    // WebKit prints this for stylesheets it never reports through a securitypolicyviolation
    // event; a real blocked style does fire the event, which is still collected below.
    if (webkit && m.text().startsWith('Refused to apply a stylesheet because its hash')) return
    problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(String(e)))
  await page.exposeFunction('__reportCsp', (s: string) => problems.push(s))
  await page.addInitScript(() => {
    // Some engines (WebKit) report attribute violations without a sample: remember who wrote
    // inline styles recently so the report points at the call site.
    const writes: string[] = []
    const remember = (what: string) => { writes.push(`${what} @ ${(new Error().stack ?? '').split('\n').slice(2, 5).join(' < ')}`); if (writes.length > 5) writes.shift() }
    const setAttr = Element.prototype.setAttribute
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (name.toLowerCase() === 'style') remember(`setAttribute(style) on <${this.tagName.toLowerCase()}>`)
      return setAttr.call(this, name, value)
    }
    const html = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!
    Object.defineProperty(Element.prototype, 'innerHTML', { ...html, set(v: string) { if (/style\s*=/.test(String(v))) remember(`innerHTML with style= on <${(this as Element).tagName.toLowerCase()}>`); html.set!.call(this, v) } })
    const css = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'cssText')!
    Object.defineProperty(CSSStyleDeclaration.prototype, 'cssText', { ...css, set(v: string) { remember('style.cssText'); css.set!.call(this, v) } })
    document.addEventListener('securitypolicyviolation', (e) => {
      // WebKit reports its own empty style attribute on native <select> elements (nothing is
      // blocked: the attribute is empty). Only that exact case is ignored.
      if (e.effectiveDirective === 'style-src-attr' && e.target instanceof HTMLSelectElement && (e.target.getAttribute('style') ?? '') === '') return
      const report = (window as unknown as { __reportCsp: (s: string) => void }).__reportCsp
      // The event target is the offending element: name it (tag, classes, test id, style attribute).
      const el = e.target instanceof Element ? e.target : null
      const who = el ? `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}" data-testid="${el.getAttribute('data-testid') ?? ''}" style="${el.getAttribute('style') ?? ''}"> in <${el.parentElement?.tagName.toLowerCase() ?? '?'} class="${el.parentElement?.getAttribute('class') ?? ''}">` : String(e.target)
      report(`CSP ${e.effectiveDirective} blocked=${e.blockedURI} source=${e.sourceFile}:${e.lineNumber}:${e.columnNumber} sample=${e.sample} element=${who} recent inline style writes: ${writes.join(' | ') || 'none'}`)
    })
  })
  return problems
}
