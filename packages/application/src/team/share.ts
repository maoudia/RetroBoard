import { PHASE_KINDS, type PhaseInput } from '@retroboard/domain'
import { TEAM_COLORS, TEAM_EMOJIS, type Team, type TeamDefaults, type Workspace } from './workspace'

/**
 * What leaves the device when a team is shared (change team-workspaces): the team id, its name and look and the way it
 * starts a board. Never a board, a note, an action or a title: the type has no room for them.
 */
export interface TeamShare { id: string; name: string; emoji: string; color: string; settings: Pick<TeamDefaults, 'templateId' | 'themeId' | 'agenda'> }

export function teamShareOf(team: Team): TeamShare {
  const { templateId, themeId, agenda } = team.defaults ?? {}
  return { id: team.id, name: team.name, emoji: team.emoji, color: team.color, settings: { ...(templateId ? { templateId } : {}), ...(themeId ? { themeId } : {}), ...(agenda ? { agenda } : {}) } }
}

const text = (v: unknown, max: number): string | null => {
  const t = typeof v === 'string' ? v.trim() : ''
  return t && t.length <= max ? t : null
}
const MAX_PHASES = 20
const MAX_MINUTES = 600

function agendaOf(v: unknown): TeamDefaults['agenda'] | null {
  if (typeof v !== 'object' || v === null) return null
  const a = v as Record<string, unknown>
  if (!Array.isArray(a.phases) || a.phases.length === 0 || a.phases.length > MAX_PHASES) return null
  const phases: PhaseInput[] = []
  for (const p of a.phases as unknown[]) {
    const o = (typeof p === 'object' && p !== null ? p : {}) as Record<string, unknown>
    const kind = (PHASE_KINDS as readonly unknown[]).find((k) => k === o.kind)
    const minutes = Number.isInteger(o.minutes) ? (o.minutes as number) : 0
    if (!kind || minutes < 1 || minutes > MAX_MINUTES) return null
    phases.push({ kind: kind as PhaseInput['kind'], minutes })
  }
  return { phases, rules: a.rules === true, autoPublish: a.autoPublish === true, ...(a.autoStart === true ? { autoStart: true } : {}), ...(a.chain === false ? { chain: false } : {}) }
}

/** A team from untrusted input (a link or a file): only known fields, bounded sizes, a known look; null when it is not a team. */
export function parseTeamShare(raw: unknown): TeamShare | null {
  const r = (raw ?? {}) as Record<string, unknown>
  const id = text(r.id, 64)
  const name = text(r.name, 40)
  if (!id || !name || !/^[\w-]+$/.test(id)) return null
  const s = (typeof r.settings === 'object' && r.settings !== null ? r.settings : {}) as Record<string, unknown>
  const agenda = agendaOf(s.agenda)
  const templateId = text(s.templateId, 64)
  const themeId = text(s.themeId, 64)
  const emoji = (TEAM_EMOJIS as readonly unknown[]).find((e) => e === r.emoji) as string | undefined
  const color = (TEAM_COLORS as readonly unknown[]).find((c) => c === r.color) as string | undefined
  return { id, name, emoji: emoji ?? TEAM_EMOJIS[0], color: color ?? TEAM_COLORS[0], settings: { ...(templateId ? { templateId } : {}), ...(themeId ? { themeId } : {}), ...(agenda ? { agenda } : {}) } }
}

/**
 * Joins a shared team: a new team is added, a known one (same id) takes the shared name, look and settings and keeps
 * this device's boards, retros and last title. The joined team becomes the one of the next board.
 */
export function joinTeam(ws: Workspace, share: TeamShare): Workspace {
  const known = ws.teams.find((t) => t.id === share.id)
  const defaults: TeamDefaults = { ...known?.defaults, ...share.settings }
  const team: Team = { id: share.id, name: share.name, emoji: share.emoji, color: share.color, ...(Object.keys(defaults).length ? { defaults } : {}) }
  return { ...ws, teams: known ? ws.teams.map((t) => (t.id === share.id ? team : t)) : [...ws.teams, team], lastTeamId: share.id }
}
