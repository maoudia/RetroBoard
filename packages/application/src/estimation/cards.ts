import type { Round } from '@retroboard/domain'

/** Port: opens the ballot of a voter with the key a reveal published; the deck index, or null when it does not open (wrong key, voter, room or round). */
export type CardOpener = (round: Round, voter: string, sealed: string) => Promise<number | null>

/** What a revealed round holds, as the room shows it. */
export interface OpenedRound {
  readonly round: string
  /** The card index of each voter that voted and whose ballot opened. */
  readonly picks: Readonly<Record<string, number>>
  /** Voters whose ballot did not open: a wrong key frozen the round, or a ballot that is not theirs. A new round repairs it. */
  readonly unreadable: readonly string[]
}

/** Every replica opens the ballots of a revealed round itself, with the key the reveal published. A round that is not revealed opens to nothing. */
export async function openRound(round: Round, open: CardOpener): Promise<OpenedRound> {
  const picks: Record<string, number> = {}
  const unreadable: string[] = []
  if (round.revealKey === null) return { round: round.id, picks, unreadable }
  for (const [voter, sealed] of Object.entries(round.ballots)) {
    const index = await open(round, voter, sealed)
    if (index === null || index >= round.deck.length) unreadable.push(voter)
    else picks[voter] = index
  }
  return { round: round.id, picks, unreadable }
}
