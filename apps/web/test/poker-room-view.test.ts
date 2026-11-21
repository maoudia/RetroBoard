import { describe, expect, it } from 'vitest'
import type { PokerView, RoundView, SeatView } from '../app/poker/client'
import { roundStatistics } from '@retroboard/application'
import { announceOf, dockOf, figure, hintOf, namesOf, primaryOf, type Say, statusOf } from '../app/poker/room-view'

/** The table of states of change poker-design-v2 (K6 and K2): what the room says and offers, by state and role. */
const seat = (name: string, o: Partial<SeatView> = {}): SeatView => ({ key: name, name, me: false, moderator: false, voter: true, voted: false, card: null, outlier: null, ...o })
const round = (o: Partial<RoundView> = {}): RoundView => ({ n: 1, revealed: false, revote: false, voted: 0, voters: 1, deck: ['1', '2'], decided: null, ...o })
const view = (o: Partial<PokerView> = {}): PokerView => ({ status: 'live', moderator: false, canReveal: false, seats: [seat('Ann')], round: round(), mine: null, voter: true, stats: null, verdict: null, outliers: null, unreadable: 0, ...o })
const say = (line: Say) => `${line.key}${line.params ? JSON.stringify(line.params) : ''}`
const hint = (v: PokerView) => { const h = hintOf(v, say); return h ? say(h) : null }

describe('statusOf', () => {
  it('says only what is not normal: connecting, reconnecting, the room is full; never "connected"', () => {
    expect(statusOf(view({ status: 'connecting' }))).toEqual({ key: 'poker.status.connecting' })
    expect(statusOf(view({ status: 'offline' }))).toEqual({ key: 'poker.status.offline' })
    expect(statusOf(view({ status: 'full' }))).toEqual({ key: 'poker.status.full' })
    expect(statusOf(view({ status: 'board' }))).toBeNull()
    expect(statusOf(view({ round: null }))).toEqual({ key: 'poker.status.connecting' })
  })
  it('says the count while voting, "waiting for your team" alone, "revealed" after, "watching" for an observer', () => {
    const two = [seat('Ann'), seat('Bob')]
    expect(statusOf(view({ seats: two, round: round({ voted: 1, voters: 2 }) }))).toEqual({ key: 'poker.progress', params: { voted: 1, total: 2 } })
    expect(statusOf(view())).toEqual({ key: 'poker.status.alone' })
    // Alone but the first card is in: the count (1 of 1).
    expect(statusOf(view({ round: round({ voted: 1 }) }))).toEqual({ key: 'poker.progress', params: { voted: 1, total: 1 } })
    expect(statusOf(view({ round: round({ revealed: true, voted: 1 }) }))).toEqual({ key: 'poker.revealed' })
    expect(statusOf(view({ voter: false }))).toEqual({ key: 'poker.status.watching' })
  })
})

describe('dockOf', () => {
  it('holds the hand while a round is open, the next steps after the reveal, and nothing for an observer or a full room', () => {
    expect(dockOf(view())).toBe('hand')
    expect(dockOf(view({ round: round({ revealed: true }) }))).toBe('revealed')
    expect(dockOf(view({ voter: false }))).toBe('none')
    expect(dockOf(view({ status: 'full' }))).toBe('none')
    expect(dockOf(view({ status: 'board' }))).toBe('none')
    expect(dockOf(view({ round: null }))).toBe('none')
  })
})

describe('namesOf', () => {
  it('one name, two names, then the first two and a count', () => {
    const people = ['Dee', 'Eli', 'Fay', 'Gus', 'Hal'].map((n) => seat(n))
    expect(namesOf(people.slice(0, 1))).toEqual({ key: 'poker.hint.names.one', params: { a: 'Dee' } })
    expect(namesOf(people.slice(0, 2))).toEqual({ key: 'poker.hint.names.two', params: { a: 'Dee', b: 'Eli' } })
    expect(namesOf(people)).toEqual({ key: 'poker.hint.names.more', params: { a: 'Dee', b: 'Eli', n: 3 } })
  })
})

describe('hintOf: one muted line at most, by state and role', () => {
  const ann = seat('Ann', { moderator: true, me: true })
  it('lobby, alone: share the link', () => { expect(hint(view({ seats: [ann], moderator: true, canReveal: true }))).toBe('poker.hint.alone') })
  it('voting, not voted: none, the hand is the hint', () => {
    expect(hint(view({ seats: [ann, seat('Bob')], round: round({ voters: 2 }), mine: null }))).toBeNull()
  })
  it('voted, others missing: waiting for them by name', () => {
    const v = view({ seats: [{ ...ann, voted: true }, seat('Bob'), seat('Cy')], round: round({ voted: 1, voters: 3 }), mine: 1, moderator: true, canReveal: true })
    expect(hint(v)).toBe('poker.hint.waiting{"names":"poker.hint.names.two{\\"a\\":\\"Bob\\",\\"b\\":\\"Cy\\"}"}')
  })
  it('everyone voted: a voter waits for the moderator, the moderator has Reveal and no hint', () => {
    const all = [{ ...ann, voted: true }, seat('Bob', { voted: true })]
    const open = round({ voted: 2, voters: 2 })
    expect(hint(view({ seats: all, round: open, mine: 1 }))).toBe('poker.hint.everyone{"name":"Ann"}')
    expect(hint(view({ seats: all, round: open, mine: 1, moderator: true, canReveal: true }))).toBeNull()
  })
  it('revealed: a voter is told who starts the next round, the moderator has the buttons and no hint', () => {
    const done = round({ revealed: true, voted: 2, voters: 2 })
    expect(hint(view({ seats: [ann, seat('Bob')], round: done }))).toBe('poker.hint.next{"name":"Ann"}')
    expect(hint(view({ seats: [ann, seat('Bob')], round: done, moderator: true }))).toBeNull()
    // No moderator seat in view: the role word stands for the name.
    expect(hint(view({ seats: [seat('Bob')], round: done }))).toBe('poker.hint.next{"name":""}')
  })
  it('another device holds the round: only it can reveal', () => {
    expect(hint(view({ seats: [ann, seat('Bob')], round: round({ voted: 1, voters: 2 }), moderator: true, canReveal: false, mine: 0 }))).toBe('poker.hint.holder')
  })
  it('an observer is told why, a full room or a board says nothing', () => {
    expect(hint(view({ voter: false }))).toBe('poker.hint.watching')
    expect(hint(view({ status: 'full' }))).toBeNull()
    expect(hint(view({ status: 'board' }))).toBeNull()
    expect(hint(view({ round: null }))).toBeNull()
  })
})

