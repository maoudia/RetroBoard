import { agendaRunning, type Peer, type PhaseKind, type Snapshot } from '@retroboard/domain'
import { votingState } from '../read-models/voting-state'

export type ActivityKind = 'phase.started' | 'agenda.ended' | 'agenda.paused' | 'agenda.resumed' | 'voting.opened' | 'voting.closed' | 'reveal.started' | 'participant.joined' | 'participant.left'

export interface ActivityEvent {
  kind: ActivityKind
  at: number
  /** Phase concerned, for phase.started. */
  phase?: PhaseKind
  /** Display name, for participant.joined and participant.left (null: anonymous). */
  name?: string | null
}

export interface ActivityEntry extends ActivityEvent {
  id: number
}

export const ACTIVITY_MAX = 50

/** What changed between two snapshots that a participant may have missed. Pure: the caller stamps time. */
export function activityBetween(prev: Snapshot | null, next: Snapshot, at: number): ActivityEvent[] {
  if (!prev) return []
  const out: ActivityEvent[] = []
  const a = prev.agenda
  const b = next.agenda
  if (b && a && b.current !== a.current) {
    if (b.current >= b.phases.length) out.push({ kind: 'agenda.ended', at })
    else if (b.current >= 0 && agendaRunning(b)) out.push({ kind: 'phase.started', at, phase: b.phases[b.current]!.kind })
  } else if (a && b) {
    if (a.pausedAt === null && b.pausedAt !== null) out.push({ kind: 'agenda.paused', at })
    if (a.pausedAt !== null && b.pausedAt === null) out.push({ kind: 'agenda.resumed', at })
  }
  const before = votingState(prev)
  const after = votingState(next)
  if (before !== 'closed' && after === 'closed') out.push({ kind: 'voting.closed', at })
  else if (before === 'closed' && after !== 'closed') out.push({ kind: 'voting.opened', at })
  if (!prev.reveal && next.reveal) out.push({ kind: 'reveal.started', at })
  return out
}

/** The same participant across two lists: same session key, or same relay connection (the key arrives after the first presence frame). */
const same = (a: Peer, b: Peer): boolean => (!!a.key && a.key === b.key) || (!!a.conn && a.conn === b.conn)

/**
 * Who joined or left between two presence lists (change presence-status). Only named participants are announced (a joiner is
 * anonymous for a moment, before the name arrives), never me nor hidden ones; a reconnect with a new connection id is not a leave.
 * A null `prev` is the baseline: nobody is announced.
 */
export function presenceBetween(prev: readonly Peer[] | null, next: readonly Peer[], at: number): ActivityEvent[] {
  if (!prev) return []
  const others = (l: readonly Peer[]) => l.filter((p) => !p.me && !p.hidden)
  const before = others(prev)
  const after = others(next)
  const out: ActivityEvent[] = []
  for (const p of after) if (p.name && !before.some((q) => same(p, q) && q.name)) out.push({ kind: 'participant.joined', at, name: p.name })
  for (const p of before) if (p.name && !after.some((q) => same(p, q))) out.push({ kind: 'participant.left', at, name: p.name })
  return out
}

/** Newest first, capped. */
export function appendActivity(log: readonly ActivityEntry[], events: readonly ActivityEvent[], nextId: number, max = ACTIVITY_MAX): ActivityEntry[] {
  const added = events.map((e, i) => ({ ...e, id: nextId + i })).reverse()
  return [...added, ...log].slice(0, max)
}
