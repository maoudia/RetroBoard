import { expect, type Page, test } from '@playwright/test'
import { THEMES } from '../../packages/themes/src/index'
import { lowContrast, settle } from './helpers'

/**
 * Scrum Poker on every theme (change poker-design-v2, task 6.1): the start page, the name step and the room in its four states (lobby, voting,
 * waiting, revealed) in the nine themes, light and dark. The theme is the device's default theme, as a person's own choice would set it.
 * Every text keeps 4.5:1 (3:1 when large) and the edge of every card and empty slot keeps 3:1 against what is behind it (K11); the room is
 * played by three tabs of one browser (the seat lives in the tab's session storage, so each tab is a person).
 */
const EDGES = '.pcard'
const participantLink = (page: Page) => page.url().replace(/(#c=[A-Za-z0-9_-]{44})[A-Za-z0-9_-]+$/, '$1')
const live = async (page: Page, name: string) => {
  await page.getByTestId('poker-name').fill(name)
  await page.getByTestId('poker-name-join').click()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
}

for (const variant of ['light', 'dark'] as const) {
  for (const { id: theme } of THEMES) {
    test(`poker contrast, ${theme}, ${variant} (change poker-design-v2)`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: variant, reducedMotion: 'reduce', locale: 'en-US' })
      await ctx.addInitScript(([id, v]) => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ uiMode: 'advanced', defaultTheme: id, variant: v })) } catch { /* ignore */ } }, [theme, variant])
      const [a, b, c] = await Promise.all([ctx.newPage(), ctx.newPage(), ctx.newPage()])
      const check = async (page: Page, where: string) => { await settle(page); expect(await lowContrast(page, EDGES), `${theme} ${variant}: ${where}`).toEqual([]) }

      await a.goto('/poker')
      await check(a, 'start page')
      await a.getByTestId('poker-start-action').click()
      await expect(a.getByTestId('poker-name')).toBeVisible()
      await check(a, 'name step')
      await live(a, 'Ann')
      await check(a, 'lobby')
      // Two more people sit down: the round is being voted (nobody has voted yet).
      for (const [page, name] of [[b, 'Bob'], [c, 'Cy']] as const) { await page.goto(participantLink(a)); await live(page, name) }
      await expect(a.getByTestId('poker-seat')).toHaveCount(3)
      await check(a, 'voting')
      await a.getByTestId('poker-card-4').check({ force: true })
      await expect(a.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(1)
      await check(a, 'waiting')
      // The card back is the accent of the active theme (light or dark): nothing in the room has a colour of its own.
      const accent = await a.evaluate(() => { const probe = document.createElement('i'); probe.style.color = 'var(--accent)'; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c })
      expect(await a.locator('.pcard.back').first().evaluate((el) => getComputedStyle(el, '::before').backgroundImage), `${theme} ${variant}: the back follows the accent`).toContain(accent)
      await check(b, 'voting, a guest')
      await b.getByTestId('poker-card-4').check({ force: true })
      await c.getByTestId('poker-card-6').check({ force: true })
      await expect(a.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(3)
      await a.getByTestId('poker-reveal').click()
      await expect(a.getByTestId('poker-results')).toBeVisible()
      await check(a, 'revealed')
      await check(b, 'revealed, a guest')
      await ctx.close()
    })
  }
}
