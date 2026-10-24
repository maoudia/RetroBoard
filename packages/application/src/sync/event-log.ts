/**
 * Replica of a board as an ordered log of verified events, folded through the domain.
 * Total order: (at, id). Appends fold incrementally. A late event re-folds from the nearest
 * checkpoint (a ledger kept every CHECKPOINT_EVERY events) instead of from the genesis.
 * Ledgers are immutable (the domain is copy-on-write), so checkpoints can share structure.
 */
import { emptyLedger, type FoldResult, foldEvent, type Ledger, type VerifiedEvent } from '@retroboard/domain'

export const CHECKPOINT_EVERY = 200

const before = (a: VerifiedEvent, b: VerifiedEvent) => a.at < b.at || (a.at === b.at && a.id < b.id)

export class EventLog<E extends VerifiedEvent = VerifiedEvent> {
  private readonly events: E[] = []
  private readonly ids = new Set<string>()
  /** checkpoints[k] = ledger after folding the first k * CHECKPOINT_EVERY events. */
  private readonly checkpoints: Ledger[]
  private current: Ledger

  constructor(readonly roomId: string) {
    this.current = emptyLedger(roomId)
    this.checkpoints = [this.current]
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
    let i = this.events.length
    while (i > 0 && before(e, this.events[i - 1]!)) i--
    this.events.splice(i, 0, e)
    if (i === this.events.length - 1) this.advance(this.current, i)
    else this.refoldFrom(i)
    return true
  }

  private refoldFrom(index: number): void {
    const k = Math.floor(index / CHECKPOINT_EVERY)
    this.checkpoints.length = k + 1
    this.advance(this.checkpoints[k]!, k * CHECKPOINT_EVERY)
  }

  /** Folds events[from..] onto `ledger`, recording checkpoints on the way. */
  private advance(ledger: Ledger, from: number): void {
    let l = ledger
    for (let i = from; i < this.events.length; i++) {
      l = foldEvent(l, this.events[i]!).ledger
      if ((i + 1) % CHECKPOINT_EVERY === 0) this.checkpoints[(i + 1) / CHECKPOINT_EVERY] = l
    }
    this.current = l
  }
}
