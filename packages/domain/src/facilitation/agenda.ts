/**
 * Time-boxed agenda (change timeboxed-agenda): ordered phases with planned durations, a running
 * phase clock, and time borrowing. Pure: every replica computes the same times from event clocks.
 */
import type { CommandType } from '../shared/commands'

export const PHASE_KINDS = ['checkin', 'review', 'write', 'group', 'vote', 'rank', 'actions', 'close'] as const
export type PhaseKind = (typeof PHASE_KINDS)[number]

export interface Phase {
  id: string
  kind: PhaseKind
  plannedMs: number
  /** Time actually spent, pauses excluded; set when the phase is left (for the retro report). */
  actualMs?: number
}

/** The running phase with its actual time recorded (left by next or end). */
export function closePhase(a: AgendaState, now: number): Phase[] {
  if (a.current < 0 || a.current >= a.phases.length) return a.phases
  const spent = Math.max(0, (a.pausedAt ?? now) - a.startedAt)
  return a.phases.map((p, i) => (i === a.current ? { ...p, actualMs: spent } : p))
}

export interface AgendaState {
  phases: Phase[]
  /** -1 before the start, an index while running, phases.length once ended. */
  current: number
  /** When the current phase started, shifted forward by pauses. */
  startedAt: number
  /** Set while paused. */
  pausedAt: number | null
  /** Phase rules: participants may only do what the current phase is about. */
  rules: boolean
  /** Publish everyone's drafts when the Write phase ends. */
  autoPublish: boolean
  /** Facilitator override: voting is open outside the Vote phase. Cleared at the next phase change. */
  voteOpen?: boolean
}

/** The agenda without the voting override (every phase change drops it). */
export function withoutOverride(a: AgendaState): AgendaState {
  const { voteOpen: _gone, ...rest } = a
  return rest
}

export const MIN = 60_000
/** A phase never shrinks below this when time is borrowed from it. */
export const PHASE_FLOOR_MS = 60_000

/** Minutes per phase for each preset total (sums are exact). */
export const AGENDA_PRESETS: Record<30 | 45 | 60 | 90, Record<PhaseKind, number>> = {
  30: { checkin: 2, review: 3, write: 6, group: 4, vote: 3, rank: 2, actions: 7, close: 3 },
  45: { checkin: 3, review: 4, write: 8, group: 6, vote: 4, rank: 3, actions: 12, close: 5 },
  60: { checkin: 5, review: 5, write: 10, group: 8, vote: 5, rank: 5, actions: 15, close: 7 },
  90: { checkin: 7, review: 8, write: 15, group: 12, vote: 8, rank: 7, actions: 23, close: 10 },
}

export interface PhaseInput { kind: PhaseKind; minutes: number }

export const presetPhases = (total: keyof typeof AGENDA_PRESETS): PhaseInput[] =>
  PHASE_KINDS.map((kind) => ({ kind, minutes: AGENDA_PRESETS[total][kind] }))

export function newAgenda(phases: readonly PhaseInput[], newId: () => string, opts: { rules?: boolean; autoPublish?: boolean } = {}): AgendaState {
  return {
    phases: phases.map((p) => ({ id: newId(), kind: p.kind, plannedMs: Math.round(p.minutes * MIN) })),
    current: -1, startedAt: 0, pausedAt: null, rules: opts.rules ?? true, autoPublish: opts.autoPublish ?? true,
  }
}

export const agendaRunning = (a: AgendaState | null): a is AgendaState => !!a && a.current >= 0 && a.current < a.phases.length

export interface PhaseClock {
  index: number
  phase: Phase | null
  elapsedMs: number
  /** Negative in overtime. */
  remainingMs: number
  overtime: boolean
  paused: boolean
  totalPlannedMs: number
  /** Time really spent: the recorded time of the phases left behind plus the running one (a skipped phase adds what it really took, never its plan). */
  totalElapsedMs: number
}

