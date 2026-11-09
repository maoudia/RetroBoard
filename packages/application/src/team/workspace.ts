/**
 * Local workspaces (change team-workspaces): teams, projects and the actions saved from their retros.
 * Pure functions over a plain value; the web adapter persists it on the device. No server, no board content
 * beyond the action texts the person chose to save.
 */
import type { PhaseInput } from '@retroboard/domain'

/** What a team's next board starts with: the last format, theme, agenda and title it was created with. */
export interface TeamDefaults {
  templateId?: string
  themeId?: string
  agenda?: { phases: PhaseInput[]; rules: boolean; autoPublish: boolean; autoStart?: boolean; chain?: boolean }
  title?: string
  at?: number
}
export interface Team { id: string; name: string; emoji: string; color: string; defaults?: TeamDefaults }
export interface SavedAction { text: string; owner: string; status: string; due?: string }
export interface SavedRetro {
  /** Board room id, so saving the same board again replaces its entry. */
  boardId: string
  teamId: string
  project: string | null
  title: string
  at: number
  actions: SavedAction[]
}
export interface Workspace {
  teams: Team[]
  lastTeamId: string | null
  retros: SavedRetro[]
  /** Team and project each board was created for, by room id (this device). */
  boards: Record<string, { teamId: string; project: string | null }>
  owners: string[]
}

export const EMPTY_WORKSPACE: Workspace = { teams: [], lastTeamId: null, retros: [], boards: {}, owners: [] }
export const MAX_RETROS_PER_TEAM = 12
const MAX_OWNERS = 40

export const TEAM_COLORS = ['#e8590c', '#2f9e44', '#1c7ed6', '#9c36b5', '#e03131', '#0c8599'] as const
export const TEAM_EMOJIS = ['🚀', '🛠️', '🌱', '🎯', '🧪', '🧭'] as const

export function addTeam(ws: Workspace, name: string, id: string): { ws: Workspace; team: Team } {
  const n = ws.teams.length
  const team: Team = { id, name: name.trim().slice(0, 40) || 'Team', emoji: TEAM_EMOJIS[n % TEAM_EMOJIS.length]!, color: TEAM_COLORS[n % TEAM_COLORS.length]! }
  return { ws: { ...ws, teams: [...ws.teams, team], lastTeamId: team.id }, team }
}

/** The team to use when none is chosen: the last one used, else the first. */
export const currentTeam = (ws: Workspace): Team | null => ws.teams.find((t) => t.id === ws.lastTeamId) ?? ws.teams[0] ?? null

export const projectsOf = (ws: Workspace, teamId: string): string[] =>
  [...new Set(ws.retros.filter((r) => r.teamId === teamId && r.project).map((r) => r.project!))].sort((a, b) => a.localeCompare(b))

/** Remembers how the team created its latest board, so the next one starts the same way. */
export function setDefaults(ws: Workspace, teamId: string, defaults: TeamDefaults): Workspace {
  return { ...ws, teams: ws.teams.map((t) => (t.id === teamId ? { ...t, defaults } : t)) }
}

export function assignBoard(ws: Workspace, boardId: string, teamId: string, project: string | null): Workspace {
  return { ...ws, lastTeamId: teamId, boards: { ...ws.boards, [boardId]: { teamId, project: project?.trim() || null } } }
}

export function rememberOwner(ws: Workspace, name: string): Workspace {
  const n = name.trim()
  if (!n) return ws
  return { ...ws, owners: [n, ...ws.owners.filter((o) => o.toLowerCase() !== n.toLowerCase())].slice(0, MAX_OWNERS) }
}

/** "Save actions for next time": replaces this board's entry, keeps the newest retros per team. */
export function saveRetro(ws: Workspace, retro: SavedRetro): Workspace {
  const others = ws.retros.filter((r) => r.boardId !== retro.boardId)
  const sameTeam = [...others.filter((r) => r.teamId === retro.teamId), retro].sort((a, b) => b.at - a.at).slice(0, MAX_RETROS_PER_TEAM)
  return { ...ws, retros: [...others.filter((r) => r.teamId !== retro.teamId), ...sameTeam] }
}

export interface CarryCandidate extends SavedAction { from: string; at: number; project: string | null }

const isOpen = (a: SavedAction) => a.status !== 'done' && a.status !== 'dropped'

/**
 * Open actions of the previous retros of one team (never another team's), newest retro first. An action that was
 * carried over and saved again shows once, from its latest retro. `project` narrows to that stream.
 */
export function carryOver(ws: Workspace, teamId: string, project?: string | null): CarryCandidate[] {
  const seen = new Set<string>()
  const out: CarryCandidate[] = []
  for (const r of ws.retros.filter((x) => x.teamId === teamId && (!project || x.project === project)).sort((a, b) => b.at - a.at)) {
    for (const a of r.actions) {
      // Stryker disable next-line MethodExpression: upper- and lower-casing both fold the same texts together
      const key = `${a.text.trim().toLowerCase()}|${a.owner.trim().toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      if (isOpen(a)) out.push({ ...a, from: r.title, at: r.at, project: r.project })
    }
  }
  return out
}

/** Suggested title for the next retro of a team: "Sprint 42" becomes "Sprint 43". Null when there is nothing to follow. */
export function nextTitle(ws: Workspace, teamId: string): string | null {
  const saved = ws.retros.filter((r) => r.teamId === teamId).sort((a, b) => b.at - a.at)[0]
  const made = ws.teams.find((t) => t.id === teamId)?.defaults
  const last = made?.title && (made.at ?? 0) >= (saved?.at ?? 0) ? made.title : saved?.title
  if (!last) return null
  return bumpNumber(last.trim())
}

const isDigit = (c: string) => c >= '0' && c <= '9'

/** Adds one to the last number of a title, keeping what surrounds it; null when there is no number. Linear scan, no regex. */
function bumpNumber(title: string): string | null {
  let end = title.length
  // Stryker disable next-line EqualityOperator: at index 0, charAt(-1) is empty, so one extra step ends on the same null
  while (end > 0 && !isDigit(title.charAt(end - 1))) end--
  let start = end
  // Stryker disable next-line ConditionalExpression,EqualityOperator: charAt(-1) is empty and not a digit, so the bound check is redundant
  while (start > 0 && isDigit(title.charAt(start - 1))) start--
  if (start === end) return null
  return `${title.slice(0, start)}${Number(title.slice(start, end)) + 1}${title.slice(end)}`
}
