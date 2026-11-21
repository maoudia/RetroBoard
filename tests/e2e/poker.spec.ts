import { type Browser, type BrowserContext, expect, type Locator, type Page, test } from '@playwright/test'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
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
/** The participant link of a room, from the moderator's address (the first 44 characters of the key part): the room page never prints it. */
const participantLink = (page: Page) => page.url().replace(/(#c=[A-Za-z0-9_-]{44})[A-Za-z0-9_-]+$/, '$1')
/** The columns of the distribution, in the order of the page: the card and its count (both text on the page). */
const columns = (page: Page) => page.getByTestId('poker-distribution-item').evaluateAll((els) => els.map((e) => [e.getAttribute('data-card'), e.getAttribute('data-votes')]))
const cardsOf = (page: Page) => page.getByTestId('poker-deck-cards').locator('li')

/** The deck of a room made from the start page: Custom shows the typed list, which starts as the deck that was chosen. */
const typeDeck = async (page: Page, cards: string) => {
  await page.getByTestId('poker-deck-custom').check({ force: true })
  await page.getByTestId('poker-cards').fill(cards)
}

test('the start page is one decision: deck chips fill the round chips, the typed list is for Custom only, a bad list is refused', async ({ page }) => {
  await page.goto('/poker')
  // Fibonacci is chosen at once: one press on Create is a room.
  await expect(page.getByTestId('poker-deck-fibonacci')).toBeChecked()
  await expect(cardsOf(page)).toHaveText(['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'])
  await expect(page.getByTestId('poker-start-action')).toBeEnabled()
  // The headline, the Beta tag once, one lead line and one muted privacy line; no typed list for a preset.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByTestId('beta-tag')).toHaveCount(1)
  await expect(page.getByTestId('poker-cards')).toHaveCount(0)

  await page.getByTestId('poker-deck-tshirt').check({ force: true })
  await expect(cardsOf(page)).toHaveText(['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'])
  await expect(page.getByTestId('poker-cards')).toHaveCount(0)
  await page.getByTestId('poker-deck-powers').check({ force: true })
  await expect(cardsOf(page)).toHaveText(['1', '2', '4', '8', '16', '32', '64', '?'])
  await page.getByTestId('poker-deck-modified').check({ force: true })
  await expect(cardsOf(page)).toHaveCount(13)

  // Custom shows the field, which starts as the current deck; a typed list is the deck, and a bad one says why and cannot be created.
  await page.getByTestId('poker-deck-custom').check({ force: true })
  await expect(page.getByTestId('poker-cards')).toBeFocused()
  await expect(page.getByTestId('poker-cards')).toHaveValue('0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕')
  await page.getByTestId('poker-cards').fill('1, 2, 4, 8, ?')
  await expect(page.getByTestId('poker-deck-custom')).toBeChecked()
  await expect(cardsOf(page)).toHaveText(['1', '2', '4', '8', '?'])
  for (const [typed, problem] of [['1', /au moins 2|at least 2/i], ['1, 2, 2', /identiques|the same/i], ['1, 2, 1234567', /6 caract|6 characters/i], [Array.from({ length: 25 }, (_, i) => i).join(','), /24/]] as const) {
    await page.getByTestId('poker-cards').fill(typed)
    await expect(page.getByTestId('poker-deck-problem')).toContainText(problem)
    await expect(page.getByTestId('poker-start-action')).toBeDisabled()
  }
  await page.getByTestId('poker-cards').fill('S, M, L')
  await expect(page.getByTestId('poker-start-action')).toBeEnabled()
  // A preset again hides the field.
  await page.getByTestId('poker-deck-fibonacci').check({ force: true })
  await expect(page.getByTestId('poker-cards')).toHaveCount(0)
  await expect(cardsOf(page)).toHaveCount(13)
  await noViolation(page, 'start')
})

test('the start page: the button is 48 px and fixed at the foot of a phone, 56 px in the flow from 600 px; one press makes the room with the Fibonacci deck', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const phone = await english(browser, { width: 390, height: 844 })
  const page = await phone.newPage()
  await page.goto('/poker')
  const action = page.getByTestId('poker-start-action')
  const box = (await action.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(48)
  // At the foot of the screen, above the safe-area inset, whatever the length of the page.
  expect(box.y + box.height).toBeGreaterThan(844 - 40)
  expect(box.y + box.height).toBeLessThanOrEqual(844)
  // A short phone: the content is longer than the screen, the button still shows and still is the last thing of the viewport.
  await page.setViewportSize({ width: 390, height: 560 })
  await page.getByTestId('poker-colours').locator('summary').click()
  const short = (await action.boundingBox())!
  expect(short.y + short.height).toBeLessThanOrEqual(560)
  expect(short.y + short.height).toBeGreaterThan(560 - 40)
  await page.getByTestId('poker-colours').locator('summary').click()
  // One press: the room opens and asks for a name; the deck is the Fibonacci deck.
  await action.click()
  await expect(page).toHaveURL(/\/poker\/room#c=/)
  await page.getByTestId('poker-name').fill('Ann')
  await page.getByTestId('poker-name-join').click()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(page.getByTestId('poker-hand').locator('.pick')).toHaveCount(13)
  await phone.close()

  const wide = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const desk = await wide.newPage()
  await desk.goto('/poker')
  const flow = (await desk.getByTestId('poker-start-action').boundingBox())!
  expect(flow.height).toBeGreaterThanOrEqual(56)
  // In the flow, in a 36 rem column: its box is not the sticky foot of a phone.
  expect(flow.width).toBeLessThanOrEqual(36 * 16)
  expect(await desk.getByTestId('poker-start-action').evaluate((el) => getComputedStyle(el.parentElement!).position)).toBe('static')
  await wide.close()
})

test('the card colours: a collapsed section with eight hues and the theme, a live card back, and the hue the moderator picked is the card back of everybody', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const errors: string[] = []
  const contexts = await Promise.all([0, 1].map(() => english(browser, { width: 390, height: 844 })))
  const [a, b] = await Promise.all(contexts.map((ctx) => ctx.newPage()))
  for (const p of [a!, b!]) watch(p, errors)
  await a!.goto('/poker')
  const section = a!.getByTestId('poker-colours')
  await expect(section).not.toHaveAttribute('open', '')
  await section.locator('summary').click()
  // The Theme swatch is chosen; eight hues follow; each is a 44 px radio with a name; the preview is the card back of the theme.
  await expect(a!.getByTestId('poker-hue-theme')).toBeChecked()
  const hues = [8, 32, 52, 140, 175, 210, 260, 320]
  for (const h of hues) {
    const swatch = a!.getByTestId(`poker-hue-${h}`)
    await expect(swatch).toHaveAccessibleName(/\S/)
    const box = (await swatch.boundingBox())!
    expect(box.width, String(h)).toBeGreaterThanOrEqual(44)
    expect(box.height, String(h)).toBeGreaterThanOrEqual(44)
  }
  await expect(a!.getByTestId('poker-hue-preview')).toHaveAttribute('data-hue', 'theme')
  const backOf = (p: Page) => p.locator('.pcard.back').first().evaluate((el) => getComputedStyle(el, '::before').backgroundImage)
  const before = await backOf(a!)
  await a!.getByTestId('poker-hue-140').check({ force: true })
  await expect(a!.getByTestId('poker-hue-preview')).toHaveAttribute('data-hue', '140')
  expect(await backOf(a!)).not.toBe(before)
  // The radio group is reachable by keys: the arrow moves the hue.
  await a!.getByTestId('poker-hue-140').focus()
  await a!.keyboard.press('ArrowRight')
  await expect(a!.getByTestId('poker-hue-175')).toBeChecked()
  await a!.keyboard.press('ArrowLeft')
  await expect(a!.getByTestId('poker-hue-140')).toBeChecked()
  await noViolation(a!, 'start-colours')

  await a!.getByTestId('poker-start-action').click()
  await goLive(a!, 'Ann')
  const link = participantLink(a!)
  await b!.goto(link)
  await goLive(b!, 'Bob')
  await a!.getByTestId('poker-card-3').check({ force: true })
  // Both see a voted seat: its card back is green for the moderator and for the guest alike, and unlike the card back of the theme.
  for (const p of [a!, b!]) await expect(p.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(1)
  const green = await backOf(b!)
  expect(green).toBe(await backOf(a!))
  expect(green).not.toBe(before)
  // hsl(140 60% 40%), as the computed style says it.
  expect(green).toContain('rgb(41, 163, 82)')
  // The room of a moderator who picked nothing keeps the colours of the theme.
  const c = await contexts[0]!.newPage()
  await c.goto('/poker')
  await c.getByTestId('poker-start-action').click()
  await goLive(c, 'Cy')
  await c.getByTestId('poker-card-3').check({ force: true })
  await expect(c.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(1)
  expect(await backOf(c)).toBe(before)
  expect(errors).toEqual([])
  await Promise.all(contexts.map((ctx) => ctx.close()))
})

test('the name step has the look of the start page: one prefilled field, one muted line, the button fixed at the foot of a phone; a long name fits and a reload keeps the seat', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const ctx = await english(browser, { width: 390, height: 844 })
  const page = await ctx.newPage()
  // This browser already has a name for boards: the field shows it and one press joins.
  await page.addInitScript(() => { try { localStorage.setItem('retroboard:identity', JSON.stringify({ cid: 'c'.repeat(16), name: 'Malaka', showName: true, named: true })) } catch { /* ignore */ } })
  await page.goto('/poker')
  await page.getByTestId('poker-start-action').click()
  const field = page.getByTestId('poker-name')
  await expect(field).toHaveValue('Malaka')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/call you|appelle/i)
  await expect(page.getByTestId('beta-tag')).toHaveCount(0)
  const join = page.getByTestId('poker-name-join')
  const box = (await join.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(48)
  expect(box.y + box.height).toBeGreaterThan(844 - 40)
  expect(box.y + box.height).toBeLessThanOrEqual(844)
  await noViolation(page, 'name-step')
  // A name of 24 characters fits its field and the page does not scroll sideways.
  await field.fill(longName(7))
  expect(await field.evaluate((el: HTMLInputElement) => el.scrollWidth <= el.clientWidth)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await join.click()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  // A reload keeps the seat and skips the step.
  await page.reload()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(page.getByTestId('poker-name')).toHaveCount(0)
  await expect(page.getByTestId('poker-seat')).toHaveCount(1)
  await ctx.close()
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
  await typeDeck(a!, '1, 2, 4, 8, ?')
  await a!.getByTestId('poker-start-action').click()
  await expect(a!).toHaveURL(/\/poker\/room#c=/)
  await a!.getByTestId('poker-name').fill('Ann')
  await a!.getByTestId('poker-name-join').click()
  await expect(a!.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(a!.getByTestId('poker-hand').locator('.pick')).toHaveCount(5)
  await expect(a!.getByTestId('poker-round')).toHaveText(/1/)

  // The link to share is the participant link: it never carries the moderator secret (the room page does not print it: the invite sheet
  // holds it, and a test below presses Copy to read it from the clipboard).
  const link = participantLink(a!)
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
    await expect(page.getByTestId('poker-seat-state')).toHaveText([/voted|a voté/, /voted|a voté/, /voted|a voté/])
    await expect(page.getByTestId('poker-results')).toHaveCount(0)
  }
  await expect(b!.getByTestId('poker-reveal')).toHaveCount(0)

  // The moderator reveals: every card flips on every tab and the results line appears.
  await expect(a!.getByTestId('poker-reveal')).toBeEnabled()
  await a!.getByTestId('poker-reveal').click()
  for (const page of [a!, b!, c!]) {
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(3)
    // The value is on the card, once: the words of the seat say it to a screen reader, no caption repeats it.
    await expect(page.getByTestId('poker-seat-state')).toHaveText([/(Card|Carte) 2$/, /(Card|Carte) 8$/, /(Card|Carte) 4$/])
    await expect(page.locator('[data-testid="poker-seat"] .pcard[data-variant="face"] .value')).toHaveText(['2', '8', '4'])
    await expect(page.getByTestId('poker-average')).toHaveText('4.67')
    await expect(page.getByTestId('poker-median')).toHaveText('4')
    // Three different cards: a third on the most chosen, so no agreement yet; one card each in the distribution, in deck order.
    await expect(page.getByTestId('poker-meter')).toHaveAttribute('aria-valuenow', '33')
    await expect(page.getByTestId('poker-meter')).toContainText(/No agreement yet|Pas encore d’accord/)
    expect(await columns(page)).toEqual([['2', '1'], ['4', '1'], ['8', '1']])
    // The moderator can keep the suggestion, a voter reads it.
    if (page === a) await expect(page.getByTestId('poker-use')).toHaveText(/(Use|Utiliser) 4/)
    else await expect(page.getByTestId('poker-suggestion')).toHaveText(/(Suggested|Suggestion) ?: 4/)
    // The hand leaves at the reveal (it does not fade): the dock offers a voter one line and no control.
    await expect(page.getByTestId('poker-hand')).toHaveCount(0)
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
    await expect(page.getByTestId('poker-hand')).toBeVisible()
  }
  // Reveal appears with the first card; it is not a disabled button waiting for one.
  await expect(a!.getByTestId('poker-reveal')).toHaveCount(0)
  await a!.getByTestId('poker-card-1').check({ force: true })
  await b!.getByTestId('poker-card-1').check({ force: true })
  await a!.getByTestId('poker-reveal').click()
  await expect(a!.getByTestId('poker-meter')).toHaveAttribute('aria-valuenow', '100')
  await expect(a!.getByTestId('poker-meter')).toContainText(/Everyone agrees|Tout le monde est d’accord/)
  // Cy did not vote: two cards, the other seat stays empty.
  await expect(a!.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(2)

  // Next round: blank again.
  await a!.getByTestId('poker-next').click()
  for (const page of [a!, b!, c!]) await expect(page.getByTestId('poker-round')).toHaveText(/3/)

  if (phone) {
    // Phone: a thumb-sized hand and nothing that scrolls sideways.
    const card = (await b!.getByTestId('poker-card-0').locator('xpath=following-sibling::span').boundingBox())!
    expect(card.height).toBeGreaterThanOrEqual(44)
    expect(card.width).toBeGreaterThanOrEqual(44)
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

  // The language is in the profile dialog behind the avatar, as on every page of the application.
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('pref-lang-en').click()
  await expect(page.getByTestId('poker-start-action')).toHaveText(/Create the room/)
  await page.getByTestId('pref-lang-fr').click()
  await expect(page.getByTestId('poker-start-action')).toHaveText(/Créer la salle/)
  await page.keyboard.press('Escape')
  await page.getByTestId('app-home').click()
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
  // Alone in the room: the one hint says to share the link, and the QR code is one tap away, in the invite sheet.
  await expect(page.getByTestId('poker-hint')).toHaveText(/share the link|Partagez le lien/i)
  await expect(page.getByTestId('qr')).toHaveCount(0)
  await page.getByTestId('poker-invite').click()
  await expect(page.getByTestId('qr')).toBeVisible()
  // The room alone and the invite sheet pass axe in light and dark.
  await noViolation(page, 'invite-sheet')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('qr')).toHaveCount(0)
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
  const link = participantLink(a!)

  // Bob pastes the room link in the join field of the landing page: the poker room opens, not a board.
  await b!.goto('/')
  await b!.getByTestId('join-input').fill(link)
  await b!.getByTestId('join-go').click()
  await expect(b!).toHaveURL(/\/poker\/room#c=/)
  await b!.getByTestId('poker-name').fill('Bob')
  await b!.getByTestId('poker-name-join').click()
  await expect(b!.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  // A voter who has not chosen has the hand for a hint, and nobody is told to share the link any more.
  await expect(b!.getByTestId('poker-hand')).toBeVisible()
  await expect(b!.getByTestId('poker-hint')).toHaveCount(0)
  await b!.getByTestId('poker-card-2').check({ force: true })
  await a!.getByTestId('poker-reveal').click()
  // After the reveal a voter's dock is one hint line and no control.
  await expect(b!.getByTestId('poker-hint')).toContainText(/suivant|next/i)
  await expect(b!.getByTestId('poker-dock').locator('button')).toHaveCount(0)

  // The same link opened as a board (an old bookmark, a pasted /boards address) is handed to the room page.
  const hash = link.slice(link.indexOf('#'))
  await b!.goto(`/boards${hash}`)
  await expect(b!).toHaveURL(/\/poker\/room#c=/)
  await expect(b!.getByTestId('poker-room')).toBeVisible()
  await Promise.all(contexts.map((ctx) => ctx.close()))
})

/**
 * Change poker-design-v2, group 1: the card and the hand. A phone in the browsers that emulate one (a touch screen, a coarse pointer: no
 * keyboard hint), at the two sizes the change designs for, 390x664 (a phone browser shows about 670 px of page) and 360x640.
 */
const PHONES = [{ width: 390, height: 664 }, { width: 360, height: 640 }] as const
const phone = (browser: Browser, viewport: { width: number; height: number }) => browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' })
const soloRoom = async (page: Page, cards?: string) => {
  await page.goto('/poker')
  if (cards) await typeDeck(page, cards)
  await page.getByTestId('poker-start-action').click()
  await page.getByTestId('poker-name').fill('Ann')
  await page.getByTestId('poker-name-join').click()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
}
type Box = { x: number; y: number; width: number; height: number }
const boxes = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }))
const cardArt = '[data-testid="poker-hand"] .pick .pcard'

for (const viewport of PHONES) {
  test(`the hand of a 13-card deck fills the thumb zone of a ${viewport.width}x${viewport.height} phone, in two centred rows, and keeps its place`, async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
    const ctx = await phone(browser, viewport)
    const page = await ctx.newPage()
    const errors: string[] = []
    watch(page, errors)
    await soloRoom(page)

    const cards = await boxes(page, cardArt)
    expect(cards).toHaveLength(13)
    // Every card is visible at once, at least 44x44, and the 5:7 ratio holds.
    for (const c of cards) {
      expect(c.width).toBeGreaterThanOrEqual(44 - 0.5)
      expect(c.height).toBeGreaterThanOrEqual(44)
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.x + c.width).toBeLessThanOrEqual(viewport.width)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.y + c.height).toBeLessThanOrEqual(viewport.height)
      expect(Math.abs(c.width / c.height - 5 / 7)).toBeLessThan(0.02)
    }
    // Two rows of 7 and 6, 6 px or more apart, the short one centred.
    const rows = [...new Set(cards.map((c) => Math.round(c.y)))]
    expect(rows).toHaveLength(2)
    const first = cards.filter((c) => Math.round(c.y) === rows[0])
    const second = cards.filter((c) => Math.round(c.y) === rows[1])
    expect([first.length, second.length]).toEqual([7, 6])
    for (const row of [first, second]) for (let i = 1; i < row.length; i++) expect(row[i]!.x - (row[i - 1]!.x + row[i - 1]!.width)).toBeGreaterThanOrEqual(6 - 0.5)
    const left = second[0]!.x
    const right = viewport.width - (second.at(-1)!.x + second.at(-1)!.width)
    expect(Math.abs(left - right)).toBeLessThan(1)
    expect(second[0]!.y - (first[0]!.y + first[0]!.height)).toBeGreaterThanOrEqual(6)

    // The dock is the foot of the screen and nothing is under it: the page does not scroll, the region stops where the dock starts.
    const dock = (await page.getByTestId('poker-dock').boundingBox())!
    const region = (await page.getByTestId('poker-region').boundingBox())!
    expect(dock.y + dock.height).toBeCloseTo(viewport.height, 0)
    expect(region.y + region.height).toBeLessThanOrEqual(dock.y + 0.5)
    expect(await page.evaluate(() => [document.documentElement.scrollHeight <= innerHeight, document.documentElement.scrollWidth <= innerWidth])).toEqual([true, true])
    // The keyboard hint is for a device with a fine pointer: this one has none.
    await expect(page.locator('.hint.keys')).toBeHidden()

    // Same place in every state: not voted, voted, a new round.
    const place = async (): Promise<Box> => (await page.getByTestId('poker-hand').boundingBox())!
    const before = await place()
    await page.locator('.pick').nth(5).tap()
    await expect(page.getByTestId('poker-card-5')).toBeChecked()
    expect(await place()).toEqual(before)
    await page.getByTestId('poker-reveal').click()
    await expect(page.getByTestId('poker-hand')).toHaveCount(0)
    await expect(page.getByTestId('poker-dock').locator('button')).toHaveText([/Vote again/, /Next round/])
    await page.getByTestId('poker-next').click()
    await expect(page.getByTestId('poker-hand')).toBeVisible()
    await expect(page.locator('.pcard.chosen')).toHaveCount(0)
    // The hand rises back in 150 ms (change poker-design-v2, 3.4): its box is where it was once the rise is over.
    await page.waitForFunction(() => document.getAnimations().length === 0)
    expect(await place()).toEqual(before)
    expect(errors).toEqual([])
    await ctx.close()
  })
}

test('the chosen card is a shape, keeps the contrast of its face and is never dimmed; a card is a card and a back has no text', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const ctx = await phone(browser, PHONES[0])
  const page = await ctx.newPage()
  await soloRoom(page)
  await page.locator('.pick').nth(5).tap()
  const chosen = page.locator('.pcard.chosen')
  await expect(chosen).toHaveCount(1)
  // The lift is a 150 ms transition: read the card where it lands.
  await expect.poll(() => chosen.evaluate((el) => getComputedStyle(el).transform)).toBe('matrix(1, 0, 0, 1, 0, -10)')
  const read = await chosen.evaluate((el) => {
    const css = getComputedStyle(el)
    const parse = (c: string) => c.match(/[\d.]+/g)!.slice(0, 3).map(Number) as [number, number, number]
    const lin = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
    const lum = (c: [number, number, number]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
    const fg = parse(getComputedStyle(el.querySelector('.value')!).color)
    const bg = parse(css.backgroundColor)
    const ratio = (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05)
    let opacity = 1
    for (let n: Element | null = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity)
    const check = el.querySelector('.check')!.getBoundingClientRect()
    return { transform: css.transform, ring: css.boxShadow, opacity, ratio, badge: check.width > 0 && check.height > 0, text: el.textContent }
  })
  // Lifted by 10 px, ringed, checked: three cues, none of them a colour; the face keeps 4.5:1 and nothing fades.
  expect(read.transform).toBe('matrix(1, 0, 0, 1, 0, -10)')
  expect(read.ring).not.toBe('none')
  expect(read.badge).toBe(true)
  expect(read.opacity).toBe(1)
  expect(read.ratio).toBeGreaterThanOrEqual(4.5)
  // The face: the value large in the middle and twice small in the corners, the second turned 180 degrees; the radius is not a pill.
  expect(read.text).toBe('888')
  const face = await chosen.evaluate((el) => ({ corner: getComputedStyle(el.querySelector('.br')!).transform, radius: parseFloat(getComputedStyle(el).borderTopLeftRadius), width: el.getBoundingClientRect().width, big: parseFloat(getComputedStyle(el.querySelector('.value')!).fontSize), small: parseFloat(getComputedStyle(el.querySelector('.tl')!).fontSize) }))
  expect(face.corner).toBe('matrix(-1, 0, 0, -1, 0, 0)')
  expect(face.radius).toBeLessThan(face.width / 3)
  expect(face.big).toBeGreaterThan(face.small * 1.5)
  // Picking is a lift of 150 ms or less, and none at all under reduced motion (the WebKit project always prefers it).
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  expect(await chosen.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0.15s')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // The application's own reduced-motion rule leaves a one-microsecond transition: the card does not travel.
  expect(await chosen.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThanOrEqual(0.001)
  // A voted seat shows the back of a card: a pattern and no text; an empty seat would show the dashed slot.
  const back = page.locator('[data-testid="poker-seat"] .pcard[data-variant="back"]')
  await expect(back).toHaveCount(1)
  expect(await back.evaluate((el) => [el.textContent, getComputedStyle(el, '::before').backgroundImage.includes('repeating-linear-gradient')])).toEqual(['', true])
  await noViolation(page, 'room-chosen')
  await ctx.close()
})

test('under forced colours the edges of the cards and the chosen card stay visible', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'forced colours emulation: Chromium')
  const ctx = await phone(browser, PHONES[0])
  const page = await ctx.newPage()
  await page.emulateMedia({ forcedColors: 'active' })
  await soloRoom(page)
  await page.locator('.pick').nth(2).tap()
  const edge = (selector: string) => page.locator(selector).first().evaluate((el) => { const css = getComputedStyle(el); return [css.borderTopStyle, css.borderTopWidth, css.borderTopColor, css.outlineStyle, css.outlineWidth] })
  expect((await edge('.pick .pcard:not(.chosen)'))[0]).toBe('solid')
  expect((await edge('.pick .pcard:not(.chosen)'))[1]).toBe('2px')
  const chosen = await edge('.pcard.chosen')
  expect(chosen[3]).toBe('solid')
  expect(chosen[4]).toBe('3px')
  // The edge of the empty slot would be invisible if it fell back to a transparent colour.
  expect((await edge('.pick .pcard'))[2]).not.toBe('rgba(0, 0, 0, 0)')
  await ctx.close()
})

test('a deck of 20 cards is one row that snaps sideways; every card is reachable by touch, by the arrow keys and by typing its name', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const ctx = await phone(browser, PHONES[0])
  const page = await ctx.newPage()
  const errors: string[] = []
  watch(page, errors)
  await soloRoom(page, Array.from({ length: 20 }, (_, i) => i + 1).join(', '))
  await expect(page.locator('.pick')).toHaveCount(20)
  const hand = page.getByTestId('poker-hand')
  expect(await hand.evaluate((el) => { const css = getComputedStyle(el); return [css.flexWrap, css.scrollSnapType.startsWith('x'), el.scrollWidth > el.clientWidth] })).toEqual(['nowrap', true, true])
  // One row, no card under 44x44 and nothing that makes the page scroll sideways.
  const cards = await boxes(page, cardArt)
  expect(new Set(cards.map((c) => Math.round(c.y))).size).toBe(1)
  for (const c of cards) { expect(c.width).toBeGreaterThanOrEqual(44 - 0.5); expect(c.height).toBeGreaterThanOrEqual(44) }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  // By touch: the last card is brought into reach by scrolling the row and tapped.
  await page.locator('.pick').nth(19).scrollIntoViewIfNeeded()
  await page.locator('.pick').nth(19).tap()
  await expect(page.getByTestId('poker-card-19')).toBeChecked()
  // The chosen card is brought to the middle of the row (the last cards cannot be: the row ends there).
  await page.locator('.pick').nth(12).tap()
  await expect(page.getByTestId('poker-card-12')).toBeChecked()
  await expect.poll(async () => { const h = (await hand.boundingBox())!; const c = (await page.locator('.pcard.chosen').boundingBox())!; return Math.abs(c.x + c.width / 2 - (h.x + h.width / 2)) }).toBeLessThan(60)
  // By the keys: arrows move and choose, typing "1" then "7" is the card 17 and brings it into view.
  await page.getByTestId('poker-card-19').focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('poker-card-18')).toBeChecked()
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('1'); await page.keyboard.press('7')
  await expect(page.getByTestId('poker-card-16')).toBeChecked()
  await expect.poll(async () => { const h = (await hand.boundingBox())!; const c = (await page.locator('.pcard.chosen').boundingBox())!; return c.x >= h.x - 1 && c.x + c.width <= h.x + h.width + 1 }).toBe(true)
  expect(errors).toEqual([])
  await ctx.close()
})

test('the hand is played with the keyboard alone: the arrow keys move and choose, the focus ring shows, the hint names the keys', async ({ page, browserName }) => {
  test.skip(!!test.info().project.use.isMobile, 'a desktop keyboard')
  await soloRoom(page)
  await expect(page.locator('.hint.keys')).toBeVisible()
  await page.getByTestId('poker-card-0').focus()
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('poker-card-2')).toBeChecked()
  await expect(page.getByTestId('poker-card-2')).toBeFocused()
  // The ring is drawn around the card, outside the ring of the choice (WebKit does not call a script's focus() a keyboard focus).
  if (browserName === 'chromium') expect(await page.locator('.pcard.chosen').evaluate((el) => { const css = getComputedStyle(el); return [css.outlineStyle, css.outlineWidth] })).toEqual(['solid', '2px'])
})

