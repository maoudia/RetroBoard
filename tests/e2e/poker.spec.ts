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
    await expect(page.getByTestId('poker-mode')).toHaveText('2, 4, 8')
    await expect(page.getByTestId('poker-spread')).toContainText(/2 (à|to) 8/)
    await expect(page.getByTestId('poker-agreement')).toHaveText(/^33 ?%$/)
    await expect(page.getByTestId('poker-suggestion')).toHaveText('4')
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
  await expect(a!.getByTestId('poker-agreement')).toContainText('100')
  await expect(a!.getByTestId('poker-agreement')).toContainText(/unanimi/i)
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
  if (cards) await page.getByTestId('poker-cards').fill(cards)
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
async function room(browser: Browser, names: readonly string[], cards?: string, locale = 'en-US') {
  const contexts: BrowserContext[] = []
  const mod = await english(browser, PHONES[0], locale)
  contexts.push(mod)
  const page = await mod.newPage()
  await page.goto('/poker')
  if (cards) await page.getByTestId('poker-cards').fill(cards)
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
  return { page, others, close: () => Promise.all(contexts.map((c) => c.close())) }
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
    // Revealed: the page itself does not scroll (the results card of this release is taller than its successor: the middle region may).
    await page.getByTestId('poker-reveal').click()
    await expect(page.locator('[data-testid="poker-seat"][data-revealed="true"]')).toHaveCount(8)
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
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
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

test('the bar of a phone: back, the round with one status line, Invite and a menu, each a 44 px target; Reveal is 48 px', async ({ browser, browserName }) => {
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
  await expect(page.locator('input[readonly], [data-testid="poker-lang-en"]:visible, [data-testid="poker-qr-toggle"]')).toHaveCount(0)
  expect((await page.getByTestId('poker-bar').boundingBox())!.height).toBeGreaterThanOrEqual(56)
  for (const id of ['poker-home', 'poker-invite', 'poker-menu']) {
    const b = (await page.getByTestId(id).boundingBox())!
    expect(b.width, id).toBeGreaterThanOrEqual(44)
    expect(b.height, id).toBeGreaterThanOrEqual(44)
  }
  // The label of Invite is for a tablet and up: on a phone its name comes from the aria-label.
  await expect(page.getByTestId('poker-invite')).toHaveAccessibleName('Invite')
  await expect(page.getByTestId('poker-invite').locator('.label')).toBeHidden()
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

test('the overflow menu holds the language, light or dark and the way back; the choice of light or dark persists', async ({ browser, browserName }) => {
  test.skip(browserName === 'firefox', 'Firefox has no mobile emulation')
  const ctx = await english(browser)
  const page = await ctx.newPage()
  await soloRoom(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ uiMode: 'advanced', variant: 'light' })) } catch { /* ignore */ } })
  await page.reload()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'light')
  await page.getByTestId('poker-menu').click()
  for (const id of ['poker-lang-en', 'poker-lang-fr', 'poker-variant', 'poker-menu-home']) {
    await expect(page.getByTestId(id)).toBeVisible()
    expect((await page.getByTestId(id).boundingBox())!.height, id).toBeGreaterThanOrEqual(48)
  }
  await expect(page.getByTestId('poker-lang-en')).toHaveAttribute('aria-checked', 'true')
  await noViolation(page, 'menu')
  await page.getByTestId('poker-variant').click()
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'dark')
  // The choice is kept on this device: after a reload the room is dark again; the language follows the menu too.
  await page.reload()
  await expect(page.getByTestId('poker-status')).toHaveAttribute('data-status', 'live')
  await expect(page.locator('html')).toHaveAttribute('data-variant', 'dark')
  await page.getByTestId('poker-menu').click()
  await page.getByTestId('poker-lang-fr').click()
  await expect(page.getByTestId('poker-round')).toHaveText('Tour 1')
  await page.getByTestId('poker-menu').click()
  await page.getByTestId('poker-menu-home').click()
  await expect(page).toHaveURL(/\/$/)
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
