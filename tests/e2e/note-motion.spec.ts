import { expect, type Page, test } from '@playwright/test'
import { addDraft, column, columnId as colId, createBoard, join, noteByText, publishNote, settle } from './helpers'

/**
 * Note motion (change postit-visual-system, task 3.1): peel on hover, stick on publish, flutter when a note lands, snap when notes are
 * grouped. Each lasts under 400 ms, none moves text being edited, reduced motion turns them all off, and a 60-note board stays free of
 * long tasks. No screenshot baseline exists yet (future visual-regression change): the checks read the running animations and the browser's own long-task timeline.
 */
/** Starts collecting the names and durations of every animation that runs, frame by frame. */
const watchAnimations = (page: Page) => page.evaluate(() => {
  const seen: { name: string; ms: number }[] = []
  ;(window as unknown as { __seen: typeof seen }).__seen = seen
  const tick = () => {
    for (const a of document.getAnimations()) {
      const name = (a as CSSAnimation).animationName ?? a.id
      const t = a.effect?.getComputedTiming()
      if (name && t) seen.push({ name, ms: Number(t.duration) })
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})
const seen = (page: Page) => page.evaluate(() => (window as unknown as { __seen: { name: string; ms: number }[] }).__seen)

test.describe('note motion', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse and keyboard flows')

  test('peel: resting the mouse on a note lifts its corner, the text stays put', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Peel me')
    const note = noteByText(page, 'Peel me')
    const corner = () => note.evaluate((el) => getComputedStyle(el, '::after').opacity)
    await page.mouse.move(0, 400)
    expect(await corner()).toBe('0')
    const before = (await note.getByTestId('note-text').boundingBox())!
    await note.hover()
    await expect(async () => expect(await corner()).toBe('1')).toPass()
    await settle(page)
    // The note lifts a few pixels as a whole; its text keeps its size and its place inside the card.
    const after = (await note.getByTestId('note-text').boundingBox())!
    expect(Math.abs(after.width - before.width)).toBeLessThan(6)
    expect(Math.abs(after.x - before.x)).toBeLessThan(8)
  })

  test('stick and flutter: my note flies then sticks, another participant sees it flutter in, each under 400 ms', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', keepShare: true })
    const link = await page.getByTestId('share-url').inputValue()
    await page.keyboard.press('Escape')
    const bob = await join(browser, link, 'Bob')
    await watchAnimations(page)
    await watchAnimations(bob.page)
    await publishNote(page, 0, 'Stuck on the board')
    await expect(noteByText(bob.page, 'Stuck on the board')).toBeVisible()
    await settle(bob.page)
    const mine = await seen(page)
    const theirs = await seen(bob.page)
    expect(mine.map((a) => a.name)).toContain('note-stick')
    expect(theirs.map((a) => a.name)).toContain('note-flutter')
    for (const a of [...mine, ...theirs].filter((x) => /^(note-|stack-)/.test(x.name))) expect(a.ms, a.name).toBeLessThan(400)
    // The flight of my own note is the entrance: no flutter on top of it.
    expect(mine.map((a) => a.name)).not.toContain('note-flutter')
    await bob.ctx.close()
  })

  test('snap: grouping a note makes the stack click into place', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await publishNote(page, 0, 'Three')
    await watchAnimations(page)
    await noteByText(page, 'Two').dragTo(noteByText(page, 'One'))
    await expect(page.locator('.cluster .stack')).toBeVisible()
    await settle(page)
    expect((await seen(page)).filter((a) => a.name === 'stack-snap').length).toBeGreaterThan(0)
    await noteByText(page, 'Three').dragTo(page.locator('.cluster .stack'))
    await expect(page.locator('.stack .count')).toContainText('3')
    await expect(async () => expect((await seen(page)).filter((a) => a.name === 'stack-snap').length).toBeGreaterThan(1)).toPass()
    for (const a of (await seen(page)).filter((x) => x.name === 'stack-snap')) expect(a.ms).toBeLessThan(400)
  })

  for (const how of ['OS preference', 'profile setting'] as const) {
    test(`reduced motion (${how}): publishing and grouping run no animated transition`, async ({ page }) => {
      if (how === 'OS preference') await page.emulateMedia({ reducedMotion: 'reduce' })
      else await page.addInitScript(() => localStorage.setItem('retroboard:settings', JSON.stringify({ uiMode: 'advanced', motion: 'reduced' })))
      await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
      await watchAnimations(page)
      await publishNote(page, 0, 'Quiet one')
      await publishNote(page, 0, 'Quiet two')
      await noteByText(page, 'Quiet two').dragTo(noteByText(page, 'Quiet one'))
      await expect(page.locator('.cluster .stack')).toBeVisible()
      await settle(page)
      const ran = (await seen(page)).filter((a) => /^(note-|stack-)/.test(a.name))
      // Reduced motion leaves at most a one-millisecond jump to the end state; the flight and the stick are not started.
      for (const a of ran) expect(a.ms, a.name).toBeLessThanOrEqual(1)
      expect(ran.map((a) => a.name)).not.toContain('note-stick')
    })
  }

  test('a note being edited does not move', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Editing now')
    const note = noteByText(page, 'Editing now')
    const id = (await note.getAttribute('data-testid'))!.replace('note-', '')
    await note.hover()
    await page.getByTestId(`note-menu-${id}`).click()
    await page.getByTestId(`edit-${id}`).click()
    const editing = page.getByTestId(`note-${id}`)
    await expect(editing.locator('textarea')).toBeVisible()
    await page.mouse.move(0, 400)
    await editing.hover()
    expect(await editing.evaluate((el) => getComputedStyle(el, '::after').opacity)).toBe('0')
  })
})