/**
 * Change poker-design-v2, group 2: the phone room in one viewport (the bar, the invite sheet, the seats). English, so that the words of the
 * design can be compared as written; the rooms are built with real tabs on the real relay.
 */
const english = (browser: Browser, viewport: { width: number; height: number } = PHONES[0], locale = 'en-US') => browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale })
/** What assistive technology says of an element: its text without what is hidden from it. */
const said = (el: Locator) => el.evaluate((node) => { const copy = node.cloneNode(true) as HTMLElement; copy.querySelectorAll('[aria-hidden="true"]').forEach((e) => e.remove()); return copy.textContent!.replace(/\s+/g, ' ').trim() })
/** A name of 24 characters, the longest the field takes. */
const longName = (i: number) => `Maximilienne-Alexandra ${String(i).padStart(2, '0')}`.slice(0, 24)
const goLive = async (page: Page, name: string) => {
  await page.getByTestId('poker-name').fill(name)
  await page.getByTestId('poker-name-join').click()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
}
/** The moderator creates a room on a phone; the others join by the participant link, each in a context of their own. */
async function room(browser: Browser, names: readonly string[], cards?: string, locale = 'en-US', screen?: { width: number; height: number }) {
  const contexts: BrowserContext[] = []
  // A screen of a tablet or wider is a desktop-style context (no touch emulation); the default is a phone.
  const mod = screen ? await browser.newContext({ viewport: screen, locale }) : await english(browser, PHONES[0], locale)
  contexts.push(mod)
  const page = await mod.newPage()
  await page.goto('/poker')
  if (cards) await typeDeck(page, cards)
  await page.getByTestId('poker-start-action').click()
  await goLive(page, names[0]!)
  const others: Page[] = []
  for (const name of names.slice(1)) {
    const ctx = await english(browser, { width: 390, height: 664 }, locale)
    contexts.push(ctx)
    const p = await ctx.newPage()
    await p.goto(participantLink(page))
    await goLive(p, name)
    others.push(p)
  }
  await expect(page.getByTestId('poker-seat')).toHaveCount(names.length)
  /** Another person sits down: the room grows by one tab. */
  const join = async (name: string, viewport?: { width: number; height: number }) => {
    const ctx = viewport ? await browser.newContext({ viewport, locale }) : await english(browser, { width: 390, height: 664 }, locale)
    contexts.push(ctx)
    const p = await ctx.newPage()
    await p.goto(participantLink(page))
    await goLive(p, name)
    others.push(p)
    return p
  }
  return { page, others, join, close: () => Promise.all(contexts.map((c) => c.close())) }
}
const fits = async (page: Page, where: string) => {
  const m = await page.evaluate(() => {
    const box = (sel: string) => { const r = document.querySelector(sel)!.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right } }
    const region = document.querySelector('[data-testid="poker-region"]') as HTMLElement
    return {
      page: [document.documentElement.scrollHeight, innerHeight, document.documentElement.scrollWidth, innerWidth],
      region: [region.scrollHeight, region.clientHeight], bar: box('[data-testid="poker-bar"]'), dock: box('[data-testid="poker-dock"]'),
      seats: [...document.querySelectorAll('[data-testid="poker-seat"]')].map((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right } }),
    }
  })
  const h = m.page[1]!, w = m.page[3]!
  expect(m.page[0], `${where}: the page does not scroll`).toBeLessThanOrEqual(h)
  expect(m.page[2], `${where}: nothing makes the page scroll sideways`).toBeLessThanOrEqual(w)
  expect(m.region[0], `${where}: the middle region does not scroll (${m.region.join(' in ')})`).toBeLessThanOrEqual(m.region[1]!)
  expect(m.bar.top, `${where}: the bar`).toBeGreaterThanOrEqual(0)
  expect(m.dock.bottom, `${where}: the dock`).toBeLessThanOrEqual(h + 0.5)
  for (const seat of m.seats) {
    expect(seat.top).toBeGreaterThanOrEqual(m.bar.bottom - 0.5)
    expect(seat.bottom).toBeLessThanOrEqual(m.dock.top + 0.5)
    expect(seat.left).toBeGreaterThanOrEqual(0)
    expect(seat.right).toBeLessThanOrEqual(w)
  }
}

