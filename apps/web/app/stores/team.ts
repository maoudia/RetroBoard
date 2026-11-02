import type { ActionItem, ImportedAction } from '@retroboard/domain'
import {
  addTeam, assignBoard, type CarryCandidate, carryOver, currentTeam, EMPTY_WORKSPACE, nextTitle, projectsOf,
  rememberOwner as rememberOwnerIn, saveRetro, type Team, type Workspace,
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
  function clear() { commit({ ...EMPTY_WORKSPACE }) }
  return { ws, teams, current, owners, ensureTeam, create, assign, rememberOwner, projects, candidates, suggestTitle, saveActions, clear }
})
