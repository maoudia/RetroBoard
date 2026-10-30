/** Hard limits enforced by the domain (server side). The UI reads them to size inputs. */
export const LIMITS = {
  /** Hard cap of a note; the board setting `noteMaxLength` lowers it (NOTE_TEXT_MIN..noteText). */
  noteText: 500,
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
  /** Agenda: phases per board and minutes per phase. */
  maxPhases: 12,
  maxPhaseMinutes: 120,
} as const

export const NOTE_COLOR_COUNT = 8
export const DEFAULT_VOTE_LIMIT = 3
export const DEFAULT_TIMER_MS = 5 * 60_000

export const NOTE_TEXT_MIN = 40
/** Fallback for boards that never stored the setting (kept so existing boards do not change). */
export const DEFAULT_NOTE_MAX_LENGTH = 280
/** Note length of a new board (change composer-and-colour-v3): short ideas read better on the wall. */
export const NEW_BOARD_NOTE_MAX_LENGTH = 160