for (const viewport of PHONES) {
  test(`eight voters with 24-character names fit a ${viewport.width}x${viewport.height} phone, lobby, voting and waiting, with no scrolling`, async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
    test.setTimeout(120_000)
    const names = [longName(0), ...Array.from({ length: 7 }, (_, i) => longName(i + 1))]
    const { page, others, close } = await room(browser, names)
    await page.setViewportSize(viewport)
    // Lobby: eight seats, nobody has chosen.
    await fits(page, 'lobby')
    // One seat is one line of name with an ellipsis: all the seats are as tall as each other.
    const heights = await page.locator('[data-testid="poker-seat"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(new Set(heights).size).toBe(1)
    // Voting: the moderator and two others have chosen; waiting: the moderator has chosen and five are missing.
    await page.getByTestId('poker-card-5').check({ force: true })
    await others[0]!.getByTestId('poker-card-4').check({ force: true })
    await others[1]!.getByTestId('poker-card-4').check({ force: true })
    await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(3)
    await expect(page.getByTestId('poker-status')).toHaveText('3 of 8 voted')
    await expect(page.getByTestId('poker-hint')).toHaveText(`Waiting for ${names[3]}, ${names[4]} and 3 others.`)
    await fits(page, 'waiting')
    // Everyone has voted: still one viewport, and the hint is gone for the moderator (Reveal is the filled button).
    for (const [i, p] of others.entries()) if (i >= 2) await p.getByTestId('poker-card-4').check({ force: true })
    await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(8)
    await expect(page.getByTestId('poker-hint')).toHaveCount(0)
    await fits(page, 'everyone voted')
    // Revealed: still one viewport, with the results card (numbers, meter, distribution, outliers, Use) and the two buttons of the dock.
    await page.getByTestId('poker-reveal').click()
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(8)
    await expect(page.getByTestId('poker-results')).toBeVisible()
    await fits(page, 'revealed')
    const after = await page.evaluate(() => [document.documentElement.scrollHeight <= innerHeight, document.documentElement.scrollWidth <= innerWidth])
    expect(after).toEqual([true, true])
    const dock = (await page.getByTestId('poker-dock').boundingBox())!
    for (const id of ['poker-revote', 'poker-next']) {
      const b = (await page.getByTestId(id).boundingBox())!
      expect(b.y + b.height).toBeLessThanOrEqual(viewport.height)
      expect(b.height).toBeGreaterThanOrEqual(48)
      expect(b.y).toBeGreaterThanOrEqual(dock.y - 0.5)
    }
    await close()
  })
}