test.describe('a 60-note board stays smooth', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'the long-task timeline is a Chromium API')
  test.setTimeout(120_000)

  test('no long task over 50 ms while hovering, zooming, publishing, grouping and scrolling', async ({ page, browser }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await addDraft(page, 0, 'seed')
    const cid = await colId(page, 0)
    const texts = Array.from({ length: 60 }, (_, i) => `Idee ${i + 1} ${'un texte assez long pour passer a la ligne '.repeat(1 + (i % 3)).slice(0, 20 + ((i * 29) % 120))}`)
    await page.evaluate(([c, all]) => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('retroboard:drafts:'))!
      localStorage.setItem(key, JSON.stringify((all as string[]).map((text, i) => ({ id: `seed${i}`, columnId: c, text, color: i % 8 }))))
    }, [cid, texts] as const)
    await page.reload()
    await expect(page.getByTestId('board')).toBeVisible()
    await column(page, 0).locator('[data-testid^="publish-"]').click()
    await expect(column(page, 0).locator('article.note')).toHaveCount(60)
    await settle(page)

    const tracing = process.env.PERF_TRACE ? `${process.env.PERF_TRACE}/trace-60-notes.json` : null
    if (tracing) await browser.startTracing(page, { path: tracing, categories: ['devtools.timeline', 'blink.user_timing', 'loading'] })
    await page.evaluate(() => {
      const w = window as unknown as { __long: number[]; __gaps: number[] }
      w.__long = []; w.__gaps = []
      new PerformanceObserver((list) => { for (const e of list.getEntries()) w.__long.push(Math.round(e.duration)) }).observe({ entryTypes: ['longtask'] })
      let last = performance.now()
      const tick = (t: number) => { w.__gaps.push(Math.round(t - last)); last = t; requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })

    const notes = column(page, 0).locator('article.note')
    // Hover across a dozen notes (peel), zoom and density by key, scroll the column.
    for (let i = 0; i < 12; i++) await notes.nth(i * 4).hover({ timeout: 3000 })
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    for (const k of ['+', '+', '-', '0', 'd', 'd', 'd']) { await page.keyboard.press(k); await page.waitForTimeout(120) }
    await column(page, 0).locator('.notes').evaluate(async (el) => { for (let y = 0; y < el.scrollHeight; y += 240) { el.scrollTop = y; await new Promise((r) => requestAnimationFrame(r)) } })
    // Publish one more note (flight and stick), then group two (snap).
    await addDraft(page, 0, 'La soixante et unieme')
    await column(page, 0).locator('[data-testid^="publish-"]').click()
    await expect(notes).toHaveCount(61)
    await settle(page)
    await notes.nth(1).dragTo(notes.nth(0))
    await settle(page)
    await page.waitForTimeout(400)
    if (tracing) await browser.stopTracing()

    const { long, gaps } = await page.evaluate(() => { const w = window as unknown as { __long: number[]; __gaps: number[] }; return { long: w.__long, gaps: w.__gaps } })
    const sorted = [...gaps].sort((a, b) => a - b)
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    console.log(`60-note board: long tasks over 50 ms: ${long.length} (${long.join(', ') || 'none'}); frames ${gaps.length}, p95 frame gap ${p95} ms, worst ${sorted.at(-1) ?? 0} ms`)
    expect(long, `long tasks (ms): ${long.join(', ')}`).toEqual([])
  })
})


