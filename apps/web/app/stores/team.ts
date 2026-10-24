import type { ActionItem, ImportedAction } from '@retroboard/domain'
import { safeStorage } from '~/utils/storage'

/**
 * Local team profile (this device only): the actions saved at the end of the last retro and
 * the owners used so far, so the next retro can carry them over and suggest names.
 */
export interface TeamProfile {
  /** Title of the retro the actions come from. */
  lastTitle: string | null
  savedAt: number | null
  actions: ImportedAction[]
  owners: string[]
}

const KEY = 'retroboard:team'
const EMPTY: TeamProfile = { lastTitle: null, savedAt: null, actions: [], owners: [] }
const MAX_OWNERS = 40

export const useTeamStore = defineStore('team', () => {
  const profile = ref<TeamProfile>({ ...EMPTY, ...safeStorage.get<Partial<TeamProfile>>(KEY, {}) })
  const save = () => safeStorage.set(KEY, profile.value)

  /** Remembers an owner name for suggestions (most recent first). */
  function rememberOwner(name: string) {
    const n = name.trim()
    if (!n) return
    profile.value = { ...profile.value, owners: [n, ...profile.value.owners.filter((o) => o.toLowerCase() !== n.toLowerCase())].slice(0, MAX_OWNERS) }
    save()
  }

  /** "Save actions for next time": the board's actions with their final statuses. */
  function saveActions(title: string, actions: readonly ActionItem[]) {
    profile.value = {
      ...profile.value,
      lastTitle: title,
      savedAt: Date.now(),
      actions: actions.map((a) => ({ text: a.text, owner: a.owner, status: a.status, ...(a.due ? { due: a.due } : {}), from: title })),
    }
    for (const a of actions) rememberOwner(a.owner)
    save()
  }

  const openActions = computed(() => profile.value.actions.filter((a) => a.status !== 'done' && a.status !== 'dropped'))
  function clear() { profile.value = { ...EMPTY }; save() }
  return { profile, openActions, rememberOwner, saveActions, clear }
})
