/**
 * The state of a poker room and its reducer (change scrum-poker, ADR-0042). Pure and deterministic: every replica that folds the same
 * events reaches the same state, and an event that breaks a rule is ignored, silently, by all of them. The estimation context imports
 * nothing from the board contexts except the key and sealed-ballot shapes of the access context.
 *
 * A vote is a sealed card: the voter seals the card to the key of the round, the reveal publishes the private half of that key. The fold
 * never sees a card, only who has voted. The pure fold cannot check that the published key matches the round key (no crypto in the
 * domain); the application read model flags a wrong key and a new round repairs it.
 */
import { KEY_RE } from '../access/keyring'
import { LIMITS } from '../shared/limits'
import { SEALED_RE } from '../voting/sealed'

/** Voters per room (ADR-0042, finding 3): the 21st seat is an observer. The relay allows 30 connections, observers share the other 10. */
export const VOTER_CAP = 20
/** Seats of every kind: the relay's connection cap. A seat beyond it is ignored. */
export const MAX_SEATS = LIMITS.maxConnections
/** Rounds kept in a room: bounds the state and the replay. */
export const MAX_ROUNDS = 200
/** Cards of a deck, and code points of a card. A card travels as its index (two digits). */
export const DECK_MIN = 2
export const DECK_MAX = 24
export const CARD_MAX = 6
export const ROUND_ID_RE = /^[A-Za-z0-9_-]{1,16}$/

/** The hues a room's card backs can take: the eight of the profile's avatar picker. No hue means the colours of the theme. */
export const CARD_HUES = [8, 32, 52, 140, 175, 210, 260, 320] as const
const isCardHue = (hue: unknown): hue is (typeof CARD_HUES)[number] => (CARD_HUES as readonly unknown[]).includes(hue)

/** The deck of a room before anyone chooses one. */
export const DEFAULT_DECK: readonly string[] = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕']

export type PokerCommand =
  | { readonly t: 'seat.join'; readonly name: string }
  | { readonly t: 'settings.update'; readonly deck?: readonly string[]; readonly autoReveal?: boolean; readonly hue?: number }
  /** `revote`: the round votes again on the same item as the one before it. */
  | { readonly t: 'round.start'; readonly round: string; readonly pub: string; readonly revote?: boolean }
  | { readonly t: 'vote.seal'; readonly round: string; readonly sealed: string }
  | { readonly t: 'round.reveal'; readonly round: string; readonly key: string }
  /** The moderator's estimate of a revealed round: one card of the deck, once per round (change poker-design-v2, "Use 5"). */
  | { readonly t: 'estimate.decide'; readonly round: string; readonly card: string }

export type PokerCommandType = PokerCommand['t']

/** Moderator commands; seating and voting are open to everyone. */
export const POKER_PRIVILEGED: ReadonlySet<PokerCommandType> = new Set<PokerCommandType>(['settings.update', 'round.start', 'round.reveal', 'estimate.decide'])

export interface Seat {
  readonly key: string
  readonly name: string
  /** One of the first VOTER_CAP seats in log order. A later seat watches. */
  readonly voter: boolean
}

export interface Round {
  readonly id: string
  /** Device that opened the round: it holds the round key and alone can reveal it. */
  readonly opener: string
  /** Public half of the round key, base64url. */
  readonly pub: string
  /** The round votes again on what the round before it voted on. */
  readonly revote: boolean
  /** The deck of the round, frozen when it opened. */
  readonly deck: readonly string[]
  /** The sealed card of each voter, by key. The last card of a voter replaces the earlier one. */
  readonly ballots: Readonly<Record<string, string>>
  /** Private half of the round key, published at the reveal; its presence is what "revealed" means. */
  readonly revealKey: string | null
  /** The card the moderator kept as the estimate of the revealed round, or null: the next round starts without one. */
  readonly decided: string | null
}

export interface PokerState {
  readonly seats: readonly Seat[]
  readonly deck: readonly string[]
  readonly autoReveal: boolean
  /** The hue of the card backs of the room, one of CARD_HUES, or null for the colours of the theme (change poker-design-v2). */
  readonly hue: number | null
  readonly rounds: readonly Round[]
}

export const emptyPoker = (): PokerState => ({ seats: [], deck: DEFAULT_DECK, autoReveal: false, hue: null, rounds: [] })

/** Who signed the event and whether the ledger lets them steer the room. */
export interface PokerActor { readonly key: string; readonly moderator: boolean }

export type PokerReduce = { readonly ok: true; readonly state: PokerState } | { readonly ok: false }

const no: PokerReduce = { ok: false }
const yes = (state: PokerState): PokerReduce => ({ ok: true, state })

