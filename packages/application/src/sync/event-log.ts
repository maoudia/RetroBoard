/**
 * Replica of a board as an ordered log of verified events, folded through the domain.
 * Total order: (at, id). Appends fold incrementally; a late event re-folds from scratch,
 * which is cheap at board sizes (checkpoints arrive with stateless-relay-and-replication).
 */
import { emptyLedger, type FoldResult, foldAll, foldEvent, type Ledger, type VerifiedEvent } from '@retroboard/domain'

const before = (a: VerifiedEvent, b: VerifiedEvent) => a.at < b.at || (a.at === b.at && a.id < b.id)

export class EventLog<E extends VerifiedEvent = VerifiedEvent> {
  private readonly events: E[] = []
  private readonly ids = new Set<string>()
  private current: Ledger

  constructor(readonly roomId: string) {
    this.current = emptyLedger(roomId)
  }

  get ledger(): Ledger { return this.current }
  get size(): number { return this.events.length }
  get lastAt(): number { return this.events.at(-1)?.at ?? 0 }
  has(id: string): boolean { return this.ids.has(id) }
  all(): readonly E[] { return this.events }

  /** What folding `e` now would do, without inserting it. Only meaningful for an event that sorts last. */
  preview(e: VerifiedEvent): FoldResult {
    return foldEvent(this.current, e)
  }

  /** Inserts an event in order. Returns false for duplicates. */
  insert(e: E): boolean {
    if (this.ids.has(e.id)) return false
    this.ids.add(e.id)
    const last = this.events.at(-1)
    if (!last || before(last, e)) {
      this.events.push(e)
      this.current = foldEvent(this.current, e).ledger
      return true
    }
    let i = this.events.length
    while (i > 0 && before(e, this.events[i - 1]!)) i--
    this.events.splice(i, 0, e)
    this.current = foldAll(emptyLedger(this.roomId), this.events)
    return true
  }
}
