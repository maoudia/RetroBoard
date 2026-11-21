import { expect, type Page, test } from '@playwright/test'
import { axe, createBoard, settle } from './helpers'

/**
 * Scrum Poker (change scrum-poker, tasks 1.2, 1.3 and the first slice of 3.1, beta): the entries of the landing page and the menus, the start
 * page with its deck chips and typed list, a room of three people on one real relay, keyboard and click play, the results line, a re-vote
 * and a next round, a reload, a poker link opened as a board. It runs on every build: the poker pages are in all of them.
 */
const watch = (page: Page, errors: string[]) => {
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
}
const wcag = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const noViolation = async (page: Page, where: string) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await settle(page)
    const found = await axe(page).withTags(wcag).analyze()
    expect(found.violations.map((v) => `${where} ${colorScheme} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
  }
}
const cardsOf = (page: Page) => page.getByTestId('poker-deck-cards').locator('li')

test('the start page offers deck chips and a typed list, shown as round chips', async ({ page }) => {
  await page.goto('/poker')
  // Fibonacci is chosen at once: one click on Create is a room.
  await expect(page.getByTestId('poker-deck-fibonacci')).toBeChecked()
  await expect(cardsOf(page)).toHaveText(['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'])
  await expect(page.getByTestId('poker-start-action')).toBeEnabled()

  await page.getByTestId('poker-deck-tshirt').check({ force: true })
  await expect(cardsOf(page)).toHaveText(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'])
  await expect(page.getByTestId('poker-cards')).toHaveValue('XS, S, M, L, XL, XXL, ?')
  await page.getByTestId('poker-deck-powers').check({ force: true })
  await expect(cardsOf(page)).toHaveText(['1', '2', '4', '8', '16', '32', '64', '?'])
  await page.getByTestId('poker-deck-modified').check({ force: true })
  await expect(cardsOf(page)).toHaveCount(13)

  // A typed list becomes the deck and the "Custom" chip; a bad one says why and cannot be created.
  await page.getByTestId('poker-cards').fill('1, 2, 4, 8, ?')
  await expect(page.getByTestId('poker-deck-custom')).toBeChecked()
  await expect(cardsOf(page)).toHaveText(['1', '2', '4', '8', '?'])
  for (const [typed, problem] of [['1', /au moins 2|at least 2/i], ['1, 2, 2', /identiques|the same/i], ['1, 2, 1234567', /6 caract|6 characters/i], [Array.from({ length: 25 }, (_, i) => i).join(','), /24/]] as const) {
    await page.getByTestId('poker-cards').fill(typed)
    await expect(page.getByTestId('poker-deck-problem')).toContainText(problem)
    await expect(page.getByTestId('poker-start-action')).toBeDisabled()
  }
  // The team colours section is there and collapsed.
  await expect(page.locator('details.colours')).not.toHaveAttribute('open', '')
  await page.getByTestId('poker-cards').fill('S, M, L')
  await expect(page.getByTestId('poker-start-action')).toBeEnabled()
  await page.getByTestId('poker-deck-fibonacci').check({ force: true })
  await page.locator('details.colours summary').click()
  await noViolation(page, 'start')
})

test('three people play a round: keys and clicks, the cards stay hidden, the results line, a re-vote and the next round', async ({ browser }) => {
  const errors: string[] = []
  const phone = !!test.info().project.use.isMobile
  // Three people, three browser contexts with the options of the project (the phone project gives phone contexts).
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext(test.info().project.use)))
  const [a, b, c] = await Promise.all(contexts.map((ctx) => ctx.newPage()))
  for (const p of [a!, b!, c!]) watch(p, errors)
  const requests: string[] = []
  for (const p of [a!, b!, c!]) p.on('request', (r) => requests.push(r.url()))

  // Ann creates the room with a typed deck of her own.
  await a!.goto('/poker')
  await a!.getByTestId('poker-cards').fill('1, 2, 4, 8, ?')
  await a!.getByTestId('poker-start-action').click()
  await expect(a!).toHaveURL(/\/poker\/room#c=/)
  await a!.getByTestId('poker-name').fill('Ann')
  await a!.getByTestId('poker-name-join').click()
  await expect(a!.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(a!.getByTestId('poker-hand').locator('.pick')).toHaveCount(5)
  await expect(a!.getByTestId('poker-round')).toHaveText(/1/)

  // The link to share is the participant link: it never carries the moderator secret.
  const link = await a!.getByTestId('poker-share-url').inputValue()
  expect(link).toMatch(/\/poker\/room#c=[A-Za-z0-9_-]{44}$/)
  expect(a!.url().split('#c=')[1]!.length).toBe(66)

  for (const [page, name] of [[b!, 'Bob'], [c!, 'Cy']] as const) {
    await page.goto(link)
    await page.getByTestId('poker-name').fill(name)
    await page.getByTestId('poker-name-join').click()
    await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
    // The deck of the room is the moderator's choice, whoever joins.
    await expect(page.getByTestId('poker-hand').locator('.pick')).toHaveCount(5)
    await expect(page.getByTestId('poker-reveal')).toHaveCount(0)
  }
  for (const page of [a!, b!, c!]) await expect(page.getByTestId('poker-seat')).toHaveCount(3)

  // Ann plays with the keyboard (the key 2 is the card 2), Bob clicks the 8, Cy types 4 and changes it for 4 again (still one card).
  await a!.getByTestId('poker-seats').focus()
  await a!.keyboard.press('2')
  await expect(a!.getByTestId('poker-card-1')).toBeChecked()
  await b!.getByTestId('poker-card-3').check({ force: true })
  await c!.keyboard.press('1'); await c!.keyboard.press('4')
  await expect(c!.getByTestId('poker-card-2')).toBeChecked()
  for (const page of [a!, b!, c!]) {
    await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(3)
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(0)
    await expect(page.getByTestId('poker-seat-state')).toHaveText(['Has voted', 'Has voted', 'Has voted'].map((s) => new RegExp(`${s}|A voté`)))
    await expect(page.getByTestId('poker-results')).toHaveCount(0)
  }
  await expect(b!.getByTestId('poker-reveal')).toHaveCount(0)

  // The moderator reveals: every card flips on every tab and the results line appears.
  await expect(a!.getByTestId('poker-reveal')).toBeEnabled()
  await a!.getByTestId('poker-reveal').click()
  for (const page of [a!, b!, c!]) {
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(3)
    await expect(page.getByTestId('poker-seat-state')).toHaveText(['2', '8', '4'])
    await expect(page.getByTestId('poker-average')).toHaveText('4.67')
    await expect(page.getByTestId('poker-median')).toHaveText('4')
    await expect(page.getByTestId('poker-mode')).toHaveText('2, 4, 8')
    await expect(page.getByTestId('poker-spread')).toContainText(/2 (à|to) 8/)
    await expect(page.getByTestId('poker-agreement')).toHaveText(/^33 ?%$/)
    await expect(page.getByTestId('poker-suggestion')).toHaveText('4')
    await expect(page.getByTestId('poker-hand')).toHaveAttribute('disabled', '')
  }
  // Nobody but the moderator steers the next round.
  await expect(b!.getByTestId('poker-revote')).toHaveCount(0)
  await noViolation(a!, 'room')

  // Vote again: a round of its own that says so, cards face down again.
  await a!.getByTestId('poker-revote').click()
  for (const page of [a!, b!, c!]) {
    await expect(page.getByTestId('poker-round')).toHaveText(/2/)
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(0)
    await expect(page.getByTestId('poker-results')).toHaveCount(0)
    await expect(page.getByTestId('poker-hand')).not.toHaveAttribute('disabled', '')
  }
  await expect(a!.getByTestId('poker-reveal')).toBeDisabled()
  await a!.getByTestId('poker-card-1').check({ force: true })
  await b!.getByTestId('poker-card-1').check({ force: true })
  await a!.getByTestId('poker-reveal').click()
  await expect(a!.getByTestId('poker-agreement')).toContainText('100')
  await expect(a!.getByTestId('poker-agreement')).toContainText(/unanimi/i)
  // Cy did not vote: two cards, the other seat stays empty.
  await expect(a!.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(2)

  // Next round: blank again.
  await a!.getByTestId('poker-next').click()
  for (const page of [a!, b!, c!]) await expect(page.getByTestId('poker-round')).toHaveText(/3/)

  if (phone) {
    // Phone: a thumb-sized hand and nothing that scrolls sideways.
    const height = await b!.getByTestId('poker-card-0').locator('xpath=following-sibling::span').evaluate((el) => el.getBoundingClientRect().height)
    expect(height).toBeGreaterThanOrEqual(48)
    expect(await b!.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  // The room id and the keys stayed in the fragment: no request carried them.
  const roomPart = link.split('#c=')[1]!.slice(0, 22)
  expect(requests.filter((u) => u.includes(roomPart))).toEqual([])
  expect(errors).toEqual([])
  await Promise.all(contexts.map((ctx) => ctx.close()))
})

test('a link that is not a room says so', async ({ page }) => {
  await page.goto('/poker/room#nonsense')
  await expect(page.getByTestId('poker-bad-link')).toBeVisible()
})

test('a visitor finds Scrum Poker from the landing page and the library, marked beta, and the page speaks both languages', async ({ page }) => {
  const errors: string[] = []
  watch(page, errors)
  await page.goto('/')
  // The hero action is a button of the same shape as "Try it solo"; the beta mark is a word.
  const hero = page.getByTestId('hero-poker')
  await expect(hero).toBeVisible()
  await expect(hero).toContainText('Scrum Poker')
  await expect(hero.getByTestId('beta-tag')).toHaveText(/b[eê]ta/i)
  expect((await hero.boundingBox())!.height).toBe((await page.getByTestId('solo').boundingBox())!.height)
  if (!test.info().project.use.isMobile) await expect(page.getByTestId('nav-poker')).toBeVisible()
  await hero.click()
  await expect(page).toHaveURL(/\/poker$/)
  await expect(page.getByTestId('poker-start')).toBeVisible()
  await expect(page.getByTestId('poker-start').getByTestId('beta-tag')).toBeVisible()

  // The language is one tap away on the page itself.
  await page.getByTestId('poker-lang-en').click()
  await expect(page.getByTestId('poker-start-action')).toHaveText(/Create the room/)
  await expect(page.getByTestId('poker-beta-note')).toContainText(/Beta/)
  await page.getByTestId('poker-lang-fr').click()
  await expect(page.getByTestId('poker-start-action')).toHaveText(/Créer la salle/)
  await page.getByTestId('poker-home').click()
  await expect(page.getByTestId('hero-title')).toBeVisible()

  // The library page lists it too.
  await page.goto('/boards')
  await page.getByTestId('library-poker').click()
  await expect(page.getByTestId('poker-start')).toBeVisible()
  expect(errors).toEqual([])
})

test('the board menu lists Scrum Poker, marked beta', async ({ page, browserName }) => {
  // The board creation helper and the boards menu of the toolbar are the desktop ones (the phone toolbar has no boards menu; WebKit logs a CSP notice on /new that boards own).
  test.skip(browserName !== 'chromium' || !!test.info().project.use.isMobile, 'desktop Chromium: the board creation flow of the helper')
  await createBoard(page)
  await page.getByTestId('btn-boards').click()
  await expect(page.getByTestId('boards-poker').getByTestId('beta-tag')).toBeVisible()
  await page.getByTestId('boards-poker').click()
  await expect(page.getByTestId('poker-start')).toBeVisible()
})

test('the room survives a reload, offers the link as text, share and QR, and says what to do next', async ({ page }) => {
  const errors: string[] = []
  watch(page, errors)
  await page.goto('/poker')
  await page.getByTestId('poker-start-action').click()
  await page.getByTestId('poker-name').fill('Ann')
  await page.getByTestId('poker-name-join').click()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  // Alone in the room: the page says to share the link, and the QR code is one tap away.
  await expect(page.getByTestId('poker-alone')).toBeVisible()
  await expect(page.getByTestId('qr')).toHaveCount(0)
  await page.getByTestId('poker-qr-toggle').click()
  await expect(page.getByTestId('qr')).toBeVisible()
  // The name step, the alone hint, the share block with its QR code and the language buttons pass axe in light and dark.
  await noViolation(page, 'room-alone')
  await page.getByTestId('poker-card-3').check({ force: true })
  await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(1)

  // A reload keeps the seat, the moderator role and the card: no name asked again, still one seat.
  await page.reload()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(page.getByTestId('poker-name')).toHaveCount(0)
  await expect(page.getByTestId('poker-seat')).toHaveCount(1)
  await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(1)
  await expect(page.getByTestId('poker-card-3')).toBeChecked()
  await expect(page.getByTestId('poker-reveal')).toBeEnabled()
  expect(errors).toEqual([])
})

test('a participant is told who steers, and a poker link pasted in the landing field or opened as a board lands in the room', async ({ browser }) => {
  const contexts = await Promise.all([0, 1].map(() => browser.newContext(test.info().project.use)))
  const [a, b] = await Promise.all(contexts.map((ctx) => ctx.newPage()))
  await a!.goto('/poker')
  await a!.getByTestId('poker-start-action').click()
  await a!.getByTestId('poker-name').fill('Ann')
  await a!.getByTestId('poker-name-join').click()
  await expect(a!.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  const link = await a!.getByTestId('poker-share-url').inputValue()

  // Bob pastes the room link in the join field of the landing page: the poker room opens, not a board.
  await b!.goto('/')
  await b!.getByTestId('join-input').fill(link)
  await b!.getByTestId('join-go').click()
  await expect(b!).toHaveURL(/\/poker\/room#c=/)
  await b!.getByTestId('poker-name').fill('Bob')
  await b!.getByTestId('poker-name-join').click()
  await expect(b!.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(b!.getByTestId('poker-participant-wait')).toBeVisible()
  await expect(b!.getByTestId('poker-alone')).toHaveCount(0)
  await b!.getByTestId('poker-card-2').check({ force: true })
  await a!.getByTestId('poker-reveal').click()
  await expect(b!.getByTestId('poker-participant-wait')).toContainText(/suivant|next/i)

  // The same link opened as a board (an old bookmark, a pasted /boards address) is handed to the room page.
  const hash = link.slice(link.indexOf('#'))
  await b!.goto(`/boards${hash}`)
  await expect(b!).toHaveURL(/\/poker\/room#c=/)
  await expect(b!.getByTestId('poker-room')).toBeVisible()
  await Promise.all(contexts.map((ctx) => ctx.close()))
})
