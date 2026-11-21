import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DECK, emptyLedger, emptyPoker, type EventBody, foldAll, foldEvent, isPrivileged, isValidDeck, type Ledger, MAX_ROUNDS, MAX_SEATS,
  type PokerCommand, type PokerState, reducePoker, VOTER_CAP, type VerifiedEvent,
} from '../src'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const key = (c: string, n = 43) => c.repeat(n).slice(0, n)
const FAC = key('f'); const ALICE = key('a'); const BOB = key('b')
const PUB = key('p'); const REVEAL = key('k')
const sealed = (c = 's') => key(c, 134)

let seq = 0
const ev = (author: string, body: EventBody): VerifiedEvent => ({ id: `01J${String(++seq).padStart(23, '0')}`, at: 1_000 + seq * 1_000, author, body })
const poker = (author: string, cmd: PokerCommand) => ev(author, { t: 'poker', cmd })
const genesis = (kind?: 'poker') => ev(FAC, { t: 'genesis', roomId, facilitatorKey: FAC, ...(kind ? { kind } : {}) })
const room = (): Ledger => foldAll(emptyLedger(roomId), [genesis('poker')])
const play = (events: VerifiedEvent[], from: Ledger = room()) => foldAll(from, events)
const state = (l: Ledger): PokerState => l.poker!

const join = (author: string, name = 'x') => poker(author, { t: 'seat.join', name })
const start = (round = 'r1', author = FAC) => poker(author, { t: 'round.start', round, pub: PUB })
const vote = (author: string, round = 'r1', s = sealed()) => poker(author, { t: 'vote.seal', round, sealed: s })
const reveal = (round = 'r1', author = FAC) => poker(author, { t: 'round.reveal', round, key: REVEAL })