test('the same room in French on a 360x640 phone: lobby, voting and waiting fit, and the words are French', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  test.setTimeout(120_000)
  const names = [longName(0), ...Array.from({ length: 7 }, (_, i) => longName(i + 1))]
  const { page, others, close } = await room(browser, names, undefined, 'fr-FR')
  await page.setViewportSize(PHONES[1])
  await expect(page.getByTestId('poker-round')).toHaveText('Tour 1')
  await fits(page, 'lobby, fr')
  await page.getByTestId('poker-card-5').check({ force: true })
  await others[0]!.getByTestId('poker-card-4').check({ force: true })
  await expect(page.getByTestId('poker-status')).toHaveText('2 sur 8 ont voté')
  await expect(page.getByTestId('poker-hint')).toHaveText(`En attente de ${names[2]}, ${names[3]} et 4 autres.`)
  await fits(page, 'waiting, fr')
  for (const [i, p] of others.entries()) if (i >= 1) await p.getByTestId('poker-card-4').check({ force: true })
  await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(8)
  await fits(page, 'everyone voted, fr')
  await page.getByTestId('poker-reveal').click()
  await expect(page.getByTestId('poker-status')).toHaveText('Révélé')
  await expect(page.getByTestId('poker-results')).toBeVisible()
  await fits(page, 'revealed, fr')
  await close()
})

test('twenty voters: only the middle region scrolls, the bar and the dock stay where they are', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'twenty tabs: Chromium')
  test.setTimeout(180_000)
  const { page, close } = await room(browser, ['Moderator', ...Array.from({ length: 19 }, (_, i) => `Voter ${i + 1}`)])
  const before = await page.evaluate(() => ({ bar: document.querySelector('[data-testid="poker-bar"]')!.getBoundingClientRect().top, dock: document.querySelector('[data-testid="poker-dock"]')!.getBoundingClientRect().top }))
  const scrolls = await page.evaluate(() => {
    const region = document.querySelector('[data-testid="poker-region"]') as HTMLElement
    const tall = region.scrollHeight > region.clientHeight
    region.scrollTop = region.scrollHeight
    return { tall, moved: region.scrollTop > 0, page: document.documentElement.scrollHeight <= innerHeight, bar: document.querySelector('[data-testid="poker-bar"]')!.getBoundingClientRect().top, dock: document.querySelector('[data-testid="poker-dock"]')!.getBoundingClientRect().top }
  })
  expect(scrolls).toEqual({ tall: true, moved: true, page: true, bar: before.bar, dock: before.dock })
  await close()
})

test('the bar of a phone: the mark, the round with one status line, Invite, light or dark and the profile; Reveal is 48 px', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const ctx = await english(browser)
  const page = await ctx.newPage()
  const errors: string[] = []
  watch(page, errors)
  await soloRoom(page)
  await expect(page.getByTestId('poker-round')).toHaveText('Round 1')
  await expect(page.getByTestId('poker-status')).toHaveText('Waiting for your team')
  // No "Connected", no visible heading for the table, no printed link, no language pair on the page.
  await expect(page.getByTestId('poker-room')).not.toContainText(/Connected|Connecté/)
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
  await expect(page.locator('input[readonly], [data-testid="pref-lang-en"]:visible, [data-testid="poker-qr-toggle"]')).toHaveCount(0)
  expect((await page.getByTestId('poker-bar').boundingBox())!.height).toBeGreaterThanOrEqual(56)
  // The bar is the application's bar: the mark that leads home, Invite first of the tools, light or dark and the profile. The tools are 44 px;
  // the mark and the avatar are the sizes they have on a board (a phone: 34 and 38 px, over the 24 px of WCAG 2.5.8).
  for (const [id, least] of [['app-home', 34], ['poker-invite', 44], ['btn-variant', 44], ['btn-profile', 38]] as const) {
    const b = (await page.getByTestId(id).boundingBox())!
    expect(b.width, id).toBeGreaterThanOrEqual(least)
    expect(b.height, id).toBeGreaterThanOrEqual(least)
  }
  expect(await page.getByTestId('poker-bar').locator('nav.tools > *').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).toEqual(['poker-invite', 'btn-variant', 'btn-profile'])
  // The label of Invite is for a tablet and up: on a phone its name comes from the aria-label.
  await expect(page.getByTestId('poker-invite')).toHaveAccessibleName('Invite')
  expect((await page.getByTestId('poker-invite').locator('.label').boundingBox())!.width).toBeLessThanOrEqual(1)
  // The primary of a phone is 48 px: Invite while alone, Reveal with the first card.
  expect((await page.getByTestId('poker-invite-cta').boundingBox())!.height).toBeGreaterThanOrEqual(48)
  await page.locator('.pick').nth(5).tap()
  expect((await page.getByTestId('poker-reveal').boundingBox())!.height).toBeGreaterThanOrEqual(48)
  await expect(page.getByTestId('poker-invite-cta')).toHaveCount(0)
  // At most one filled button in the room.
  expect(await page.locator('.btn-primary').count()).toBe(1)
  await noViolation(page, 'room-bar')
  expect(errors).toEqual([])
  await ctx.close()
})

test('the poker pages have the bar of the application: the profile dialog holds the name, the language, the theme and the help; light or dark persists', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const ctx = await english(browser)
  const page = await ctx.newPage()
  await page.addInitScript(() => { try { localStorage.setItem('retroboard:identity', JSON.stringify({ cid: 'c'.repeat(16), name: 'Malaka', showName: true, named: true })) } catch { /* ignore */ } })
  await soloRoom(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ uiMode: 'advanced', variant: 'light' })) } catch { /* ignore */ } })
  await page.reload()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'light')
  // The avatar is the profile of this browser, and the dialog behind it is the one of every page: name, language, theme, settings, the guide of the page and the ways to give feedback.
  await expect(page.getByTestId('btn-profile')).toHaveText('M')
  await page.getByTestId('btn-profile').click()
  await expect(page.getByTestId('profile-name')).toHaveValue('Malaka')
  await expect(page.getByTestId('pref-lang-en')).toBeVisible()
  await expect(page.getByTestId('guide-link-poker')).toHaveAttribute('href', /\/guide\/en\/poker\.html$/)
  await expect(page.getByTestId('feedback-idea')).toBeVisible()
  await noViolation(page, 'profile')
  await page.getByTestId('pref-lang-fr').click()
  await expect(page.getByTestId('poker-round')).toHaveText('Tour 1')
  await page.keyboard.press('Escape')
  // Light or dark is one press and is kept on this device.
  await page.getByTestId('btn-variant').click()
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'dark')
  await page.reload()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'dark')
  await page.getByTestId('app-home').click()
  await expect(page).toHaveURL(/\/$/)
  await ctx.close()
})

test('the name typed on the name step is the name of this browser: the avatar and the profile follow it', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const ctx = await english(browser)
  const page = await ctx.newPage()
  await page.goto('/poker')
  await expect(page.getByTestId('btn-profile')).toHaveText('?')
  await page.getByTestId('poker-start-action').click()
  await page.getByTestId('poker-name').fill('Zoe')
  await page.getByTestId('poker-name-join').click()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(page.getByTestId('btn-profile')).toHaveText('Z')
  await page.getByTestId('btn-profile').click()
  await expect(page.getByTestId('profile-name')).toHaveValue('Zoe')
  await ctx.close()
})