export function phaseClock(a: AgendaState, now: number): PhaseClock {
  const totalPlannedMs = a.phases.reduce((n, p) => n + p.plannedMs, 0)
  const spent = a.phases.reduce((n, p) => n + (p.actualMs ?? 0), 0)
  const running = a.current >= 0 && a.current < a.phases.length
  if (!running) {
    const ended = a.current >= a.phases.length
    return { index: a.current, phase: null, elapsedMs: 0, remainingMs: 0, overtime: false, paused: false, totalPlannedMs, totalElapsedMs: ended ? spent : 0 }
  }
  const phase = a.phases[a.current]!
  const elapsedMs = Math.max(0, (a.pausedAt ?? now) - a.startedAt)
  const remainingMs = phase.plannedMs - elapsedMs
  return { index: a.current, phase, elapsedMs, remainingMs, overtime: remainingMs < 0, paused: a.pausedAt !== null, totalPlannedMs, totalElapsedMs: spent + elapsedMs }
}

/**
 * Extends the current phase by `deltaMs`. With `borrow`, the time is taken from later phases in
 * proportion to what each can give above the floor (whole seconds, deterministic); whatever
 * they cannot give extends the total.
 */
export function extendPhase(a: AgendaState, deltaMs: number, borrow: boolean): AgendaState {
  if (a.current < 0 || a.current >= a.phases.length) return a
  const phases = a.phases.map((p) => ({ ...p }))
  phases[a.current]!.plannedMs += deltaMs
  if (borrow) {
    const later = phases.slice(a.current + 1)
    const room = later.map((p) => Math.max(0, p.plannedMs - PHASE_FLOOR_MS))
    const available = room.reduce((n, r) => n + r, 0)
    const take = Math.min(deltaMs, available)
    if (take > 0) {
      const shares = room.map((r) => Math.floor((take * r) / available / 1000) * 1000)
      let rest = take - shares.reduce((n, s) => n + s, 0)
      // Rounding leftovers go to the phases with the most room, in order.
      for (const i of room.map((r, i) => [r, i] as const).sort((x, y) => y[0] - x[0] || x[1] - y[1]).map(([, i]) => i)) {
        if (rest <= 0) break
        const extra = Math.min(rest, room[i]! - shares[i]!)
        shares[i]! += extra
        rest -= extra
      }
      later.forEach((p, i) => { p.plannedMs -= shares[i]! })
    }
  }
  return { ...a, phases }
}

/** What each phase is about: participants may do these, facilitators may do anything. */
const PHASE_COMMANDS: Record<PhaseKind, readonly CommandType[]> = {
  checkin: [],
  review: ['action.status', 'action.update', 'action.toggle'],
  write: ['note.add', 'note.addMany', 'note.edit', 'note.delete', 'note.color'],
  // note.addMany: drafts auto-published when Write ends land at the start of Group.
  group: ['note.group', 'note.ungroup', 'note.move', 'group.rename', 'group.dissolve', 'group.merge', 'group.move', 'note.edit', 'note.color', 'note.addMany'],
  vote: ['vote.add', 'vote.remove', 'vote.toggle'],
  rank: ['action.add'],
  actions: ['action.add', 'action.update', 'action.status', 'action.toggle', 'action.delete'],
  close: ['roti.set'],
}

/** Does a phase of this kind allow a participant to run the command? */
export const phaseAllows = (kind: PhaseKind, command: CommandType): boolean => PHASE_COMMANDS[kind].includes(command)

/** Phase rules: is this command allowed for a participant right now? Always true without running rules. */
export function allowedInPhase(a: AgendaState | null, command: CommandType): boolean {
  if (!agendaRunning(a) || !a.rules) return true
  // Taking and giving back one's own speaking turn is never a phase matter.
  if (command === 'talk.self' || command === 'talk.done') return true
  if (a.voteOpen && (command === 'vote.add' || command === 'vote.remove' || command === 'vote.toggle')) return true
  return phaseAllows(a.phases[a.current]!.kind, command)
}
