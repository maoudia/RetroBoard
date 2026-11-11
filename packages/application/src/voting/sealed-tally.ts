import { ballotsOf, type BoardState, type OpenedBallot, tallyBallots, type VotableKind } from '@retroboard/domain'

/** Port: opens one sealed ballot of a voter with the ballot key; null when it does not open (wrong key, voter or room, tampering). */
export type BallotOpener = (voter: string, sealed: string) => Promise<{ kind: VotableKind; id: string } | null>

/**
 * The facilitator device's tally of a sealed ballot (change voting-v2-and-ranking): opens every ballot of the round in log order,
 * counts them under the board's policy and returns the `vote.reveal` command. Only the counts leave this function: the opened
 * choices stay in memory here and no voter is attached to them in the result.
 */
export async function sealedReveal(board: BoardState, open: BallotOpener): Promise<{ t: 'vote.reveal'; counts: ReturnType<typeof tallyBallots> }> {
  const opened: OpenedBallot[] = await Promise.all(ballotsOf(board).map(async (b) => ({ cid: b.cid, choice: await open(b.cid, b.sealed) })))
  return { t: 'vote.reveal', counts: tallyBallots(board, opened) }
}