test('the invite sheet: the QR code of the participant link, Copy without showing it, and the room never prints it', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const ctx = await english(browser)
  const page = await ctx.newPage()
  if (browserName === 'chromium') await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  await soloRoom(page)
  const link = participantLink(page)
  const key = link.split('#c=')[1]!
  const secret = page.url().split('#c=')[1]!.slice(44)
  // Closed: no element, no value and no attribute of the page holds any part of the link or of the key.
  const printed = () => page.evaluate((part) => document.documentElement.outerHTML.includes(part) || [...document.querySelectorAll('input, textarea')].some((e) => (e as HTMLInputElement).value.includes(part)), key.slice(0, 22))
  expect(await printed()).toBe(false)

  // Three controls open the same sheet, and Escape gives the focus back to the one that did.
  for (const opener of ['poker-invite', 'poker-ghost', 'poker-invite-cta']) {
    await page.getByTestId(opener).click()
    await expect(page.getByTestId('qr')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Invite')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('qr')).toHaveCount(0)
    await expect(page.getByTestId(opener)).toBeFocused()
  }

  await page.getByTestId('poker-invite').click()
  // The QR code reads back as the participant link, like a phone camera would read it.
  const qr = page.getByTestId('qr')
  await expect(qr).toBeVisible()
  const png = PNG.sync.read(await qr.screenshot({ animations: 'disabled' }))
  expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(link)
  // The filled button copies without showing the address: the link is neither in the sheet's text nor in a field.
  await expect(page.getByTestId('poker-copy')).toHaveClass(/btn-primary/)
  await page.getByTestId('poker-copy').click()
  await expect(page.getByTestId('poker-copy')).toContainText('Link copied')
  expect(await printed()).toBe(false)
  if (browserName === 'chromium') {
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(link)
    expect(copied).not.toContain(secret)
  }
  // "Share" shows only where the browser has a share sheet (a phone): a desktop browser without one does not.
  expect(await page.getByTestId('poker-share').count()).toBe(await page.evaluate(() => (typeof navigator.share === 'function' ? 1 : 0)))
  await noViolation(page, 'invite')
  await ctx.close()
})

test('what the room says: one status line and at most one hint, by state and role', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const { page: ann, others: [bob], close } = await room(browser, ['Ann', 'Bob'])
  const hint = (p: Page) => p.getByTestId('poker-hint')
  // Two seated, nobody has chosen: the count, no hint; the hand is the hint of a person who has not chosen.
  await expect(ann.getByTestId('poker-status')).toHaveText('0 of 2 voted')
  await expect(hint(ann)).toHaveCount(0)
  await expect(hint(bob!)).toHaveCount(0)
  // The moderator has chosen, Bob has not: she waits for Bob.
  await ann.getByTestId('poker-card-5').check({ force: true })
  await expect(ann.getByTestId('poker-status')).toHaveText('1 of 2 voted')
  await expect(hint(ann)).toHaveText('Waiting for Bob.')
  await expect(hint(bob!)).toHaveCount(0)
  // Everyone has voted: the voter waits for the moderator, the moderator has Reveal and no hint.
  await bob!.getByTestId('poker-card-4').check({ force: true })
  await expect(hint(bob!)).toHaveText('Everyone has voted. Waiting for Ann.')
  await expect(hint(ann)).toHaveCount(0)
  await expect(ann.getByTestId('poker-reveal')).toBeVisible()
  await expect(bob!.getByTestId('poker-reveal')).toHaveCount(0)
  // Revealed: the status says so, a voter is told who starts the next round, the moderator has the two buttons and a voter none.
  await ann.getByTestId('poker-reveal').click()
  for (const p of [ann, bob!]) await expect(p.getByTestId('poker-status')).toHaveText('Revealed')
  await expect(hint(bob!)).toHaveText('Ann starts the next round.')
  await expect(hint(ann)).toHaveCount(0)
  await expect(ann.getByTestId('poker-dock').locator('button')).toHaveText([/Vote again/, /Next round/])
  await expect(bob!.getByTestId('poker-dock').locator('button')).toHaveCount(0)
  await expect(bob!.getByTestId('poker-hand')).toHaveCount(0)
  // The words of every seat are said once, in reading order, and no card value is in the page before the reveal.
  await ann.getByTestId('poker-next').click()
  for (const p of [ann, bob!]) await expect(p.getByTestId('poker-round')).toHaveText('Round 2')
  await ann.getByTestId('poker-card-5').check({ force: true })
  await expect(bob!.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(1)
  expect(await said(bob!.getByTestId('poker-seat').first())).toBe('Ann, Moderator, voted')
  expect(await said(bob!.getByTestId('poker-seat').nth(1))).toBe('Bob, you, waiting')
  await expect(bob!.locator('[data-testid="poker-seat"] .pcard[data-variant="face"]')).toHaveCount(0)
  await expect(bob!.locator('[data-testid="poker-seats"] .value')).toHaveCount(0)
  await close()
})