describe('primaryOf: the filled button after the reveal (K9)', () => {
  it('is Next round when the room agrees (everyone or strongly) and Vote again when it does not', () => {
    expect(primaryOf('all')).toBe('next')
    expect(primaryOf('strong')).toBe('next')
    expect(primaryOf('some')).toBe('revote')
    expect(primaryOf('none')).toBe('revote')
    expect(primaryOf(null)).toBe('revote')
  })
})

describe('figure: at most two decimals, no trailing zero', () => {
  it('writes 7.2, 5, 3.67 and 0.5', () => { expect([7.2, 5, 3.666, 0.5, 5.25, 0].map(figure)).toEqual(['7.2', '5', '3.67', '0.5', '5.25', '0']) })
})

describe('announceOf: one polite line per change, once', () => {
  const FIB = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '\u2615']
  const TSHIRT = ['XS', 'S', 'M', 'L', 'XL', '?']
  const said = (prev: PokerView | null, v: PokerView) => { const l = announceOf(prev, v, say); return l ? say(l) : null }
  const open = (o: Partial<RoundView> = {}) => view({ seats: [seat('Ann'), seat('Bob')], round: round({ voters: 2, ...o }) })
  const done = (deck: string[], cards: string[], verdictOf: PokerView['verdict']) => view({
    seats: [seat('Ann'), seat('Bob')], round: round({ revealed: true, voted: cards.length, voters: 2, deck }),
    stats: roundStatistics(deck, cards.map((c) => deck.indexOf(c))), verdict: verdictOf,
  })

  it('announces nothing for the first view, a view that did not change, a room that is not live or no round', () => {
    expect(said(null, open())).toBeNull()
    expect(said(open(), open())).toBeNull()
    expect(said(open(), { ...open({ voted: 1 }), status: 'offline' })).toBeNull()
    expect(said(view({ round: null }), open({ voted: 1 }))).toBeNull()
    expect(said(open(), view({ round: null }))).toBeNull()
    expect(said(open({ voted: 1 }), open({ voted: 1, revealed: false }))).toBeNull()
  })
  it('says the voted count when it changes', () => {
    expect(said(open(), open({ voted: 1 }))).toBe('poker.progress{"voted":1,"total":2}')
    expect(said(open({ voted: 1 }), open({ voted: 2 }))).toBe('poker.progress{"voted":2,"total":2}')
  })
  it('says the reveal with the average, the median and the verdict in words', () => {
    const v = done(FIB, ['8', '5', '5', '13', '5', '?'], 'some')
    expect(said(open({ voted: 6 }), v)).toBe('poker.announce.revealed{"average":"7.2","median":"5","verdict":"poker.verdict.some"}')
    // Once: the next view of the same revealed round says nothing.
    expect(said(v, v)).toBeNull()
  })
  it('says the median card of an ordinal deck, no number for a round of question marks, and the bare reveal without figures', () => {
    expect(said(open({ voted: 4 }), done(TSHIRT, ['S', 'M', 'M', 'L'], 'some'))).toBe('poker.announce.revealedMedian{"median":"M","verdict":"poker.verdict.some"}')
    expect(said(open({ voted: 2 }), done(FIB, ['?', '?'], 'all'))).toBe('poker.announce.revealedNone{"verdict":"poker.verdict.all"}')
    expect(said(open({ voted: 2 }), view({ round: round({ revealed: true, voted: 2, voters: 2 }) }))).toBe('poker.announce.revealedBare')
    expect(said(open({ voted: 2 }), view({ round: round({ revealed: true, voted: 2, voters: 2 }), stats: roundStatistics(FIB, [1]) }))).toBe('poker.announce.revealedBare')
  })
  it('says the new round, as a re-vote when it is one, and only the round to a person who watches', () => {
    const before = done(FIB, ['8', '8'], 'all')
    expect(said(before, open({ n: 3 }))).toBe('poker.announce.round{"n":3}')
    expect(said(before, open({ n: 3, revote: true }))).toBe('poker.announce.revote{"n":3}')
    expect(said(before, { ...open({ n: 3 }), voter: false })).toBe('poker.announce.roundWatch{"n":3}')
  })
})
