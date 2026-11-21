import { describe, expect, it } from 'vitest'
import type { PokerView, RoundView, SeatView } from '../app/poker/client'
import { dockOf, hintOf, namesOf, type Say, statusOf } from '../app/poker/room-view'

/** The table of states of change poker-design-v2 (K6 and K2): what the room says and offers, by state and role. */
const seat = (name: string, o: Partial<SeatView> = {}): SeatView => ({ key: name, name, me: false, moderator: false, voter: true, voted: false, card: null, ...o })
const round = (o: Partial<RoundView> = {}): RoundView => ({ n: 1, revealed: false, revote: false, voted: 0, voters: 1, deck: ['1', '2'], ...o })
const view = (o: Partial<PokerView> = {}): PokerView => ({ status: 'live', moderator: false, canReveal: false, seats: [seat('Ann')], round: round(), mine: null, voter: true, stats: null, unreadable: 0, ...o })
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