test('a seat: avatar with a ring for you, a crown for the moderator, a back with a check or a slot with a clock, a long name on one line', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const { page, close } = await room(browser, [longName(0), 'Ann'])
  await page.locator('.pick').nth(5).tap()
  const mine = page.getByTestId('poker-seat').first()
  const other = page.getByTestId('poker-seat').nth(1)
  await expect(mine.locator('.crown')).toHaveCount(1)
  await expect(other.locator('.crown')).toHaveCount(0)
  expect(await mine.locator('.av').evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none')
  expect(await other.locator('.av').evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none')
  await expect(mine.locator('.pcard[data-variant="back"]')).toHaveCount(1)
  await expect(mine.locator('.tick')).toBeVisible()
  await expect(other.locator('.pcard[data-variant="slot"]')).toHaveCount(1)
  await expect(other.locator('.tick')).toHaveCount(0)
  // A long name is one line with an ellipsis; its seat is as tall as the other's and the full name is its tooltip and its words.
  const name = mine.locator('.name')
  expect(await name.evaluate((el) => [getComputedStyle(el).textOverflow, getComputedStyle(el).whiteSpace, el.scrollWidth > el.clientWidth])).toEqual(['ellipsis', 'nowrap', true])
  expect(await mine.getAttribute('title')).toBe(longName(0))
  expect(await mine.evaluate((el) => el.getBoundingClientRect().height)).toBeCloseTo(await other.evaluate((el) => el.getBoundingClientRect().height), 0)
  await noViolation(page, 'seats')
  await close()
})

/**
 * Change poker-design-v2, group 3: reveal and results. The flip, the results card (two numbers, the consensus meter with its words, the
 * distribution, the outliers), "Use 5", the one filled button and the announcements, on rooms of real tabs and the real relay.
 */
const FIB = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕']
/** Plays a card of the default deck by its face. */
const pick = (page: Page, card: string) => page.getByTestId(`poker-card-${FIB.indexOf(card)}`).check({ force: true })
/** Everybody plays (the moderator first), and the moderator reveals once every seat shows its card back. */
const playRound = async (mod: Page, others: readonly Page[], cards: readonly string[]) => {
  await pick(mod, cards[0]!)
  for (const [i, p] of others.entries()) await pick(p, cards[i + 1]!)
  await expect(mod.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(cards.length)
  await mod.getByTestId('poker-reveal').click()
  await expect(mod.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(cards.length)
}
/** Filled buttons that a person can see: a voter has none, the moderator at most one. */
const filled = (page: Page) => page.locator('button.btn-primary:visible, a.btn-primary:visible').count()
/** Starts recording the flips of the table: every transition on a card of a seat, with its timing, and when one was last running. */
const recordFlips = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __flips: { seen: { duration: number; delay: number; start: number }[]; first: number; lastRunning: number } }
  w.__flips = { seen: [], first: 0, lastRunning: 0 }
  const known = new WeakSet<Animation>()
  const loop = (now: number) => {
    for (const a of document.getAnimations()) {
      const target = (a.effect as KeyframeEffect | null)?.target
      if (!(target instanceof HTMLElement) || !target.classList.contains('flip')) continue
      if (!known.has(a)) {
        known.add(a)
        const t = a.effect!.getTiming()
        w.__flips.seen.push({ duration: Number(t.duration), delay: Number(t.delay), start: Number(a.startTime) })
        if (!w.__flips.first) w.__flips.first = now
      }
      if (a.playState === 'running' || a.playState === 'pending') w.__flips.lastRunning = now
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
})
const flips = (page: Page) => page.evaluate(() => (window as unknown as { __flips: { seen: { duration: number; delay: number; start: number }[]; first: number; lastRunning: number } }).__flips)

test('the reveal flips every card in 280 ms, all within 60 ms of each other, none running at 400 ms, and none at all under reduced motion', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  test.setTimeout(150_000)
  const names = ['Ann', 'Bob', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal']
  const { page, others, close } = await room(browser, names)
  const cards = ['8', '5', '5', '13', '5', '?', '5', '8']
  await pick(page, cards[0]!)
  for (const [i, p] of others.entries()) await pick(p, cards[i + 1]!)
  await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(8)

  // Nothing of any card is in the page while the round is open: not in the text of the table, not in any attribute of its seats.
  const table = page.getByTestId('poker-seats')
  expect(await table.innerText()).not.toMatch(/\b(5|8|13)\b|\?/)
  const attributes = await table.evaluate((el) => [el, ...el.querySelectorAll('*')].flatMap((e) => [...e.attributes]).filter((a) => !/^(data-v-|class$|style$)/.test(a.name)).map((a) => a.value))
  expect(attributes.filter((v) => ['5', '8', '13', '?'].includes(v) || /\b(Card|Carte) (5|8|13)\b/.test(v))).toEqual([])
  await expect(table.locator('.value')).toHaveCount(0)

  // Motion allowed: eight transitions of 280 ms, the stagger of 10 ms capped at 60 ms, the last one done well before 400 ms.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await recordFlips(page)
  await page.getByTestId('poker-reveal').click()
  await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(8)
  await page.waitForTimeout(700)
  const run = await flips(page)
  expect(run.seen.map((f) => f.duration)).toEqual(Array(8).fill(280))
  expect(run.seen.map((f) => f.delay).sort((a, b) => a - b)).toEqual([0, 10, 20, 30, 40, 50, 60, 60])
  const starts = run.seen.map((f) => f.start + f.delay)
  expect(Math.max(...starts) - Math.min(...starts), 'the last flip starts within 60 ms of the first').toBeLessThanOrEqual(60)
  expect(Math.max(...run.seen.map((f) => f.start + f.delay + f.duration)) - Math.min(...starts), 'every flip is over 400 ms after the reveal').toBeLessThan(400)
  expect(run.lastRunning - run.first, 'none is running 400 ms after the first').toBeLessThan(400)

  // Reduced motion, from the system: a new round, the same reveal, no transition at all and the faces are there at once.
  await page.getByTestId('poker-next').click()
  await expect(page.getByTestId('poker-round')).toHaveText('Round 2')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await pick(page, '5')
  await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(1)
  await recordFlips(page)
  await page.getByTestId('poker-reveal').click()
  await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(1)
  await expect(page.locator('[data-testid="poker-seats"] .pcard[data-variant="face"] .value')).toHaveText(['5'])
  await page.waitForTimeout(500)
  expect((await flips(page)).seen).toEqual([])

  // Reduced motion, from the application's own setting.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => { document.documentElement.dataset.motion = 'reduced' })
  await page.getByTestId('poker-next').click()
  await expect(page.getByTestId('poker-round')).toHaveText('Round 3')
  await pick(page, '8')
  await recordFlips(page)
  await page.getByTestId('poker-reveal').click()
  await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(1)
  await page.waitForTimeout(500)
  expect((await flips(page)).seen).toEqual([])
  await close()
})

for (const [locale, viewport] of [['en-US', PHONES[0]], ['fr-FR', PHONES[1]]] as const) {
  test(`a revealed round of six on a ${viewport.width}x${viewport.height} phone in ${locale.slice(0, 2)}: two numbers, the meter in words, the distribution, the outlier, no scrolling`, async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
    test.setTimeout(150_000)
    const fr = locale === 'fr-FR'
    const { page, others, close } = await room(browser, ['Malaka', 'Ann', 'Bob', 'Cy', 'Dee', 'Eli'], undefined, locale)
    await page.setViewportSize(viewport)
    // Six voters play 8, 5, 5, 13, 5 and ?.
    await playRound(page, others, ['8', '5', '5', '13', '5', '?'])
    const results = page.getByTestId('poker-results')
    await expect(results).toBeVisible()
    // Two large numbers, then the verdict in words and its share, as a meter.
    await expect(page.getByTestId('poker-average')).toHaveText('7.2')
    await expect(page.getByTestId('poker-median')).toHaveText('5')
    const meter = page.getByTestId('poker-meter')
    await expect(meter).toHaveAttribute('role', 'meter')
    await expect(meter).toHaveAttribute('aria-valuenow', '50')
    await expect(meter).toHaveAttribute('aria-valuetext', fr ? 'Accord partiel, 50 %' : 'Some agreement, 50%')
    await expect(meter).toContainText(fr ? 'Accord partiel' : 'Some agreement')
    // One column per card played, in deck order, its count as text; the question mark is counted and drawn.
    expect(await columns(page)).toEqual([['5', '3'], ['8', '1'], ['13', '1'], ['?', '1']])
    await expect(page.getByTestId('poker-distribution')).toHaveJSProperty('tagName', 'UL')
    await expect(page.getByTestId('poker-distribution-item').first()).toContainText(fr ? '5 : 3 voix' : '5: 3 votes')
    expect(await page.getByTestId('poker-distribution-item').first().locator('.n').textContent()).toBe('3')
    // The highest card is marked on its seat and in the results, with words; the lowest is not, because 5 is the most chosen card.
    await expect(page.getByTestId('poker-outlier-highest')).toHaveText(fr ? 'Plus haute : 13 (Cy)' : 'Highest: 13 (Cy)')
    await expect(page.getByTestId('poker-outlier-lowest')).toHaveCount(0)
    const seat = (name: string) => page.getByTestId('poker-seat').filter({ hasText: name })
    await expect(seat('Cy').getByTestId('poker-outlier')).toHaveCount(1)
    await expect(page.getByTestId('poker-outlier')).toHaveCount(1)
    expect(await said(seat('Cy'))).toBe(fr ? 'Cy, Carte 13, carte la plus haute' : 'Cy, Card 13, highest card')
    // Nothing is said twice: the most chosen card and the spread are not facts of their own any more, and there is no heading to read.
    await expect(results.getByText(/Most chosen|Spread|Le plus choisi|Écart/)).toHaveCount(0)
    await expect(page.locator('main h2:visible, main h3:visible')).toHaveCount(0)
    // One viewport, the buttons are in the dock, and the suggestion is a quiet button.
    await fits(page, 'revealed six')
    await expect(page.getByTestId('poker-use')).toHaveText(fr ? 'Utiliser 5' : 'Use 5')
    await noViolation(page, 'results')
    await close()
  })
}

test('"Use 5" is the moderator\'s alone and shows to everybody; the next round clears it; at most one filled button, none for a voter, Vote again left and Next round right', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  test.setTimeout(150_000)
  const { page: ann, others: [bob, cy], close } = await room(browser, ['Ann', 'Bob', 'Cy'])
  const everyone = [ann, bob!, cy!]
  const voters = [bob!, cy!]
  // At most one filled button for the moderator and none for a voter, in every state; labelled buttons have an icon and 44 px.
  const checkButtons = async (where: string) => {
    expect(await filled(ann), `${where}: the moderator`).toBeLessThanOrEqual(1)
    for (const v of voters) expect(await filled(v), `${where}: a voter`).toBe(0)
    for (const p of everyone) {
      for (const b of await p.locator('main button.btn:visible, main a.btn:visible').all()) {
        const box = (await b.boundingBox())!
        expect(box.height, `${where}: ${await b.innerText()}`).toBeGreaterThanOrEqual(44)
        if ((await b.innerText()).trim()) await expect(b.locator('svg, .iconify, [class*="i-"]').first(), `${where}: an icon`).toBeVisible()
      }
    }
  }
  await checkButtons('lobby')
  // Round 1: everyone plays 5, so the room agrees: Next round is the filled button, Vote again and Use 5 are quiet.
  await playRound(ann, voters, ['5', '5', '5'])
  await checkButtons('revealed, agreement')
  await expect(ann.getByTestId('poker-next')).toHaveClass(/btn-primary/)
  await expect(ann.getByTestId('poker-revote')).not.toHaveClass(/btn-primary/)
  await expect(ann.getByTestId('poker-use')).not.toHaveClass(/btn-primary/)
  const places = async () => ({ revote: (await ann.getByTestId('poker-revote').boundingBox())!, next: (await ann.getByTestId('poker-next').boundingBox())! })
  const agree = await places()
  expect(agree.revote.x, 'Vote again is on the left').toBeLessThan(agree.next.x)
  await expect(ann.getByTestId('poker-meter')).toContainText('Everyone agrees')
  // A voter sees the suggestion as text, no button and no way to keep it.
  for (const v of voters) {
    await expect(v.getByTestId('poker-suggestion')).toHaveText('Suggested: 5')
    await expect(v.getByTestId('poker-use')).toHaveCount(0)
    await expect(v.getByTestId('poker-estimate')).toHaveCount(0)
  }
  // The moderator keeps it: everybody reads "Estimate 5" with a check, and the button is gone.
  await ann.getByTestId('poker-use').click()
  for (const p of everyone) {
    await expect(p.getByTestId('poker-estimate')).toHaveText('Estimate 5')
    await expect(p.getByTestId('poker-estimate').locator('svg, .iconify, [class*="i-"]').first()).toBeVisible()
    await expect(p.getByTestId('poker-use')).toHaveCount(0)
    await expect(p.getByTestId('poker-suggestion')).toHaveCount(0)
  }
  await checkButtons('estimate kept')
  await noViolation(bob!, 'estimate')

  // The next round clears the estimate, and the results with it.
  await ann.getByTestId('poker-next').click()
  for (const p of everyone) {
    await expect(p.getByTestId('poker-round')).toHaveText('Round 2')
    await expect(p.getByTestId('poker-estimate')).toHaveCount(0)
    await expect(p.getByTestId('poker-results')).toHaveCount(0)
  }
  await checkButtons('round 2, hand')
  // Round 2 disagrees (3, 8, 13): Vote again is filled, Next round quiet, each in the place it had.
  await playRound(ann, voters, ['3', '8', '13'])
  await checkButtons('revealed, disagreement')
  await expect(ann.getByTestId('poker-revote')).toHaveClass(/btn-primary/)
  await expect(ann.getByTestId('poker-next')).not.toHaveClass(/btn-primary/)
  await expect(ann.getByTestId('poker-meter')).toContainText('No agreement yet')
  const split = await places()
  expect(split).toEqual(agree)
  // Neither glows: the filled one has the quiet shadow of a card.
  expect(await ann.getByTestId('poker-revote').evaluate((el) => getComputedStyle(el).boxShadow)).not.toMatch(/22px/)
  await close()
})

