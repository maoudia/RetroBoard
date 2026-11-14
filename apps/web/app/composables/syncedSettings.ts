import {
  type Library, type StampedMap, type WorkspaceDoc, SYNCED_IDENTITY, SYNCED_SETTINGS, applyWorkspaceDoc, mergeIncoming, mergeWorkspace, pickKeys, recordEdits, valuesOf,
} from '@retroboard/application'
import { createSyncStateStore } from '~/adapters/sync/sync-state'
import { deviceId } from '~/utils/device-id'

/** The stamps of what this device last wrote, kept next to the vault connection (never synced as such). */
const STAMPS = 'stamps'
interface Stamps { settings: StampedMap; identity: StampedMap; teams: StampedMap }
const EMPTY: Stamps = { settings: {}, identity: {}, teams: {} }

type State = ReturnType<typeof createSyncStateStore>

/**
 * One place that reads and writes the stores of preferences, identity and workspace through the synced lists (change
 * user-drive-storage, "What syncs"). A read turns what the person changed since the last read into stamped values; an
 * apply merges what came from another device, last write wins per key, and puts the winners into the stores. Nothing
 * outside `SYNCED_SETTINGS`, `SYNCED_IDENTITY` and the workspace's synced parts is ever read or written here.
 */
export function useSyncedSettings(state: State = createSyncStateStore(), now: () => number = Date.now) {
  const settings = useSettingsStore()
  const identity = useIdentityStore()
  const team = useTeamStore()
  const device = deviceId()

  const load = async (): Promise<Stamps> => ({ ...EMPTY, ...(await state.get<Stamps>(STAMPS)) })
  const save = (s: Stamps) => state.set(STAMPS, s)

  /** The stores hold reactive objects; what is stored and sent is plain data (a proxy cannot be cloned into IndexedDB). */
  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

  const settingValues = (): Record<string, unknown> => plain(pickKeys({ ...settings.s }, SYNCED_SETTINGS))
  const identityValues = (): Record<string, unknown> => pickKeys({ name: identity.name, showName: identity.showName, named: identity.named, nudgeOff: identity.nudgeOff }, SYNCED_IDENTITY)
  const teamValues = (): Record<string, unknown> => plain(Object.fromEntries(team.ws.teams.map((t) => [t.id, t])))

  /** The doc for the workspace stream: each team with the stamp of its last edit, saved retros and owners as they are. */
  async function readWorkspace(): Promise<WorkspaceDoc> {
    const stamps = await load()
    const teams = recordEdits(stamps.teams, teamValues(), now(), device)
    await save({ ...stamps, teams })
    return { teams: teams as WorkspaceDoc['teams'], retros: plain(team.ws.retros), owners: plain(team.ws.owners) }
  }

  return {
    async readSettings(): Promise<StampedMap> {
      const stamps = await load()
      const map = recordEdits(stamps.settings, settingValues(), now(), device)
      await save({ ...stamps, settings: map })
      return map
    },
    async applySettings(delta: StampedMap): Promise<void> {
      const stamps = await load()
      const map = mergeIncoming(recordEdits(stamps.settings, settingValues(), now(), device), delta, now())
      await save({ ...stamps, settings: map })
      const values = valuesOf(map, SYNCED_SETTINGS)
      const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => JSON.stringify((settings.s as unknown as Record<string, unknown>)[k]) !== JSON.stringify(v)))
      if (Object.keys(changed).length > 0) settings.patch(changed as Parameters<typeof settings.patch>[0])
    },
    async readIdentity(): Promise<StampedMap> {
      const stamps = await load()
      const map = recordEdits(stamps.identity, identityValues(), now(), device)
      await save({ ...stamps, identity: map })
      return map
    },
    async applyIdentity(delta: StampedMap): Promise<void> {
      const stamps = await load()
      const map = mergeIncoming(recordEdits(stamps.identity, identityValues(), now(), device), delta, now())
      await save({ ...stamps, identity: map })
      identity.applySynced(valuesOf(map, SYNCED_IDENTITY))
    },
    readWorkspace,
    async applyWorkspace(delta: WorkspaceDoc): Promise<void> {
      // Remote stamps are clamped before they are compared with this device's own.
      const incoming: WorkspaceDoc = { ...delta, teams: mergeIncoming({}, delta.teams, now()) as WorkspaceDoc['teams'] }
      const merged = mergeWorkspace(await readWorkspace(), incoming)
      await save({ ...(await load()), teams: merged.teams })
      team.update((ws) => applyWorkspaceDoc(ws, merged))
    },
  }
}

/** Library entries to mirror: boards kept offline that are not forgotten. */
export const keptOffline = (library: Library): string[] => Object.values(library).flatMap((r) => ('forgotten' in r || !r.keepOffline ? [] : [r.boardId]))
