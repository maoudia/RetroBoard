/**
 * Replica of a board as an ordered log of verified events, folded through the domain.
 * Total order: (at, id). Appends fold incrementally. A late event re-folds from the nearest
 * checkpoint (a ledger kept every CHECKPOINT_EVERY events) instead of from the genesis.
 * Ledgers are immutable (the domain is copy-on-write), so checkpoints can share structure.
 *
 * A log may start from a verified snapshot (ADR-0037): `base` is the ledger folded up to a cut of the total order and the ids of
 * the events it covers. Covered events are known but not held, `all()` returns the events held (after the cut), and an event
 * that sorts before the cut without being covered cannot be folded onto the base: it is set aside in `horizonMisses`, and the
 * owner of the log replaces it by a full log.
 */
import { emptyLedger, type FoldResult, foldEvent, type Ledger, type VerifiedEvent } from '@retroboard/domain'

export const CHECKPOINT_EVERY = 200

/** Where a snapshot cuts the total order: events up to and including (at, id) are folded into the base ledger. */
export interface Cut { readonly at: number; readonly id: string }

export interface LogBase {
  readonly ledger: Ledger
  readonly cut: Cut
  /** Ids of every event folded into `ledger`. */
  readonly ids: readonly string[]
}

/** A ledger checkpoint of a full log, ready to be signed as a snapshot. */
export interface LogCheckpoint {
  readonly cut: Cut
  readonly ledger: Ledger
  readonly ids: string[]
}

// Stryker disable next-line EqualityOperator: two events never share an id (duplicates are refused), so <= and < agree
const before = (a: VerifiedEvent, b: VerifiedEvent) => a.at < b.at || (a.at === b.at && a.id < b.id)

export class EventLog<E extends VerifiedEvent = VerifiedEvent> {
  private readonly events: E[] = []
  private readonly ids = new Set<string>()
  /** checkpoints[k] = ledger after folding the first k * CHECKPOINT_EVERY events. */
  private readonly checkpoints: Ledger[]
  private current: Ledger
  private readonly covered: ReadonlySet<string>
  private readonly misses: E[] = []

  constructor(readonly roomId: string, readonly base: LogBase | null = null) {
    this.current = base ? base.ledger : emptyLedger(roomId)
    this.covered = new Set(base?.ids)
    this.checkpoints = [this.current]
  }

  get ledger(): Ledger { return this.current }
  /** Events the log accounts for: the ones it holds and the ones its base covers. */
  get size(): number { return this.covered.size + this.events.length }
  get lastAt(): number { return this.events.at(-1)?.at ?? this.base?.cut.at ?? 0 }
  has(id: string): boolean { return this.ids.has(id) || this.covered.has(id) }
  /** The events held, in total order: all of them without a base, the ones after the cut with one. */
  all(): readonly E[] { return this.events }
  /** Ids of the events held and of the events the base covers: what a peer need not send. */
  knownIds(): string[] { return [...this.covered, ...this.events.map((e) => e.id)] }
  /** Events that sort before the cut of the base without being covered by it (never folded). */
  get horizonMisses(): readonly E[] { return this.misses }

  /**
   * The last checkpoint of a log without a base whose newest event is not after `maxAt`, when it holds at least
   * `minNew` events more than `since`. Checkpoints are exactly the ledgers a snapshot may carry.
   */
  checkpointBefore(maxAt: number, since: number, minNew: number): LogCheckpoint | null {
    if (this.base || this.current.facilitatorKey === null) return null
    let count = Math.floor(this.events.length / CHECKPOINT_EVERY) * CHECKPOINT_EVERY
    // Stryker disable next-line EqualityOperator: events are sorted, a cut at exactly maxAt is as valid as one just before
    while (count > 0 && this.events[count - 1]!.at > maxAt) count -= CHECKPOINT_EVERY
    if (count <= 0 || count - since < minNew) return null
    const last = this.events[count - 1]!
    return { cut: { at: last.at, id: last.id }, ledger: this.checkpoints[count / CHECKPOINT_EVERY]!, ids: this.events.slice(0, count).map((e) => e.id) }
  }

  /** What folding `e` now would do, without inserting it. Only meaningful for an event that sorts last. */
  preview(e: VerifiedEvent): FoldResult {
    return foldEvent(this.current, e)
  }

  /** Inserts an event in order. Returns false for duplicates. */
  insert(e: E): boolean {
    if (this.has(e.id)) return false
    // Stryker disable next-line EqualityOperator: the id of the cut itself is covered, so it never reaches this line
    if (this.base && (e.at < this.base.cut.at || (e.at === this.base.cut.at && e.id < this.base.cut.id))) {
      if (!this.misses.some((m) => m.id === e.id)) this.misses.push(e)
      return false
    }
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
      // Stryker disable next-line ConditionalExpression: a stray fractional index on the array is never read
      if ((i + 1) % CHECKPOINT_EVERY === 0) this.checkpoints[(i + 1) / CHECKPOINT_EVERY] = l
    }
    this.current = l
  }
}
