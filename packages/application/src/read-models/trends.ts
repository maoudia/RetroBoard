/**
 * Results trends (change results-trends): this retro against the previous ones of the same team, computed on the
 * device from the team history (the retros saved in the local workspace). Counts and a few words only; nothing
 * leaves the browser.
 */
import type { Snapshot } from '@retroboard/domain'
import { topKeywords } from './keywords'
import type { RetroStats, SavedAction, Workspace } from '../team/workspace'

export const MAX_COMPARED_RETROS = 3
const MAX_RECURRING = 5

export interface TrendLine { key: 'trends.participation.up' | 'trends.participation.down' | 'trends.participation.same' | 'trends.actions' | 'trends.recurring'; params: Record<string, string | number> }

export interface Trends {
  /** How many previous retros of the team were compared with. */
  previous: number
  /** People on this board against the latest previous retro that recorded it. */
  participation: { current: number; before: number; change: 'up' | 'down' | 'same' } | null
  /** Actions of the latest previous retro, and how many ended done (their newest known status). */
  actionsDone: { done: number; total: number; from: string } | null
  /** Words of this retro that already came back in a previous one. */
  recurring: string[]
  /** The sentences to show, as i18n keys with their numbers: the same for the results page, the report and the exports. */
  lines: TrendLine[]
}

export interface CurrentRetro { boardId: string; stats: RetroStats; actions: readonly Pick<SavedAction, 'text' | 'owner' | 'status'>[] }

const norm = (s: string) => s.trim().toLowerCase()
const actionKey = (a: Pick<SavedAction, 'text' | 'owner'>) => `${norm(a.text)}|${norm(a.owner)}`

/** What a retro keeps of itself for later comparisons: the people on the board and its few recurring words. */
export function retroStatsOf(s: Pick<Snapshot, 'notes' | 'peers'>): RetroStats {
  const named = new Set(s.notes.map((n) => n.author).filter((a) => a !== null))
  return { participants: Math.max(s.peers.length, named.size, 1), keywords: topKeywords(s.notes.map((n) => n.text), { limit: MAX_RECURRING }).map((k) => k.word) }
}

export function buildTrends(ws: Workspace, teamId: string, current: CurrentRetro): Trends | null {
  const history = ws.retros.filter((r) => r.teamId === teamId && r.boardId !== current.boardId).sort((a, b) => b.at - a.at)
  const compared = history.slice(0, MAX_COMPARED_RETROS)
  const last = compared[0]
  if (!last) return null

  const base = compared.find((r) => r.stats)?.stats
  const participation = base
    ? { current: current.stats.participants, before: base.participants, change: current.stats.participants > base.participants ? 'up' as const : current.stats.participants < base.participants ? 'down' as const : 'same' as const }
    : null

  // The newest known status of each action: oldest retro first, then this board.
  const status = new Map<string, string>()
  for (const r of [...history].reverse()) for (const a of r.actions) status.set(actionKey(a), a.status)
  for (const a of current.actions) status.set(actionKey(a), a.status)
  const actionsDone = last.actions.length ? { done: last.actions.filter((a) => status.get(actionKey(a)) === 'done').length, total: last.actions.length, from: last.title } : null

  // Stryker disable next-line ArrayDeclaration: a placeholder word in the empty case could only match a keyword of the same text
  const before = new Set(compared.flatMap((r) => r.stats?.keywords ?? []).map(norm))
  const recurring = current.stats.keywords.filter((w) => before.has(norm(w))).slice(0, MAX_RECURRING)

  if (!participation && !actionsDone && !recurring.length) return null
  return { previous: compared.length, participation, actionsDone, recurring, lines: linesOf(participation, actionsDone, recurring) }
}

function linesOf(participation: Trends['participation'], actionsDone: Trends['actionsDone'], recurring: string[]): TrendLine[] {
  const out: TrendLine[] = []
  if (participation) out.push({ key: `trends.participation.${participation.change}`, params: { current: participation.current, before: participation.before } })
  if (actionsDone) out.push({ key: 'trends.actions', params: { done: actionsDone.done, total: actionsDone.total, from: actionsDone.from } })
  if (recurring.length) out.push({ key: 'trends.recurring', params: { words: recurring.join(', ') } })
  return out
}