test('the room announces politely, once each, in order: the voted count, the reveal with its figures and verdict, the new round; the hand rises back and is reachable by keyboard', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  test.setTimeout(150_000)
  const { page: ann, others: [bob, cy], close } = await room(browser, ['Ann', 'Bob', 'Cy'])
  const everyone = [ann, bob!, cy!]
  const live = (p: Page) => p.getByTestId('poker-live')
  // Every change of the live region of every tab, in order (no filtering: a sentence set twice would show twice).
  for (const p of everyone) {
    await p.evaluate(() => {
      const w = window as unknown as { __said: string[] }
      w.__said = []
      const region = document.querySelector('[data-testid="poker-live"]')!
      new MutationObserver(() => { const t = region.textContent!.trim(); if (t) w.__said.push(t) }).observe(region, { childList: true, characterData: true, subtree: true })
    })
    await expect(live(p)).toHaveAttribute('aria-live', 'polite')
  }
  const heard = (p: Page) => p.evaluate(() => (window as unknown as { __said: string[] }).__said)
  // The count, one voter at a time (each tab has read a count before the next card comes).
  const counts = ['1 of 3 voted', '2 of 3 voted', '3 of 3 voted']
  for (const [i, [p, card]] of ([[ann, '5'], [bob!, '5'], [cy!, '13']] as const).entries()) {
    await pick(p, card)
    for (const q of everyone) await expect(live(q)).toHaveText(counts[i]!)
  }
  await ann.getByTestId('poker-reveal').click()
  const reveal = 'Cards revealed. Average 7.67, median 5. Some agreement.'
  for (const p of everyone) await expect(live(p)).toHaveText(reveal)
  // The hand comes back with a short rise after a reveal: 150 ms, and none under reduced motion (Cy's tab asks for it).
  await cy!.emulateMedia({ reducedMotion: 'reduce' })
  for (const p of [ann, bob!]) await p.emulateMedia({ reducedMotion: 'no-preference' })
  for (const p of [ann, bob!, cy!]) {
    await p.evaluate(() => {
      const w = window as unknown as { __rise: { name: string; duration: number }[] }
      w.__rise = []
      const known = new WeakSet<Animation>()
      const loop = () => { for (const a of document.getAnimations()) if (a instanceof CSSAnimation && /^rise/.test(a.animationName) && !known.has(a)) { known.add(a); w.__rise.push({ name: 'rise', duration: Number(a.effect!.getTiming().duration) }) } requestAnimationFrame(loop) }
      requestAnimationFrame(loop)
    })
  }
  await ann.getByTestId('poker-revote').click()
  const revote = 'Round 2, vote again. Pick a card.'
  for (const p of everyone) await expect(live(p)).toHaveText(revote)
  for (const p of everyone) {
    // The new round: seats back to empty slots, results and estimate gone, the hand back with nothing chosen.
    await expect(p.getByTestId('poker-round')).toHaveText('Round 2, vote again')
    await expect(p.getByTestId('poker-results')).toHaveCount(0)
    await expect(p.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(0)
    await expect(p.locator('[data-testid="poker-seat"] .pcard[data-variant="slot"]')).toHaveCount(3)
    await expect(p.locator('input[name="poker-card"]:checked')).toHaveCount(0)
  }
  const rises = async (p: Page) => (await p.evaluate(() => (window as unknown as { __rise: { duration: number }[] }).__rise)).map((r) => r.duration)
  expect(await rises(ann)).toEqual([150])
  expect(await rises(bob!)).toEqual([150])
  expect(await rises(cy!)).toEqual([])
  // The hand is reachable by the keyboard in the new round: Tab reaches the radio group, a typed name picks a card.
  await bob!.locator('body').click({ position: { x: 1, y: 1 } })
  let landed = false
  for (let i = 0; i < 30 && !landed; i++) {
    await bob!.keyboard.press('Tab')
    landed = await bob!.evaluate(() => (document.activeElement as HTMLInputElement | null)?.name === 'poker-card')
  }
  expect(landed, 'Tab reaches the hand').toBe(true)
  await bob!.keyboard.press('3')
  await expect(bob!.getByTestId('poker-card-3')).toBeChecked()
  await expect(live(ann)).toHaveText('1 of 3 voted')
  // A second reveal and a plain next round: "Round 3. Pick a card.", announced to the people who vote.
  await pick(ann, '5')
  for (const q of everyone) await expect(live(q)).toHaveText('2 of 3 voted')
  await pick(cy!, '5')
  for (const q of everyone) await expect(live(q)).toHaveText('3 of 3 voted')
  await ann.getByTestId('poker-reveal').click()
  for (const p of everyone) await expect(live(p)).toHaveText(/^Cards revealed\. Average 4\.33, median 5\. Some agreement\.$/)
  await ann.getByTestId('poker-next').click()
  for (const p of everyone) await expect(live(p)).toHaveText('Round 3. Pick a card.')
  const expected = [...counts, reveal, revote, '1 of 3 voted', '2 of 3 voted', '3 of 3 voted', 'Cards revealed. Average 4.33, median 5. Some agreement.', 'Round 3. Pick a card.']
  for (const p of everyone) expect(await heard(p), 'every sentence once, in order').toEqual(expected)
  await noViolation(ann, 'between rounds')
  await close()
})

for (const viewport of PHONES) {
  test(`the worst revealed round of eight on a ${viewport.width}x${viewport.height} phone, with both outliers and 24-character names, still fits one viewport`, async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
    test.setTimeout(150_000)
    const names = [longName(0), ...Array.from({ length: 7 }, (_, i) => longName(i + 1))]
    const { page, others, close } = await room(browser, names)
    await page.setViewportSize(viewport)
    // The moderator plays 3, one voter 13 and the six others 5: the lowest and the highest card are both outliers, and their lines hold a long name.
    await playRound(page, others, ['3', '5', '5', '5', '5', '5', '5', '13'])
    await expect(page.getByTestId('poker-outlier-lowest')).toContainText(`3 (${names[0]})`)
    await expect(page.getByTestId('poker-outlier-highest')).toContainText(`13 (${names[7]})`)
    await expect(page.getByTestId('poker-outlier')).toHaveCount(2)
    await expect(page.getByTestId('poker-meter')).toContainText('Strong agreement')
    await fits(page, 'revealed, both outliers')
    await expect(page.getByTestId('poker-next')).toHaveClass(/btn-primary/)
    await close()
  })
}

test('a round of question marks has one column and no number; a T-shirt round shows the median card and no average', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  test.setTimeout(150_000)
  const marks = await room(browser, ['Ann', 'Bob'])
  await playRound(marks.page, marks.others, ['?', '?'])
  expect(await columns(marks.page)).toEqual([['?', '2']])
  await expect(marks.page.getByTestId('poker-no-numbers')).toHaveText('No numbered card in this round')
  for (const id of ['poker-average', 'poker-median', 'poker-use', 'poker-suggestion']) await expect(marks.page.getByTestId(id)).toHaveCount(0)
  await expect(marks.page.getByTestId('poker-meter')).toContainText('Everyone agrees')
  await expect(marks.page.getByTestId('poker-outlier')).toHaveCount(0)
  await marks.close()

  const shirts = await room(browser, ['Ann', 'Bob', 'Cy', 'Dee'], 'XS, S, M, L, XL')
  for (const [p, i] of [[shirts.page, 1], [shirts.others[0]!, 2], [shirts.others[1]!, 2], [shirts.others[2]!, 3]] as const) await p.getByTestId(`poker-card-${i}`).check({ force: true })
  await expect(shirts.page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(4)
  await shirts.page.getByTestId('poker-reveal').click()
  await expect(shirts.page.getByTestId('poker-results')).toBeVisible()
  await expect(shirts.page.getByTestId('poker-median')).toHaveText('M')
  await expect(shirts.page.getByTestId('poker-average')).toHaveCount(0)
  await expect(shirts.page.getByTestId('poker-meter')).toContainText('Some agreement')
  expect(await columns(shirts.page)).toEqual([['S', '1'], ['M', '2'], ['L', '1']])
  await expect(shirts.page.getByTestId('poker-use')).toHaveText('Use M')
  await shirts.close()
})

/**
 * Change poker-design-v2, group 4: larger screens. From 600 px the seats sit on an oval, the person at the bottom centre and the others
 * clockwise in join order; the results sit beside the table (laptop) or under it (tablet); the content scales on a TV, the chrome does not.
 */
const TABLET = { width: 768, height: 1024 }
const LAPTOP = { width: 1280, height: 800 }
const WIDE = { width: 1600, height: 900 }
const TV = { width: 2560, height: 1440 }
/** Resizes the window and waits for the page to take the screen class of the new width (the plugin listens to `resize`). */
const resize = async (page: Page, screen: { width: number; height: number }) => {
  await page.setViewportSize(screen)
  const id = screen.width >= 2400 ? 'tv' : screen.width >= 1600 ? 'wide' : screen.width >= 1024 ? 'laptop' : screen.width >= 600 ? 'tablet' : 'phone'
  await page.waitForFunction((want) => document.documentElement.dataset.screen === want, id)
  await page.waitForTimeout(100)
}
type Rect = { l: number; t: number; r: number; b: number }
/** What the table looks like on this page: every seat's box, the stage, the felt, the dock, the hand and whether anything scrolls. */
const geometry = (page: Page) => page.evaluate(() => {
  const rect = (el: Element | null): Rect | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom } }
  const region = document.querySelector('[data-testid="poker-region"]') as HTMLElement
  const seats = [...document.querySelectorAll('[data-testid="poker-seat"]')]
  return {
    stage: rect(document.querySelector('[data-testid="poker-stage"]'))!, felt: rect(document.querySelector('[data-testid="poker-felt"]')),
    seats: seats.map((e) => ({ ...rect(e)!, name: e.querySelector('.name')!.textContent!, me: e.classList.contains('me') })),
    dock: rect(document.querySelector('[data-testid="poker-dock"]')), hand: rect(document.querySelector('[data-testid="poker-hand"]')), results: rect(document.querySelector('[data-testid="poker-results"]')),
    panel: rect(document.querySelector('[data-testid="poker-panel"]')), bar: rect(document.querySelector('[data-testid="poker-bar"]'))!,
    pageScrolls: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
    regionOverflow: region.scrollHeight - region.clientHeight, width: innerWidth, height: innerHeight,
  }
})
type Geometry = Awaited<ReturnType<typeof geometry>>
const overlapping = (g: Geometry) => g.seats.flatMap((a, i) => g.seats.slice(i + 1).filter((b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5).map((b) => `${a.name} / ${b.name}`))
const outsideStage = (g: Geometry) => g.seats.filter((a) => a.l < g.stage.l - 1 || a.r > g.stage.r + 1 || a.t < g.stage.t - 1 || a.b > g.stage.b + 1).map((a) => a.name)
/** Angle of a box from the middle of the stage, in degrees clockwise on the screen from the bottom (the person's place): left is 90, top 180, right 270. */
const clockwise = (g: Geometry, a: Rect) => { const cx = (g.stage.l + g.stage.r) / 2, cy = (g.stage.t + g.stage.b) / 2; const deg = (Math.atan2(-(((a.l + a.r) / 2 - cx) / ((g.stage.r - g.stage.l) / 2)), ((a.t + a.b) / 2 - cy) / ((g.stage.b - g.stage.t) / 2)) * 180) / Math.PI; return (deg + 360) % 360 }

test('on a tablet and a laptop the seats sit on an oval: the person at the bottom centre, the others clockwise in join order, no overlap, nothing leaves the stage', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'twenty tabs: Chromium')
  test.setTimeout(240_000)
  const names = ['Moderator', 'Ann', 'Bob']
  const { page, others, join, close } = await room(browser, names, undefined, 'en-US', LAPTOP)
  for (const count of [3, 6, 8, 14, 20]) {
    while (names.length < count) { const name = `Voter ${String(names.length).padStart(2, '0')}`; names.push(name); await join(name) }
    await expect(page.getByTestId('poker-seat')).toHaveCount(count)
    for (const screen of [TABLET, LAPTOP]) {
      await resize(page, screen)
      const where = `${count} voters at ${screen.width}x${screen.height}`
      const g = await geometry(page)
      expect(overlapping(g), `${where}: no two seats overlap`).toEqual([])
      expect(outsideStage(g), `${where}: no seat leaves the stage`).toEqual([])
      // The DOM and so the tab order stay in join order, whatever the picture.
      expect(g.seats.map((s) => s.name), `${where}: join order`).toEqual(names)
      // The person is at the bottom centre; the next to join follows clockwise (to the left of the person), and the angles only grow.
      const me = g.seats[0]!
      expect(Math.abs((me.l + me.r) / 2 - (g.stage.l + g.stage.r) / 2), `${where}: centred`).toBeLessThan(2)
      expect(g.seats.every((s) => s.t <= me.t + 0.5), `${where}: the person is the lowest`).toBe(true)
      const angles = g.seats.slice(1).map((s) => clockwise(g, s))
      expect(angles, `${where}: clockwise`).toEqual([...angles].sort((a, b) => a - b))
      expect(angles[0]!, `${where}: the next one follows the person to the left`).toBeGreaterThan(0)
      expect(angles[0]!).toBeLessThan(180)
      // The seats are 96, 80 and 64 px wide by count (the type scale of these screens is 1).
      expect(Math.round(me.r - me.l), where).toBe(count <= 8 ? 96 : count <= 14 ? 80 : 64)
      // The page never scrolls (only the middle region may), and the hand and the dock are inside the viewport.
      expect(g.pageScrolls, `${where}: the page does not scroll`).toBe(false)
      expect(g.dock!.b, `${where}: the dock`).toBeLessThanOrEqual(g.height + 0.5)
      expect(g.hand!.b, `${where}: the hand`).toBeLessThanOrEqual(g.height + 0.5)
      expect(g.hand!.l).toBeGreaterThanOrEqual(0)
      expect(g.hand!.r).toBeLessThanOrEqual(g.width)
      if (count <= 8) expect(g.regionOverflow, `${where}: the middle region fits`).toBeLessThanOrEqual(1)
    }
  }
  await noViolation(page, 'oval')
  void others
  await close()
})

