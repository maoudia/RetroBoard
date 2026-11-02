import { LIMITS } from '@retroboard/domain'
/**
 * Protocol v2 relay logic, free of Cloudflare APIs so it is unit tested in Node.
 * Holds ciphertext envelopes in memory only (docs/PLAN.md 5.3): never storage.
 */
import { chunk, EnvelopeBuffer } from '@retroboard/protocol'

// Moved to the protocol package (shared with solo boards); re-exported so relay code and tests keep their imports.
export { chunk, EnvelopeBuffer }

/** Sliding window rate limit, stored in the socket attachment. */
export interface RateWindow { windowStart: number; count: number }
export function allow(w: RateWindow, now: number, max: number, windowMs: number): boolean {
  if (now - w.windowStart > windowMs) { w.windowStart = now; w.count = 0 }
  return ++w.count <= max
}

/** Per-socket budgets: board frames, and live frames (presence, cursors, focus) on their own. */
export interface Budgets extends RateWindow { eph?: RateWindow; sig?: RateWindow }
/** v2 frames are batched, so the budget is in frames, not commands. */
export const FRAME_MAX = LIMITS.rateMax * 2
/** Cursors at 4 Hz plus focus and presence fit; excess live frames are dropped, never fatal. */
export const EPH_MAX = 60
/** WebRTC set-up: one offer or answer per link, a joiner on a full board sends up to 29 at once. */
export const SIG_MAX = 120

/**
 * Whether a frame goes through. Board frames over budget close the socket (abuse);
 * live frames over budget are dropped silently so cursors can never cost a connection.
 */
export function admit(b: Budgets, kind: 'board' | 'live' | 'sig', now: number, windowMs: number): 'ok' | 'drop' | 'close' {
  if (kind === 'live') {
    b.eph ??= { windowStart: now, count: 0 }
    return allow(b.eph, now, EPH_MAX, windowMs) ? 'ok' : 'drop'
  }
  if (kind === 'sig') {
    b.sig ??= { windowStart: now, count: 0 }
    return allow(b.sig, now, SIG_MAX, windowMs) ? 'ok' : 'drop'
  }
  return allow(b, now, FRAME_MAX, windowMs) ? 'ok' : 'close'
}
