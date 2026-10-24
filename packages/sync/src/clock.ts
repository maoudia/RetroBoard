/**
 * Hybrid logical clock (Kulkarni et al., 2014), in milliseconds: values stay close to wall time,
 * so the domain can use them as `now` (timers), yet they are strictly increasing per peer and
 * never behind any event the peer has seen. Ties across peers are broken by event id.
 */
export const MAX_DRIFT_MS = 60_000

export class HybridClock {
  private last = 0

  constructor(private readonly wall: () => number = Date.now) {}

  get current(): number { return this.last }

  /** Timestamp for a new local event. */
  tick(): number {
    this.last = Math.max(this.wall(), this.last + 1)
    return this.last
  }

  /**
   * Learns from a remote event. A peer whose clock runs far ahead cannot drag ours more than
   * MAX_DRIFT_MS past wall time (the event itself is still accepted: ordering stays deterministic).
   */
  receive(remote: number): void {
    const cap = this.wall() + MAX_DRIFT_MS
    this.last = Math.max(this.last, Math.min(remote, cap))
  }
}

/** Total order of events: (at, id). Every peer sorts the same set the same way. */
export const compareEvents = (a: { at: number; id: string }, b: { at: number; id: string }): number =>
  a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
