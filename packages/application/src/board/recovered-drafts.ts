/**
 * Drafts recovered after an unpublish (change note-edit-and-unpublish), read from the signed event log: nothing is
 * stored or sent. The event carries no text, so the author's device reads the idea from the board as it was just
 * before the event (it wrote it, `ownerCid` is its own signing key) and gives it back as a draft.
 */
import { emptyLedger, foldEvent, type Ledger, type Peer, type VerifiedEvent } from '@retroboard/domain'

export interface RecoveredDraft {
  /** Id of the unpublish event: a draft is recovered once per event id. */
  eventId: string
  columnId: string
  text: string
  color: number
  /** Name of the facilitator who sent my idea back, when it was not me and they show a name; null for me or an anonymous facilitator. */
  by: string | null
  /** I sent it back myself: no notice. */
  byMe: boolean
}

/** My ideas that an unpublish event took off the board, oldest first. Refused, ignored and foreign unpublishes add nothing. */
export function recoveredDrafts(roomId: string, events: readonly VerifiedEvent[], me: string, from?: Ledger): RecoveredDraft[] {
  let ledger = from ?? emptyLedger(roomId)
  const out: RecoveredDraft[] = []
  for (const e of events) {
    const next = foldEvent(ledger, e)
    if (next.ok && e.body.t === 'cmd' && e.body.cmd.t === 'note.unpublish') {
      const n = ledger.board.notes[e.body.cmd.id]
      if (n && n.ownerCid === me) {
        out.push({ eventId: e.id, columnId: n.columnId, text: n.text, color: n.color, by: e.author !== me && e.body.showName && e.body.name ? e.body.name : null, byMe: e.author === me })
      }
    }
    ledger = next.ledger
  }
  return out
}

/** The drafts not recovered yet, so a replay, a second tab or a late join never adds one twice. */
export const unhandledDrafts = (all: readonly RecoveredDraft[], handled: ReadonlySet<string>): RecoveredDraft[] => all.filter((d) => !handled.has(d.eventId))

/**
 * Rolling update: a client that predates `note.unpublish` ignores it and keeps the idea on its board, so "Back to my
 * drafts" is offered only when every other person present announced the command (presence, a hint only).
 */
export const everyoneKnowsUnpublish = (peers: readonly Pick<Peer, 'me' | 'unpublish'>[]): boolean => peers.every((p) => p.me || p.unpublish === true)

export interface DraftLike { id: string; columnId: string; text: string; color: number }

/**
 * The draft stack with the recovered ideas on top, the newest first. A draft takes the id `rec-<event id>`, so two tabs
 * that both recover the same event and then merge their stacks end up with one draft.
 */
export function stackWithRecovered<D extends DraftLike>(drafts: readonly D[], fresh: readonly RecoveredDraft[]): (D | DraftLike)[] {
  const ids = new Set(fresh.map((d) => `rec-${d.eventId}`))
  const top = fresh.map((d) => ({ id: `rec-${d.eventId}`, columnId: d.columnId, text: d.text, color: d.color })).reverse()
  return [...top, ...drafts.filter((d) => !ids.has(d.id))]
}
