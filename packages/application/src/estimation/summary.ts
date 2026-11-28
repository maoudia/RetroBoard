/**
 * The session summary of a poker room (change scrum-poker, task 1.3): what the room estimated, the total and how many rounds each item took.
 * Pure. An item is a first round and the re-votes that follow it (`revote`); the estimate is the card the moderator kept on its last
 * revealed round. Each round arrives with its statistics (null while it is unrevealed), so the summary never opens a ballot itself.
 */
import { cardValue } from './statistics'

export interface SummaryRound {
  /** The round votes again on what the round before it voted on. */
  readonly revote: boolean
  /** The card kept as the estimate, or null. */
  readonly decided: string | null
  /** Share of the cards on the most chosen card (1 is unanimity), or null while the round is not revealed. */
  readonly consensus: number | null
}

export interface SummaryItem {
  /** 1-based position of the item in the session. */
  readonly index: number
  readonly rounds: number
  /** The estimate of the item: the card decided on its last decided round, or null. */
  readonly estimate: string | null
  /** Rounds it took to reach a unanimous round (1 is first time), or null when none was unanimous. */
  readonly roundsToConsensus: number | null
}

export interface SessionSummary {
  readonly items: readonly SummaryItem[]
  /** Items that have an estimate. */
  readonly estimated: number
  /** Sum of the numeric estimates (special cards and words count for nothing). */
  readonly total: number
  readonly rounds: number
}

export function sessionSummary(rounds: readonly SummaryRound[]): SessionSummary {
  const groups: SummaryRound[][] = []
  rounds.forEach((r, i) => {
    if (r.revote && i > 0) groups[groups.length - 1]!.push(r)
    else groups.push([r])
  })
  const items = groups.map((g, i): SummaryItem => {
    const decided = g.filter((r) => r.decided !== null)
    const unanimous = g.findIndex((r) => (r.consensus ?? 0) >= 1)
    return { index: i + 1, rounds: g.length, estimate: decided.length ? decided[decided.length - 1]!.decided : null, roundsToConsensus: unanimous === -1 ? null : unanimous + 1 }
  })
  const estimates = items.flatMap((it) => (it.estimate === null ? [] : [it.estimate]))
  const total = estimates.reduce((sum, card) => sum + (cardValue(card) ?? 0), 0)
  return { items, estimated: estimates.length, total, rounds: rounds.length }
}
