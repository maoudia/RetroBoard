import { expect, type Page, test } from '@playwright/test'
import { axe, settle } from './helpers'

/**
 * Scrum Poker demo (change scrum-poker, ADR-0042, task 1.1): two tabs, one real relay. It runs only against a site generated with
 * NUXT_PUBLIC_POKER_DEMO=1; a normal build has no /poker page and the spec says so and skips.
 */
const watch = (page: Page, errors: string[]) => {
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
}

test('two tabs create a room, join by the link, pick cards, and nothing shows until Reveal', async ({ browser, request, baseURL }) => {
  const probe = await request.get('/poker')
  test.skip(probe.status() === 404, 'this build has no poker demo: NUXT_PUBLIC_POKER_DEMO=1 pnpm generate')
  const errors: string[] = []
  const ctxA = await browser.newContext(); const ctxB = await browser.newContext()
  const a = await ctxA.newPage(); const b = await ctxB.newPage()
  watch(a, errors); watch(b, errors)
  const requests: string[] = []
  for (const p of [a, b]) p.on('request', (r) => requests.push(r.url()))

  // Tab A starts a room and names itself.
  await a.goto('/poker')
  await a.getByTestId('poker-start-action').click()
  await expect(a).toHaveURL(/\/poker\/room#c=/)
  await a.getByTestId('poker-name').fill('Ann')
  await a.getByTestId('poker-name-join').click()
  await expect(a.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(a.getByTestId('poker-seat')).toHaveCount(1)

  // The link to share is the participant link: it never carries the moderator secret.
  const link = await a.getByTestId('poker-share-url').inputValue()
  expect(link).toMatch(/\/poker\/room#c=[A-Za-z0-9_-]{44}$/)
  expect(a.url().split('#c=')[1]!.length).toBe(66)

  // Tab B opens it and joins with a name.
  await b.goto(link)
  await b.getByTestId('poker-name').fill('Bob')
  await b.getByTestId('poker-name-join').click()
  await expect(b.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(a.getByTestId('poker-seat')).toHaveCount(2)
  await expect(b.getByTestId('poker-seat')).toHaveCount(2)
  await expect(b.getByTestId('poker-reveal')).toHaveCount(0)

  // Each picks a card. Nothing is shown: a seat says it has voted, never what.
  await b.getByTestId('poker-card-6').check({ force: true })
  await a.getByTestId('poker-card-4').check({ force: true })
  for (const page of [a, b]) {
    await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(2)
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(0)
    await expect(page.getByTestId('poker-seat-state').filter({ hasText: /^(5|13)$/ })).toHaveCount(0)
  }

  // The moderator reveals: every card flips on both tabs.
  await expect(a.getByTestId('poker-reveal')).toBeEnabled()
  await a.getByTestId('poker-reveal').click()
  for (const page of [a, b]) {
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(2)
    await expect(page.getByTestId('poker-seat-state')).toHaveText(['5', '13'])
  }
  // WCAG 2.2 AA on the settled room, face up, in light and dark (the bar of the accessibility suite).
  await a.emulateMedia({ reducedMotion: 'reduce' })
  for (const colorScheme of ['light', 'dark'] as const) {
    await a.emulateMedia({ colorScheme })
    await settle(a)
    const found = await axe(a).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(found.violations.map((v) => `${colorScheme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
  }

  // A new round starts blank.
  await a.getByTestId('poker-next').click()
  for (const page of [a, b]) {
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(0)
  }

  // The room id and the keys stayed in the fragment: no request carried them.
  const roomPart = link.split('#c=')[1]!.slice(0, 22)
  expect(requests.filter((u) => u.includes(roomPart))).toEqual([])
  expect(baseURL).toBeTruthy()
  expect(errors).toEqual([])
  await ctxA.close(); await ctxB.close()
})

test('a link that is not a room says so', async ({ page, request }) => {
  const probe = await request.get('/poker')
  test.skip(probe.status() === 404, 'this build has no poker demo: NUXT_PUBLIC_POKER_DEMO=1 pnpm generate')
  await page.goto('/poker/room#nonsense')
  await expect(page.getByTestId('poker-bad-link')).toBeVisible()
})
