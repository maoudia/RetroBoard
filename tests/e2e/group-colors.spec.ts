import { expect, test, type Page } from '@playwright/test'
import { THEMES } from '../../packages/themes/src/index'
import { axe, createBoard, join, noteByText, publishNote, settle } from './helpers'

/** Group colours (change group-colors-menu-and-scope, tasks 1.1 and 1.2): the cluster uses the note colour picker, quick row and extended shades. */

type Store = { snapshot: { notes: { id: string; text: string; groupId?: string; color: number }[]; groups: { id: string }[] }; commands: Record<string, (...a: unknown[]) => void> }
const boardStore = (page: Page) => page.evaluateHandle(() => (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, unknown> } } } } }).__vue_app__.config.globalProperties.$pinia._s.get('board') as Store)

/** Publishes two notes and groups them through the store (the drag is covered by clusters.spec.ts). */
async function groupOfTwo(page: Page) {
  for (const t of ['R1', 'R2']) await publishNote(page, 0, t)
  const store = await boardStore(page)
  await store.evaluate((s) => { const [a, b] = s.snapshot.notes; s.commands.groupNotes!(b!.id, a!.id) })
  await expect(page.locator('.cluster .stack')).toHaveCount(1)
  await settle(page)
}

test('a cluster is recoloured with the quick row, then with an extended shade from the palette; a frozen note keeps its colour', async ({ page, browser, isMobile }) => {
  test.skip(isMobile, 'the cluster panel footer is covered on desktop')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await join(browser, page.url(), 'Bob')
  await groupOfTwo(page)
  const store = await boardStore(page)
  const ids = await store.evaluate((s) => s.snapshot.notes.map((n) => n.id))
  await store.evaluate((s, id) => s.commands.freeze!(id), ids[0]!)

  await page.locator('.cluster .stack').click()
  const notes = page.locator('[data-testid="group-panel"] article.note')
  await page.getByTestId('cluster-recolor').click()
  await page.getByTestId('cluster-color-5').click()
  await expect(notes.nth(1)).toHaveAttribute('style', /--note-5\)/)
  await expect(notes.nth(0)).not.toHaveAttribute('style', /--note-5\)/) // frozen: kept its colour

  // More shades: the palette sheet opens for the cluster, base shades first, and an extended shade recolours the notes.
  await page.getByTestId('cluster-palette').click()
  await expect(page.locator('[data-testid^="palette-"][role="radio"]')).toHaveCount(8)
  await expect(page.getByTestId('palette-5')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('palette-more').click()
  await expect(page.locator('[data-testid^="palette-"][role="radio"]')).toHaveCount(24)
  expect(await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze().then((r) => r.violations.map((v) => v.id))).toEqual([])
  await page.getByTestId('palette-17').click()
  await expect(page.getByTestId('palette')).toBeHidden()
  await expect(page.getByTestId('group-panel')).toBeVisible()
  await expect(notes.nth(1)).toHaveAttribute('style', /--note-17\)/)

  // The cluster already in an extended shade opens its palette on more shades, the current one checked.
  await page.getByTestId('cluster-palette').click()
  await expect(page.locator('[data-testid^="palette-"][role="radio"]')).toHaveCount(24)
  await expect(page.getByTestId('palette-17')).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('palette')).toBeHidden()
  await expect(page.getByTestId('group-panel')).toBeVisible()

  await page.getByTestId('group-close').click()
  await expect(noteByText(bob.page, 'R2')).toHaveCount(0) // grouped notes are inside the stack for Bob too
  await bob.page.locator('.cluster .stack').click()
  await expect(bob.page.locator('[data-testid="group-panel"] article.note').nth(1)).toHaveAttribute('style', /--note-17\)/)
  await bob.ctx.close()
})

/** Ink and fill of the stack must keep 4.5:1 in the 24 shades of every theme, light and dark (#225, themes package tests for the notes). */
for (const variant of ['light', 'dark'] as const) {
  for (const { id: theme } of THEMES) {
    test(`cluster stack contrast in the 24 shades, ${theme}, ${variant}`, async ({ page, isMobile }) => {
      test.skip(isMobile, 'the stack looks the same on a phone')
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: variant })
      await page.addInitScript((v) => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant: v })) } catch { /* ignore */ } }, variant)
      await createBoard(page, { theme, template: 'start-stop-continue' })
      await groupOfTwo(page)
      const store = await boardStore(page)
      const gid = await store.evaluate((s) => s.snapshot.groups[0]!.id)
      const low: string[] = []
      for (let i = 0; i < 24; i++) {
        await store.evaluate((s, a) => s.commands.recolorGroup!(a.gid, a.i), { gid, i })
        await expect(page.locator('.cluster .stack')).toHaveAttribute('style', new RegExp(`--note-${i}\\)`))
        await settle(page)
        const ratio = await page.locator('.cluster .stack').evaluate((el) => {
          const parse = (c: string) => { const p = c.match(/[\d.]+/g)!.map(Number); return { r: p[0]!, g: p[1]!, b: p[2]! } }
          const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
          const lum = (c: { r: number; g: number; b: number }) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
          const face = getComputedStyle(el.querySelector('.face')!).backgroundColor
          const worst = Math.min(...['.text', '.count'].map((sel) => {
            const L1 = lum(parse(getComputedStyle(el.querySelector(sel)!).color)), L2 = lum(parse(face))
            return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
          }))
          return worst
        })
        if (ratio < 4.5) low.push(`shade ${i}: ${ratio.toFixed(2)}`)
      }
      expect(low).toEqual([])
    })
  }
}
