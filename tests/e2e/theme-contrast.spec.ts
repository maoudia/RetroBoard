import { expect, type Page, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { axe, createBoard, publishNote, settle } from './helpers'
const THEMES = [{ id: 'studio' }, { id: 'corporate' }, { id: 'slate' }, { id: 'paper' }, { id: 'minimal' }, { id: 'halloween' }, { id: 'noel' }, { id: 'cyber' }, { id: 'sakura' }]

// Change quality-gates-v2: every theme in light and dark is checked for text contrast (WCAG 2.2 AA) on the board.
// Results go to test-results/contrast/*.json; `node scripts/quality/contrast-report.mjs` turns them into a table.

async function contrast(page: Page) {
  await settle(page)
  const result = await axe(page).withRules(['color-contrast']).analyze()
  return result.violations.flatMap((v) => v.nodes.map((n) => ({ id: v.id, target: n.target.join(' ') })))
}

for (const theme of THEMES) for (const variant of ['light', 'dark'] as const) {
  test(`contrast: ${theme.id} ${variant}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: variant })
    await page.addInitScript((v) => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant: v })) } catch { /* ignore */ } }, variant)
    await createBoard(page, { theme: theme.id, template: 'start-stop-continue' })
    await publishNote(page, 0, 'Contrast check')
    const violations = await contrast(page)
    mkdirSync('test-results/contrast', { recursive: true })
    writeFileSync(`test-results/contrast/${theme.id}-${variant}.json`, JSON.stringify({ theme: theme.id, variant, violations }, null, 2))
    expect(violations, `${theme.id} ${variant}`).toEqual([])
  })
}

test('the run catches a seeded low-contrast token', async ({ page }) => {
  await createBoard(page, { theme: 'studio', template: 'start-stop-continue' })
  await publishNote(page, 0, 'Seeded')
  await page.evaluate(() => { for (const el of document.querySelectorAll<HTMLElement>('article.note')) { el.style.setProperty('color', '#d8d8d8', 'important'); el.style.setProperty('background', '#fff', 'important') } }) // CSSOM is allowed under the strict CSP
  expect((await contrast(page)).length).toBeGreaterThan(0)
})
