/**
 * Protocol v2 relay logic, free of Cloudflare APIs so it is unit tested in Node.
 * Holds ciphertext envelopes in memory only (docs/PLAN.md 5.3): never storage.
 */
import { type Envelope, MAX_ENVELOPES_PER_MESSAGE, MAX_FRAME_BYTES, RELAY_BUFFER, RELAY_BUFFER_BYTES, type RelayFrame } from '@retroboard/protocol'

export class EnvelopeBuffer {
  private readonly byId = new Map<string, { env: Envelope; size: number }>()
  private bytes = 0

  constructor(private readonly maxCount = RELAY_BUFFER, private readonly maxBytes = RELAY_BUFFER_BYTES) {}

  get size(): number { return this.byId.size }

  /** Adds unseen envelopes, evicting the oldest past the budget. Returns the new ones. */
  add(envs: readonly Envelope[]): Envelope[] {
    const fresh: Envelope[] = []
    for (const env of envs) {
      if (this.byId.has(env.id)) continue
      const size = env.ct.length + env.id.length + 64
      this.byId.set(env.id, { env, size })
      this.bytes += size
      fresh.push(env)
    }
    for (const [id, entry] of this.byId) {
      if (this.byId.size <= this.maxCount && this.bytes <= this.maxBytes) break
      this.byId.delete(id)
      this.bytes -= entry.size
    }
    return fresh
  }

  /** History frames in arrival order, each under the frame and count limits. */
  history(): RelayFrame[] {
    const pages = chunk([...this.byId.values()].map((e) => e.env))
    if (pages.length === 0) return [{ t: 'hist', envs: [], done: true }]
    return pages.map((envs, i) => ({ t: 'hist', envs, done: i === pages.length - 1 }))
  }
}

/** Splits envelopes into pages that fit one frame. */
export function chunk(envs: readonly Envelope[], maxBytes = MAX_FRAME_BYTES - 1024): Envelope[][] {
  const pages: Envelope[][] = []
  let page: Envelope[] = []
  let bytes = 0
  for (const env of envs) {
    const size = env.ct.length + 128
    if (page.length && (page.length >= MAX_ENVELOPES_PER_MESSAGE || bytes + size > maxBytes)) { pages.push(page); page = []; bytes = 0 }
    page.push(env)
    bytes += size
  }
  if (page.length) pages.push(page)
  return pages
}

/** Sliding window rate limit, stored in the socket attachment. */
export interface RateWindow { windowStart: number; count: number }
export function allow(w: RateWindow, now: number, max: number, windowMs: number): boolean {
  if (now - w.windowStart > windowMs) { w.windowStart = now; w.count = 0 }
  return ++w.count <= max
}