describe('a poker room (ledger)', () => {
  it('is made by a genesis that names its kind, and nothing else changes for a board', () => {
    const l = room()
    expect(l.kind).toBe('poker')
    expect(state(l)).toEqual(emptyPoker())
    const board = foldAll(emptyLedger(roomId), [genesis()])
    expect(board.kind).toBeUndefined()
    expect(board.poker).toBeUndefined()
    expect(Object.keys(board).sort()).toEqual(Object.keys(emptyLedger(roomId)).sort())
  })

  it('ignores a second genesis, whatever its kind, and a poker command before any genesis', () => {
    expect(foldEvent(room(), genesis())).toMatchObject({ ok: false, reason: 'duplicate-genesis' })
    expect(foldEvent(emptyLedger(roomId), join(ALICE))).toMatchObject({ ok: false, reason: 'no-genesis' })
    const boardThenPoker = foldAll(emptyLedger(roomId), [genesis()])
    expect(foldEvent(boardThenPoker, genesis('poker'))).toMatchObject({ ok: false, reason: 'duplicate-genesis' })
  })

  it('ignores an event of the other kind: a board command in a poker room, a poker command on a board', () => {
    const column = emptyLedger(roomId).board.columns[0]!.id
    const note = ev(ALICE, { t: 'cmd', cmd: { t: 'note.add', columnId: column, text: 'hi' }, name: null, showName: false })
    expect(foldEvent(room(), note)).toMatchObject({ ok: false, reason: 'forbidden' })
    const board = foldAll(emptyLedger(roomId), [genesis()])
    const out = foldEvent(board, join(ALICE))
    expect(out).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(out.ledger).toBe(board)
  })

  it('lets role events work as on a board', () => {
    const l = play([ev(FAC, { t: 'role.delegate', key: ALICE }), join(ALICE, 'Ann'), start('r1', ALICE)])
    expect(l.facilitators).toEqual([FAC, ALICE])
    expect(state(l).rounds).toHaveLength(1)
  })

  it('treats the moderator commands as privileged and seating and voting as open', () => {
    expect(isPrivileged({ t: 'poker', cmd: { t: 'round.start', round: 'r1', pub: PUB } })).toBe(true)
    expect(isPrivileged({ t: 'poker', cmd: { t: 'round.reveal', round: 'r1', key: REVEAL } })).toBe(true)
    expect(isPrivileged({ t: 'poker', cmd: { t: 'settings.update', autoReveal: true } })).toBe(true)
    expect(isPrivileged({ t: 'poker', cmd: { t: 'seat.join', name: 'x' } })).toBe(false)
    expect(isPrivileged({ t: 'poker', cmd: { t: 'vote.seal', round: 'r1', sealed: sealed() } })).toBe(false)
  })

  it('ignores a round, a reveal and a setting from a participant', () => {
    const l = play([join(ALICE, 'Ann')])
    expect(foldEvent(l, start('r1', ALICE))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    // The reducer says no by itself, whoever calls it.
    for (const cmd of [{ t: 'round.start', round: 'r1', pub: PUB }, { t: 'settings.update', autoReveal: true }, { t: 'round.reveal', round: 'r1', key: REVEAL }] as const) expect(reducePoker(emptyPoker(), cmd, { key: ALICE, moderator: false })).toEqual({ ok: false })
    expect(reducePoker(emptyPoker(), { t: 'seat.join', name: 'Ann' }, { key: ALICE, moderator: false }).ok).toBe(true)
    expect(foldEvent(l, poker(ALICE, { t: 'settings.update', autoReveal: true }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    const open = play([start(), vote(ALICE)], l)
    expect(foldEvent(open, reveal('r1', ALICE))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })
})

describe('seats', () => {
  it('seat in log order; a name is trimmed and cut, a second join renames', () => {
    const l = play([join(ALICE, '  Ann  '), join(BOB, 'B'.repeat(60)), join(ALICE, 'Anna')])
    expect(state(l).seats).toEqual([{ key: ALICE, name: 'Anna', voter: true }, { key: BOB, name: 'B'.repeat(24), voter: true }])
  })

  it('says why a command is ignored', () => {
    expect(foldEvent(room(), vote(ALICE))).toMatchObject({ ok: false, reason: 'invalid' })
    expect(emptyPoker()).toMatchObject({ autoReveal: false, seats: [], rounds: [], deck: DEFAULT_DECK })
  })

  it('ignores an empty name', () => {
    expect(foldEvent(room(), join(ALICE, '   '))).toMatchObject({ ok: false })
    expect(reducePoker(emptyPoker(), { t: 'seat.join', name: 3 as unknown as string }, { key: ALICE, moderator: false })).toEqual({ ok: false })
  })

  it('the first 20 seats vote, later ones watch, and the seats stop at the connection cap', () => {
    const keys = Array.from({ length: MAX_SEATS + 1 }, (_, i) => key(String.fromCharCode(65 + i), 43))
    let l = room()
    for (const [i, k] of keys.entries()) l = foldEvent(l, ev(k, { t: 'poker', cmd: { t: 'seat.join', name: `P${i}` } })).ledger
    const seats = state(l).seats
    expect(seats).toHaveLength(MAX_SEATS)
    expect(seats.filter((s) => s.voter)).toHaveLength(VOTER_CAP)
    expect(seats[VOTER_CAP - 1]!.voter).toBe(true)
    expect(seats[VOTER_CAP]!.voter).toBe(false)
    // The 21st voter's card does not count, its seat stays.
    const withRound = foldAll(foldEvent(l, start()).ledger, [vote(keys[VOTER_CAP]!), vote(keys[0]!)])
    expect(Object.keys(state(withRound).rounds[0]!.ballots)).toEqual([keys[0]])
  })

  it('a renamed seat keeps its place and its role after the cap is reached', () => {
    const keys = Array.from({ length: VOTER_CAP + 1 }, (_, i) => key(String.fromCharCode(65 + i), 43))
    let l = room()
    for (const k of keys) l = foldEvent(l, ev(k, { t: 'poker', cmd: { t: 'seat.join', name: 'p' } })).ledger
    l = foldEvent(l, ev(keys[VOTER_CAP]!, { t: 'poker', cmd: { t: 'seat.join', name: 'later' } })).ledger
    expect(state(l).seats[VOTER_CAP]).toEqual({ key: keys[VOTER_CAP], name: 'later', voter: false })
  })
})

describe('settings and decks', () => {
  it('validates a deck: 2 to 24 different cards of 1 to 6 characters', () => {
    expect(isValidDeck(DEFAULT_DECK)).toBe(true)
    expect(isValidDeck(['S', 'M'])).toBe(true)
    expect(isValidDeck(['☕', 'XXL', '123456'])).toBe(true)
    for (const bad of [[], ['1'], ['1', '1'], ['1', ''], ['1', ' 2'], ['1', '1234567'], ['1', 'a,b'], ['1', 'a\nb'], ['1', 2], 'x', null, Array.from({ length: 25 }, (_, i) => `c${i}`)]) {
      expect(isValidDeck(bad)).toBe(false)
    }
    expect(isValidDeck(Array.from({ length: 24 }, (_, i) => `c${i}`))).toBe(true)
  })

  it('the moderator sets the deck and the next round freezes it; a bad deck or flag is ignored', () => {
    const l = play([poker(FAC, { t: 'settings.update', deck: ['S', 'M', 'L'] }), start('r1'), poker(FAC, { t: 'settings.update', deck: ['1', '2'], autoReveal: true }), start('r2')])
    expect(state(l).rounds.map((r) => r.deck)).toEqual([['S', 'M', 'L'], ['1', '2']])
    expect(state(l).autoReveal).toBe(true)
    expect(foldEvent(room(), poker(FAC, { t: 'settings.update', deck: ['1', '1'] })).ok).toBe(false)
    expect(foldEvent(room(), poker(FAC, { t: 'settings.update', autoReveal: 'yes' as unknown as boolean })).ok).toBe(false)
    expect(state(foldEvent(room(), poker(FAC, { t: 'settings.update' })).ledger).deck).toEqual(DEFAULT_DECK)
  })
})

describe('rounds', () => {
  it('opens a round with its key and deck, once per id, up to the cap', () => {
    const l = play([start('r1'), start('r1'), start('r2')])
    expect(state(l).rounds.map((r) => [r.id, r.opener, r.pub, r.revealKey, r.revote])).toEqual([['r1', FAC, PUB, null, false], ['r2', FAC, PUB, null, false]])
    // A re-vote says so, except for the first round, which has nothing to vote again on.
    const again = play([poker(FAC, { t: 'round.start', round: 'r1', pub: PUB, revote: true }), poker(FAC, { t: 'round.start', round: 'r2', pub: PUB, revote: true }), poker(FAC, { t: 'round.start', round: 'r3', pub: PUB, revote: false })])
    expect(state(again).rounds.map((r) => r.revote)).toEqual([false, true, false])
    expect(foldEvent(room(), poker(FAC, { t: 'round.start', round: 'r1', pub: PUB, revote: 'yes' as unknown as boolean })).ok).toBe(false)
    expect(foldEvent(room(), start('bad id')).ok).toBe(false)
    expect(foldEvent(room(), poker(FAC, { t: 'round.start', round: 'r1', pub: 'short' })).ok).toBe(false)
    let many = room()
    for (let i = 0; i < MAX_ROUNDS + 5; i++) many = foldEvent(many, start(`r${i}`)).ledger
    expect(state(many).rounds).toHaveLength(MAX_ROUNDS)
  })

  it('one card per voter: the last card replaces the earlier one, only in the current round, only from a voter', () => {
    const l = play([join(ALICE, 'Ann'), join(BOB, 'Bob'), start('r1'), vote(ALICE, 'r1', sealed('a')), vote(ALICE, 'r1', sealed('b')), vote(BOB, 'r1', sealed('c'))])
    expect(state(l).rounds[0]!.ballots).toEqual({ [ALICE]: sealed('b'), [BOB]: sealed('c') })
    expect(foldEvent(l, vote(ALICE, 'r0')).ok).toBe(false)
    expect(foldEvent(l, vote(key('z'), 'r1')).ok).toBe(false)
    expect(foldEvent(l, poker(ALICE, { t: 'vote.seal', round: 'r1', sealed: 'tiny' })).ok).toBe(false)
    expect(foldEvent(play([join(ALICE, 'Ann')]), vote(ALICE)).ok).toBe(false)
    const next = foldAll(l, [start('r2')])
    expect(foldEvent(next, vote(ALICE, 'r1')).ok).toBe(false)
    expect(foldEvent(next, vote(ALICE, 'r2')).ok).toBe(true)
  })

  it('reveals with the key of the opener, once; a late change is refused after it', () => {
    const l = play([join(ALICE, 'Ann'), start(), vote(ALICE), reveal()])
    expect(state(l).rounds[0]!.revealKey).toBe(REVEAL)
    expect(foldEvent(l, vote(ALICE, 'r1', sealed('z')))).toMatchObject({ ok: false })
    expect(foldEvent(l, reveal())).toMatchObject({ ok: false })
    expect(state(l).rounds[0]!.ballots[ALICE]).toBe(sealed())
  })

  it('refuses a reveal of nothing, of another round, with a bad key, or by another moderator than the opener', () => {
    const open = play([join(ALICE, 'Ann'), start(), ev(FAC, { t: 'role.delegate', key: BOB })])
    expect(foldEvent(open, reveal()).ok).toBe(false)
    const voted = foldAll(open, [vote(ALICE)])
    expect(foldEvent(voted, reveal('r2')).ok).toBe(false)
    expect(foldEvent(voted, poker(FAC, { t: 'round.reveal', round: 'r1', key: 'bad' })).ok).toBe(false)
    expect(foldEvent(voted, reveal('r1', BOB)).ok).toBe(false)
    expect(foldEvent(room(), reveal()).ok).toBe(false)
  })

  it('with auto-reveal on, refuses the reveal until every voter has a card; observers are not waited for', () => {
    const keys = Array.from({ length: VOTER_CAP + 1 }, (_, i) => key(String.fromCharCode(65 + i), 43))
    let l = foldAll(room(), [poker(FAC, { t: 'settings.update', autoReveal: true }), ...keys.map((k) => join(k)), start()])
    for (const k of keys.slice(0, VOTER_CAP - 1)) l = foldEvent(l, vote(k)).ledger
    expect(foldEvent(l, reveal()).ok).toBe(false)
    l = foldEvent(l, vote(keys[VOTER_CAP - 1]!)).ledger
    expect(foldEvent(l, reveal()).ok).toBe(true)
  })

  it('replays to the same state on two replicas, whatever the cut', () => {
    const events = [join(ALICE, 'Ann'), join(BOB, 'Bob'), start(), vote(ALICE, 'r1', sealed('a')), vote(BOB, 'r1', sealed('b')), vote(BOB, 'r1', sealed('c')), reveal(), start('r2'), vote(ALICE, 'r2')]
    const all = [genesis('poker'), ...events]
    const a = foldAll(emptyLedger(roomId), all)
    const b = all.reduce((l, e) => foldEvent(l, e).ledger, emptyLedger(roomId))
    expect(state(b)).toEqual(state(a))
    expect(JSON.parse(JSON.stringify(state(a)))).toEqual(state(a))
    // Ignored events leave no trace: junk in between changes nothing.
    const noisy = foldAll(emptyLedger(roomId), [all[0]!, vote(key('z'), 'r9'), ...all.slice(1), vote(ALICE, 'r1')])
    expect(state(noisy)).toEqual(state(a))
  })
})

describe('the estimate of a round (poker-design-v2)', () => {
  const decide = (card: string, round = 'r1', author = FAC) => poker(author, { t: 'estimate.decide', round, card })
  const revealed = () => play([join(ALICE, 'Ann'), join(BOB, 'Bob'), start(), vote(ALICE), reveal()])
  const decidedOf = (l: Ledger) => state(l).rounds.map((r) => r.decided)

  it('is the moderator\'s alone: a voter\'s decision is ignored by every replica', () => {
    const l = revealed()
    expect(isPrivileged({ t: 'poker', cmd: { t: 'estimate.decide', round: 'r1', card: '5' } })).toBe(true)
    expect(foldEvent(l, decide('5', 'r1', ALICE))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, decide('5', 'r1', BOB)).ok).toBe(false)
    expect(foldEvent(l, decide('5', 'r1', key('z'))).ok).toBe(false)
    expect(decidedOf(l)).toEqual([null])
    expect(reducePoker(state(l), { t: 'estimate.decide', round: 'r1', card: '5' }, { key: ALICE, moderator: false }).ok).toBe(false)
  })

  it('keeps one card of the deck for a revealed round, once', () => {
    const l = foldAll(revealed(), [decide('5')])
    expect(decidedOf(l)).toEqual(['5'])
    // A second decision, even the same card, is ignored: it is once per round.
    expect(foldEvent(l, decide('8')).ok).toBe(false)
    expect(foldEvent(l, decide('5')).ok).toBe(false)
    expect(decidedOf(foldAll(l, [decide('8')]))).toEqual(['5'])
  })

  it('refuses a card that is not in the deck, an empty or a wrong-typed card', () => {
    const l = revealed()
    for (const card of ['4', '', '5 ', 'XL', '55555']) expect(foldEvent(l, decide(card)).ok, card).toBe(false)
    expect(foldEvent(l, decide(5 as unknown as string)).ok).toBe(false)
    expect(foldEvent(l, decide(null as unknown as string)).ok).toBe(false)
    // Every card of the deck is a card to decide, the question mark and the coffee included: the screen offers only the suggestion.
    for (const card of DEFAULT_DECK) expect(foldEvent(l, decide(card)).ok, card).toBe(true)
  })

  it('uses the deck the round froze, not the room\'s current one', () => {
    const l = play([join(ALICE, 'Ann'), poker(FAC, { t: 'settings.update', deck: ['S', 'M'] }), start('r1'), vote(ALICE), reveal(), poker(FAC, { t: 'settings.update', deck: ['1', '2'] })])
    expect(foldEvent(l, decide('S')).ok).toBe(true)
    expect(foldEvent(l, decide('1')).ok).toBe(false)
  })

  it('needs a revealed round: nothing to decide before the reveal, before any round, or in an older round', () => {
    const open = play([join(ALICE, 'Ann'), start(), vote(ALICE)])
    expect(foldEvent(open, decide('5')).ok).toBe(false)
    expect(foldEvent(room(), decide('5')).ok).toBe(false)
    const next = foldAll(revealed(), [start('r2')])
    expect(foldEvent(next, decide('5', 'r1')).ok).toBe(false)
    expect(foldEvent(next, decide('5', 'r2')).ok).toBe(false)
    expect(foldEvent(revealed(), decide('5', 'r2')).ok).toBe(false)
  })

  it('is cleared by the next round, and the older round keeps its estimate', () => {
    const l = foldAll(revealed(), [decide('8'), start('r2'), vote(ALICE, 'r2'), reveal('r2'), decide('3', 'r2')])
    expect(decidedOf(l)).toEqual(['8', '3'])
    const again = foldAll(revealed(), [decide('8'), start('r2')])
    expect(decidedOf(again)).toEqual(['8', null])
    expect(foldEvent(again, decide('5', 'r2')).ok).toBe(false)
  })

  it('replays to the same state on two replicas, in any cut, and junk in between leaves no trace', () => {
    const events = [join(ALICE, 'Ann'), start(), vote(ALICE), reveal(), decide('8'), decide('5'), decide('3', 'r1', ALICE), start('r2')]
    const all = [genesis('poker'), ...events]
    const a = foldAll(emptyLedger(roomId), all)
    const b = all.reduce((l, e) => foldEvent(l, e).ledger, emptyLedger(roomId))
    expect(state(b)).toEqual(state(a))
    expect(JSON.parse(JSON.stringify(state(a)))).toEqual(state(a))
    expect(decidedOf(a)).toEqual(['8', null])
    const noisy = foldAll(emptyLedger(roomId), [all[0]!, decide('5', 'r1', ALICE), ...all.slice(1)])
    expect(state(noisy)).toEqual(state(a))
  })
})

describe('an older client\'s card colour (poker-design-v2)', () => {
  it('is ignored: the deck and the flag of the same event count, the room has no colour of its own, and a bad value breaks nothing', () => {
    const events = [poker(FAC, { t: 'settings.update', deck: ['S', 'M'], hue: 140 }), poker(FAC, { t: 'settings.update', autoReveal: true, hue: 9 as number }), join(ALICE, 'Ann'), start()]
    const l = foldAll(room(), events)
    expect(state(l)).toMatchObject({ deck: ['S', 'M'], autoReveal: true })
    expect('hue' in state(l)).toBe(false)
    expect(state(events.reduce((x, e) => foldEvent(x, e).ledger, room()))).toEqual(state(l))
  })
})
