import { type Browser, expect, type Page, test } from '@playwright/test'
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
    // The hand leaves at the reveal (it does not fade): the dock has nothing to offer a voter.
    await expect(page.getByTestId('poker-hand')).toHaveCount(0)
    await expect(page.getByTestId('poker-dock')).toHaveCount(0)
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
    await expect(page.getByTestId('poker-dock')).toHaveCount(0)
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