const cardLength = (card: string): number => [...card].length

/** A deck of 2 to 24 different cards of 1 to 6 characters, with no comma, no control character and no padding space. */
export function isValidDeck(deck: unknown): deck is readonly string[] {
  if (!Array.isArray(deck) || deck.length < DECK_MIN || deck.length > DECK_MAX) return false
  const seen = new Set<string>()
  for (const card of deck as unknown[]) {
    if (typeof card !== 'string' || card !== card.trim() || !card || cardLength(card) > CARD_MAX) return false
    // eslint-disable-next-line no-control-regex -- control characters are exactly what a card must not hold
    if (/[,\u0000-\u001f\u007f]/.test(card) || seen.has(card)) return false
    seen.add(card)
  }
  return true
}

const current = (s: PokerState): Round | undefined => s.rounds[s.rounds.length - 1]
const replaceCurrent = (s: PokerState, round: Round): PokerState => ({ ...s, rounds: [...s.rounds.slice(0, -1), round] })

/** Voters who have not sealed a card in this round yet: what the auto-reveal waits for. */
const everyoneVoted = (s: PokerState, round: Round): boolean => s.seats.every((seat) => !seat.voter || seat.key in round.ballots)

export function reducePoker(s: PokerState, cmd: PokerCommand, actor: PokerActor): PokerReduce {
  if (POKER_PRIVILEGED.has(cmd.t) && !actor.moderator) return no
  switch (cmd.t) {
    case 'seat.join': {
      const name = typeof cmd.name === 'string' ? cmd.name.trim().slice(0, LIMITS.displayName) : ''
      if (!name) return no
      const known = s.seats.some((seat) => seat.key === actor.key)
      if (!known && s.seats.length >= MAX_SEATS) return no
      if (known) return yes({ ...s, seats: s.seats.map((seat) => (seat.key === actor.key ? { ...seat, name } : seat)) })
      // The voters are always the first seats in log order, so the room has a free voter seat while it has fewer seats than the cap.
      return yes({ ...s, seats: [...s.seats, { key: actor.key, name, voter: s.seats.length < VOTER_CAP }] })
    }
    case 'settings.update': {
      if (cmd.deck !== undefined && !isValidDeck(cmd.deck)) return no
      if (cmd.autoReveal !== undefined && typeof cmd.autoReveal !== 'boolean') return no
      if (cmd.hue !== undefined && !isCardHue(cmd.hue)) return no
      return yes({ ...s, deck: cmd.deck ?? s.deck, autoReveal: cmd.autoReveal ?? s.autoReveal, hue: cmd.hue ?? s.hue })
    }
    case 'round.start': {
      if (cmd.revote !== undefined && typeof cmd.revote !== 'boolean') return no
      if (!ROUND_ID_RE.test(cmd.round) || !KEY_RE.test(cmd.pub) || s.rounds.length >= MAX_ROUNDS || s.rounds.some((r) => r.id === cmd.round)) return no
      return yes({ ...s, rounds: [...s.rounds, { id: cmd.round, opener: actor.key, pub: cmd.pub, revote: cmd.revote === true && s.rounds.length > 0, deck: s.deck, ballots: {}, revealKey: null, decided: null }] })
    }
    case 'vote.seal': {
      // Nothing counts after the reveal, for an older round, from an observer or from a stranger.
      const round = current(s)
      if (!round || round.revealKey !== null || cmd.round !== round.id || !SEALED_RE.test(cmd.sealed)) return no
      if (!s.seats.some((seat) => seat.key === actor.key && seat.voter)) return no
      return yes(replaceCurrent(s, { ...round, ballots: { ...round.ballots, [actor.key]: cmd.sealed } }))
    }
    case 'round.reveal': {
      const round = current(s)
      if (!round || round.revealKey !== null || cmd.round !== round.id || !KEY_RE.test(cmd.key)) return no
      // The round key is the opener's: nobody else can have the private half, so nobody else reveals.
      if (round.opener !== actor.key || Object.keys(round.ballots).length === 0) return no
      if (s.autoReveal && !everyoneVoted(s, round)) return no
      return yes(replaceCurrent(s, { ...round, revealKey: cmd.key }))
    }
    case 'estimate.decide': {
      // Only a revealed round that has no estimate yet, only for a card of its deck: a second decision, an older round and a stranger's card are ignored.
      const round = current(s)
      if (!round || round.revealKey === null || round.decided !== null || cmd.round !== round.id || !round.deck.includes(cmd.card)) return no
      return yes(replaceCurrent(s, { ...round, decided: cmd.card }))
    }
  }
}

/** The round being played, or undefined before the first one. */
export const currentRound = current
