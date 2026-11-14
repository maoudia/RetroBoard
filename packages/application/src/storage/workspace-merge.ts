/**
 * Merging two copies of the team workspace (change user-drive-storage): teams by id, last write wins; saved retros by
 * board id, the newest saved wins; owners as a union. Pure, and independent of argument order and grouping.
 */
import { type Stamped, mergeStamped } from './stamp'
import { MAX_RETROS_PER_TEAM, type SavedRetro, type Team, type Workspace } from '../team/workspace'

/** The synced form of a workspace: each team carries the stamp of its last edit, the rest has its own time or none. */
export interface WorkspaceDoc {
  readonly teams: Readonly<Record<string, Stamped<Team>>>
  readonly retros: readonly SavedRetro[]
  readonly owners: readonly string[]
}

export const EMPTY_WORKSPACE_DOC: WorkspaceDoc = { teams: {}, retros: [], owners: [] }
const MAX_OWNERS = 40

const same = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' }) === 0
/** The newer save wins; an exact tie goes to the one that sorts higher, so both devices pick the same. */
function newer(a: SavedRetro, b: SavedRetro): SavedRetro {
  // Stryker disable next-line EqualityOperator: the times differ on this line, so `>` and `>=` give the same answer
  if (a.at !== b.at) return a.at > b.at ? a : b
  // Stryker disable next-line EqualityOperator: on identical text either side is the same value, so `>` and `>=` give the same retro
  return JSON.stringify(a) >= JSON.stringify(b) ? a : b
}

/** Newest first, then by board id so both devices list the same order. */
function byRecency(x: SavedRetro, y: SavedRetro): number {
  // Stryker disable next-line EqualityOperator: board ids are unique keys here, two equal ones are never compared
  return y.at - x.at || (x.boardId < y.boardId ? -1 : 1)
}

/** Names that differ only in how they are written (composed or decomposed accents) still sort the same way on both sides. */
function byName(x: string, y: string): number {
  // Stryker disable next-line EqualityOperator: when the texts differ `<` and `<=` agree, and equal texts are the same value
  return x.localeCompare(y, 'en') || (x < y ? -1 : 1)
}

/** Teams in the order this device has them; the ones it did not have come last, by id. */
function byLocalOrder(order: ReadonlyMap<string, number>) {
  return (x: Team, y: Team): number => {
    // Stryker disable next-line EqualityOperator: team ids are unique keys here, two equal ones are never compared
    return (order.get(x.id) ?? Infinity) - (order.get(y.id) ?? Infinity) || (x.id < y.id ? -1 : 1)
  }
}

export function mergeWorkspace(a: WorkspaceDoc, b: WorkspaceDoc): WorkspaceDoc {
  const byBoard = new Map<string, SavedRetro>()
  for (const r of [...a.retros, ...b.retros]) {
    const mine = byBoard.get(r.boardId)
    byBoard.set(r.boardId, mine ? newer(mine, r) : r)
  }
  // The newest per team, as `saveRetro` keeps them: the cap of the union equals the union of the caps.
  const retros = [...byBoard.values()].sort(byRecency)
  const perTeam = new Map<string, number>()
  const kept = retros.filter((r) => { const n = (perTeam.get(r.teamId) ?? 0) + 1; perTeam.set(r.teamId, n); return n <= MAX_RETROS_PER_TEAM })
  const owners: string[] = []
  for (const o of [...a.owners, ...b.owners].sort(byName)) if (!owners.some((x) => same(x, o))) owners.push(o)
  return { teams: mergeStamped(a.teams, b.teams), retros: kept, owners: owners.slice(0, MAX_OWNERS) }
}

/** The synced view of a local workspace; teams that were never stamped get `fallback`. */
export function toWorkspaceDoc(ws: Workspace, stamps: Readonly<Record<string, Stamped<Team>['stamp']>>, fallback: Stamped<Team>['stamp']): WorkspaceDoc {
  return {
    teams: Object.fromEntries(ws.teams.map((t) => [t.id, { value: t, stamp: Object.hasOwn(stamps, t.id) ? stamps[t.id]! : fallback }])),
    retros: ws.retros,
    owners: ws.owners,
  }
}

/** Puts a merged document into a local workspace, keeping what stays on this device (last team, board assignments). */
export function applyWorkspaceDoc(ws: Workspace, doc: WorkspaceDoc): Workspace {
  const order = new Map(ws.teams.map((t, i) => [t.id, i]))
  const teams = Object.values(doc.teams).map((s) => s.value).sort(byLocalOrder(order))
  return { ...ws, teams, retros: [...doc.retros], owners: [...doc.owners], lastTeamId: teams.some((t) => t.id === ws.lastTeamId) ? ws.lastTeamId : (teams[0]?.id ?? null) }
}
