import type { ActionItem, ImportedAction } from '@retroboard/domain'
import {
  addTeam, assignBoard, switchTeam, type CarryCandidate, carryOver, currentTeam, EMPTY_WORKSPACE, nextTitle, projectsOf,
  rememberOwner as rememberOwnerIn, saveRetro, setDefaults, type Team, type TeamDefaults, type Workspace,
} from '@retroboard/application'
import { randomId, safeStorage } from '~/utils/storage'

/**
 * Local workspaces on this device (change team-workspaces): teams, projects and the actions saved from their
 * retros. Nothing is sent anywhere. The single profile of earlier versions becomes the first team.
 */
const KEY = 'retroboard:workspace'
const LEGACY_KEY = 'retroboard:team'
interface LegacyProfile { lastTitle?: string | null; savedAt?: number | null; actions?: ImportedAction[]; owners?: string[] }

function load(): Workspace {
  const own = safeStorage.get<Workspace | null>(KEY, null)
  if (own) return { ...EMPTY_WORKSPACE, ...own }
  const old = safeStorage.get<LegacyProfile>(LEGACY_KEY, {})
  let ws: Workspace = { ...EMPTY_WORKSPACE, owners: old.owners ?? [] }
  if (old.actions?.length) {
    const { ws: withTeam, team } = addTeam(ws, 'Team', 'default')
    ws = saveRetro(withTeam, {
      boardId: 'legacy', teamId: team.id, project: null, title: old.lastTitle ?? '', at: old.savedAt ?? Date.now(),
      actions: old.actions.map((a) => ({ text: a.text, owner: a.owner, status: a.status, ...(a.due ? { due: a.due } : {}) })),
    })
  }
  return ws
}

export const useTeamStore = defineStore('team', () => {
  const ws = ref<Workspace>(load())
  const commit = (next: Workspace) => { ws.value = next; safeStorage.set(KEY, next) }
  const { t } = useT()

  const teams = computed(() => ws.value.teams)
  const current = computed<Team | null>(() => currentTeam(ws.value))
  /** Team whose boards the lists show (home and profile); empty shows every team. Picking one also makes it the team of the next board. */
  const view = ref('')
  function switchTo(teamId: string) { view.value = teamId; commit(switchTeam(ws.value, teamId)) }
  const owners = computed(() => ws.value.owners)

  /** The team of the next board: the last used one, created on first use so every board belongs to a team. */
  function ensureTeam(): Team {
    const cur = currentTeam(ws.value)
    if (cur) return cur
    const made = addTeam(ws.value, t('team.default'), randomId(6))
    commit(made.ws)
    return made.team
  }
  function create(name: string): Team {
    const made = addTeam(ws.value, name, randomId(6))
    commit(made.ws)
    return made.team
  }
  const assign = (boardId: string, teamId: string, project: string | null) => commit(assignBoard(ws.value, boardId, teamId, project))
  const rememberOwner = (name: string) => commit(rememberOwnerIn(ws.value, name))
  const projects = (teamId: string) => projectsOf(ws.value, teamId)
  const candidates = (teamId: string, project?: string | null): CarryCandidate[] => carryOver(ws.value, teamId, project)
  const defaultsOf = (teamId: string): TeamDefaults | undefined => ws.value.teams.find((x) => x.id === teamId)?.defaults
  const remember = (teamId: string, defaults: TeamDefaults) => commit(setDefaults(ws.value, teamId, defaults))
  const suggestTitle = (teamId: string) => nextTitle(ws.value, teamId)

  /** "Save actions for next time": the board's actions with their final statuses, under the board's team. */
  function saveActions(boardId: string, title: string, actions: readonly ActionItem[]) {
    const known = ws.value.boards[boardId]
    const team = known ? known.teamId : ensureTeam().id
    let next = saveRetro(ws.value, {
      boardId, teamId: team, project: known?.project ?? null, title, at: Date.now(),
      actions: actions.map((a) => ({ text: a.text, owner: a.owner, status: a.status, ...(a.due ? { due: a.due } : {}) })),
    })
    for (const a of actions) next = rememberOwnerIn(next, a.owner)
    commit(next)
  }
  /** Applies a change to the workspace (used by the lazy team-sharing components, so their code stays out of the entry). */
  function update(fn: (w: Workspace) => Workspace) { view.value = ''; commit(fn(ws.value)) }
  function clear() { commit({ ...EMPTY_WORKSPACE }) }
  return { ws, teams, current, view, switchTo, owners, ensureTeam, create, assign, rememberOwner, projects, candidates, suggestTitle, defaultsOf, remember, update, saveActions, clear }
})
