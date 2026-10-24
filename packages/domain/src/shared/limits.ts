/** Hard limits enforced by the domain (server side). The UI reads them to size inputs. */
export const LIMITS = {
  noteText: 280,
  columnTitle: 40,
  columnSubtitle: 90,
  groupTitle: 60,
  boardTitle: 60,
  actionText: 200,
  actionOwner: 40,
  displayName: 24,
  maxNotes: 300,
  maxActions: 100,
  /** Actions carried over in one import. */
  maxImport: 50,
  maxColumns: 8,
  maxBatch: 30,
  minVotes: 1,
  maxVotes: 20,
  maxConnections: 30,
  /** Messages per rate-limit window and per connection. */
  rateMax: 40,
  rateWindowMs: 10_000,
  maxMessageBytes: 16_384,
  /**
   * Replicated fold (encrypted boards): events per author beyond this, within the window of
   * event clocks, are ignored by every peer alike. Bounds a flooding participant.
   */
  foldRateMax: 60,
  foldRateWindowMs: 10_000,
  /** A board is erased after this much inactivity. */
  ttlMs: 24 * 60 * 60 * 1000,
  timerMinutes: [3, 5, 10, 15, 20, 30] as const,
} as const

export const NOTE_COLOR_COUNT = 8
export const DEFAULT_VOTE_LIMIT = 3
export const DEFAULT_TIMER_MS = 5 * 60_000
