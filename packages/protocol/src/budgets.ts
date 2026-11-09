/**
 * Relay budgets (change solo-board-parity): what a relay accepts from one socket. The Durable Object and the
 * in-tab relay of a solo board both call checkFrame, so a frame is refused the same way in both.
 */
import { LIMITS } from '@retroboard/domain'
import { type ClientFrame, MAX_FRAME_BYTES, parseClientFrame } from './envelope'

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

export type FrameKind = 'board' | 'live' | 'sig'

/**
 * Whether a frame goes through. Board frames over budget close the socket (abuse);
 * live frames over budget are dropped silently so cursors can never cost a connection.
 */
export function admit(b: Budgets, kind: FrameKind, now: number, windowMs: number): 'ok' | 'drop' | 'close' {
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

/** WebSocket close codes and reasons the relay answers with. */
export const CLOSE_TOO_LARGE = { code: 1009, reason: 'Message too large' } as const
export const CLOSE_RATE_LIMIT = { code: 1008, reason: 'Rate limit' } as const

export type FrameCheck =
  | { verdict: 'ok'; frame: ClientFrame | null }
  | { verdict: 'drop' }
  | { verdict: 'close'; code: number; reason: string }

/** Size, parse and rate check of one raw message. `frame` is null when the message is not a client frame. */
export function checkFrame(b: Budgets, data: unknown, now: number, windowMs: number): FrameCheck {
  if (typeof data !== 'string' || data.length > MAX_FRAME_BYTES) return { verdict: 'close', ...CLOSE_TOO_LARGE }
  let raw: unknown
  try { raw = JSON.parse(data) } catch { /* not JSON: parses as no frame */ }
  const frame = parseClientFrame(raw)
  // Stryker disable next-line StringLiteral: admit treats every kind other than live and sig as a board frame
  const verdict = admit(b, frame?.t === 'eph' ? 'live' : frame?.t === 'sig' ? 'sig' : 'board', now, windowMs)
  if (verdict === 'drop') return { verdict }
  if (verdict === 'close') return { verdict, ...CLOSE_RATE_LIMIT }
  return { verdict, frame }
}
