/**
 * Phase availability (change phase-availability-cues): for a command that phase rules can close
 * (writing, voting, actions, grouping), is it open now, why not, and when does it open again.
 * Pure function of the agenda; the UI turns the answer into one consistent "closed" cue.
 */
import { type AgendaState, agendaRunning, type CommandType, type PhaseKind, phaseAllows } from '@retroboard/domain'

export interface Availability {
  /** The control can be used by this person right now. */
  allowed: boolean
  /** Allowed only because the person bypasses phase rules (facilitator): others are blocked. */
  bypassed: boolean
  /** Phase that closes it (when closed or bypassed). */
  closedBy: PhaseKind | null
  /** Next phase that opens it, null when no later phase does. */
  opensAt: PhaseKind | null
}

const OPEN: Availability = { allowed: true, bypassed: false, closedBy: null, opensAt: null }

export function phaseAvailability(agenda: AgendaState | null, command: CommandType, bypassesRules: boolean): Availability {
  if (!agendaRunning(agenda) || !agenda.rules) return OPEN
  const here = agenda.phases[agenda.current]!.kind
  if (phaseAllows(here, command)) return OPEN
  const next = agenda.phases.slice(agenda.current + 1).find((p) => phaseAllows(p.kind, command))
  return { allowed: bypassesRules, bypassed: bypassesRules, closedBy: here, opensAt: next?.kind ?? null }
}