test('on a tablet the round and the primary action are in the middle of the table; the results sit under it in two columns, beside it from 1024 px, with the dock under both', async ({ browser, browserName }) => {
  test.setTimeout(150_000)
  test.skip(browserName === 'firefox', 'Firefox: the project is Chromium and WebKit')
  const { page, others, close } = await room(browser, ['Malaka', 'Ann', 'Bob', 'Cy', 'Dee', 'Eli'], undefined, 'en-US', TABLET)
  const inside = (g: Geometry, a: Rect | null) => a!.l >= g.felt!.l - 1 && a!.r <= g.felt!.r + 1 && a!.t >= g.felt!.t - 1 && a!.b <= g.felt!.b + 1
  // Before any card: the round and the count are in the table (laptop: also in a quiet panel beside it, with the hint), Reveal comes with the first card.
  await expect(page.getByTestId('poker-reveal')).toHaveCount(0)
  await pick(page, '8')
  await expect(page.getByTestId('poker-reveal')).toBeVisible()
  const felt = page.getByTestId('poker-felt')
  await expect(felt).toContainText('Round 1')
  await expect(felt).toContainText('1 of 6 voted')
  await expect(felt.getByTestId('poker-reveal')).toBeVisible()
  await expect(page.getByTestId('poker-dock').getByTestId('poker-reveal')).toHaveCount(0)
  let g = await geometry(page)
  expect(inside(g, await page.getByTestId('poker-reveal').evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom } })), 'Reveal is in the table').toBe(true)
  expect(Math.abs((g.felt!.l + g.felt!.r) / 2 - (g.stage.l + g.stage.r) / 2)).toBeLessThan(2)
  expect(g.panel, 'a tablet has no side panel').toBeNull()
  await expect(page.getByTestId('poker-hint')).toHaveText('Waiting for Ann, Bob and 3 others.')
  expect(Math.abs((g.hand!.l + g.hand!.r) / 2 - g.width / 2), 'the hand is centred').toBeLessThan(3)
  expect(g.hand!.l).toBeGreaterThanOrEqual(0); expect(g.hand!.r).toBeLessThanOrEqual(g.width)
  // The hand is 60 px cards on a tablet and 72 px on a laptop.
  const cardWidth = () => page.getByTestId('poker-card-0').locator('xpath=following-sibling::span').evaluate((el) => Math.round(el.getBoundingClientRect().width))
  expect(await cardWidth()).toBe(60)
  await resize(page, LAPTOP)
  expect(await cardWidth()).toBe(72)
  g = await geometry(page)
  await expect(page.getByTestId('poker-panel')).toContainText('Round 1')
  await expect(page.getByTestId('poker-panel')).toContainText('Waiting for Ann, Bob and 3 others.')
  expect(g.panel!.l, 'the quiet panel is at the right of the table').toBeGreaterThanOrEqual(g.stage.r - 1)
  await resize(page, TABLET)

  // Revealed: a round of six.
  const cards = ['8', '5', '5', '13', '5', '?']
  for (const [i, p] of others.entries()) await pick(p, cards[i + 1]!)
  await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(6)
  await page.getByTestId('poker-reveal').click()
  await expect(page.getByTestId('poker-results')).toBeVisible()
  for (const [screen, where] of [[TABLET, 'tablet'], [LAPTOP, 'laptop'], [WIDE, 'wide']] as const) {
    await resize(page, screen)
    g = await geometry(page)
    expect(g.pageScrolls, `${where}: the page does not scroll`).toBe(false)
    expect(g.regionOverflow, `${where}: the middle region fits six voters`).toBeLessThanOrEqual(1)
    expect(g.dock!.b, `${where}: the dock`).toBeLessThanOrEqual(g.height + 0.5)
    expect(overlapping(g), where).toEqual([])
    expect(g.results!.b, `${where}: the results are above the dock`).toBeLessThanOrEqual(g.dock!.t + 0.5)
    if (where === 'tablet') {
      expect(g.results!.t, 'tablet: the results are under the table').toBeGreaterThanOrEqual(g.stage.b - 1)
      // Two columns: the distribution is at the right of the numbers.
      const [numbers, distribution] = await page.evaluate(() => ['[data-testid="poker-average"]', '[data-testid="poker-distribution"]'].map((sel) => document.querySelector(sel)!.getBoundingClientRect().left))
      expect(distribution!).toBeGreaterThan(numbers! + 150)
    } else {
      expect(g.results!.l, `${where}: the results are beside the table`).toBeGreaterThanOrEqual(g.stage.r - 1)
      expect(g.results!.t, `${where}: at the top of the room`).toBeLessThan(g.stage.t + 20)
    }
    // The buttons of the dock are centred under both.
    const acts = await page.getByTestId('poker-acts').boundingBox()
    expect(Math.abs(acts!.x + acts!.width / 2 - g.width / 2), where).toBeLessThan(3)
  }
  await noViolation(page, 'oval revealed')
  await close()
})

test('on a TV the content grows with the type scale and the chrome does not; a person who only watches has a larger table and no dock', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'a full room of twenty-one tabs: Chromium')
  test.setTimeout(240_000)
  const names = ['Malaka', 'Ann', 'Bob']
  const { page, others, join, close } = await room(browser, names, undefined, 'en-US', LAPTOP)
  await pick(page, '8'); await pick(others[0]!, '5'); await pick(others[1]!, '13')
  await expect(page.locator('[data-testid="poker-seat"][data-voted="true"]')).toHaveCount(3)
  const measure = () => page.evaluate(() => {
    const box = (sel: string) => { const r = document.querySelector(sel)!.getBoundingClientRect(); return { w: r.width, h: r.height } }
    const font = (sel: string) => parseFloat(getComputedStyle(document.querySelector(sel)!).fontSize)
    return { card: box('[data-testid="poker-seat"] .pcard'), seat: box('[data-testid="poker-seat"]'), bar: box('[data-testid="poker-bar"]'), reveal: box('[data-testid="poker-reveal"]'), name: font('[data-testid="poker-seat"] .name'), round: font('[data-testid="poker-felt"] .round'), menu: box('[data-testid="btn-variant"]') }
  })
  const laptop = await measure()
  await resize(page, TV)
  const tv = await measure()
  // A card (and a seat, an avatar, a name) is 1.5 times the size of the same card on a laptop; the bar and the buttons are the size they were.
  expect(tv.card.w / laptop.card.w).toBeCloseTo(1.5, 1)
  expect(tv.card.h / laptop.card.h).toBeCloseTo(1.5, 1)
  expect(tv.seat.w / laptop.seat.w).toBeCloseTo(1.5, 1)
  expect(tv.name / laptop.name).toBeCloseTo(1.5, 1)
  expect(tv.round / laptop.round).toBeCloseTo(1.5, 1)
  expect(tv.bar.h).toBe(laptop.bar.h)
  expect(tv.reveal).toEqual(laptop.reveal)
  expect(tv.menu).toEqual(laptop.menu)
  // The results grow too, and nothing is under the sizes of the scale.
  await others[2 - 1]!.bringToFront()
  await page.bringToFront()
  await page.getByTestId('poker-reveal').click()
  await expect(page.getByTestId('poker-results')).toBeVisible()
  const sizes = await page.evaluate(() => [...document.querySelectorAll('[data-testid="poker-results"] dt, [data-testid="poker-results"] .far li, [data-testid="poker-results"] .n, [data-testid="poker-meter"]')].map((e) => parseFloat(getComputedStyle(e).fontSize)))
  expect(Math.min(...sizes), 'every text of the results is at least the small size times 1.5').toBeGreaterThanOrEqual(0.875 * 16 * 1.5 - 0.5)
  const g = await geometry(page)
  expect(g.pageScrolls).toBe(false)
  expect(g.results!.l).toBeGreaterThanOrEqual(g.stage.r - 1)

  // A full room: the twenty-first person watches, on a TV, with a larger table and no dock.
  for (let i = names.length; i < 21; i++) await join(`Voter ${String(i).padStart(2, '0')}`)
  const watcher = await join('Watcher', TV)
  await expect(watcher.getByTestId('poker-status')).toHaveText('Watching')
  await expect(watcher.getByTestId('poker-dock')).toHaveCount(0)
  await expect(watcher.getByTestId('poker-hand')).toHaveCount(0)
  const w = await geometry(watcher)
  expect(w.pageScrolls).toBe(false)
  expect(w.seats).toHaveLength(22)
  expect(overlapping(w)).toEqual([])
  expect(Math.round(w.seats[0]!.r - w.seats[0]!.l), 'a seat of the largest table, times the type scale of a TV').toBe(96)
  await close()
})
