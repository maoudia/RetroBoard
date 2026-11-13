/** Pure pieces of the Node adapter's hardening: no socket, no timer, the clock is a parameter. */

/** A socket whose send buffer holds more than this has stopped reading: it is closed instead of queued for. */
export const MAX_BUFFERED_BYTES = 4 * 1024 * 1024

export const overBudget = (bufferedAmount: number, limit = MAX_BUFFERED_BYTES): boolean => bufferedAmount > limit

export interface IdlePolicy { pingMs: number; idleMs: number }
export const DEFAULT_IDLE: IdlePolicy = { pingMs: 30_000, idleMs: 75_000 }

/** What to do with a socket last heard from at `lastSeen`: let it be, ping it, or close it as silent. Any frame or pong counts as heard. */
export function idleAction(lastSeen: number, now: number, policy: IdlePolicy = DEFAULT_IDLE): 'ok' | 'ping' | 'close' {
  const quiet = now - lastSeen
  if (quiet >= policy.idleMs) return 'close'
  return quiet >= policy.pingMs ? 'ping' : 'ok'
}

export type Admission = 'ok' | 'full' | 'rate'

interface Entry { open: number; hits: number[] }

/**
 * Per-address connection cap and connect rate (the edge rules of ADR-0019 are an extra layer, not the only one).
 * Memory only. A limit of 0 turns that limit off. `admit` counts the attempt; `release` must follow when the socket ends or is never opened.
 */
export class AddressBook {
  private readonly entries = new Map<string, Entry>()

  constructor(
    private readonly maxOpen: number,
    private readonly maxPerWindow: number,
    private readonly windowMs = 60_000,
  ) {}

  admit(address: string, now: number): Admission {
    const entry = this.entries.get(address) ?? { open: 0, hits: [] }
    entry.hits = entry.hits.filter((t) => now - t < this.windowMs)
    this.entries.set(address, entry)
    if (this.maxOpen > 0 && entry.open >= this.maxOpen) return 'full'
    if (this.maxPerWindow > 0 && entry.hits.length >= this.maxPerWindow) return 'rate'
    entry.hits.push(now)
    entry.open++
    return 'ok'
  }

  release(address: string): void {
    const entry = this.entries.get(address)
    if (entry && entry.open > 0) entry.open--
  }

  /** Forget addresses with nothing open and no recent attempt. */
  sweep(now: number): void {
    for (const [address, entry] of this.entries) {
      if (entry.open === 0 && entry.hits.every((t) => now - t >= this.windowMs)) this.entries.delete(address)
    }
  }

  get size(): number {
    return this.entries.size
  }
}
