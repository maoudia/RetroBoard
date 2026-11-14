/**
 * What of the user's own data follows them from device to device (change user-drive-storage, design "What syncs").
 * Every key of the preferences, the identity and the workspace is in exactly one of two lists, and a test fails when a
 * key is in neither: anything a store gains has to be classified.
 */

/** Preferences about the person: last write wins per key. */
export const SYNCED_SETTINGS = [
  'locale', 'variant', 'defaultTheme', 'avatarHue', 'uiMode', 'motion', 'sound', 'ambient', 'presentGroups', 'shortcuts', 'keyHints',
  'shareCursor', 'showCursors', 'notifyPos', 'phaseWarning', 'presenterHideMenus', 'stepperTime', 'ringTime', 'chatStatus', 'votedSort', 'saveJoinedBoards',
] as const

/** Preferences about the device, its browser or a secret (ADR-0033): never synced. */
export const LOCAL_ONLY_SETTINGS = [
  'density', 'chatSide', 'retentionDays', 'systemNotify', 'browserAgents', 'p2p', 'slackWebhook',
] as const

/** The person's display choices. */
export const SYNCED_IDENTITY = ['name', 'showName', 'named', 'nudgeOff'] as const
/** `cid` is the per-device participant id: two devices sharing one would look like one participant in presence. */
export const LOCAL_ONLY_IDENTITY = ['cid'] as const

/** Teams (and with their saved retros, the projects) and the owners of saved actions. */
export const SYNCED_WORKSPACE = ['teams', 'retros', 'owners'] as const
/** The last team used is a habit of one device; a board's team travels with its library entry. */
export const LOCAL_ONLY_WORKSPACE = ['lastTeamId', 'boards'] as const

type Key<T extends readonly string[]> = T[number]

/** The synced part of a values object, in list order; unknown or missing keys are skipped. */
export function pickKeys<T extends readonly string[]>(values: Readonly<Record<string, unknown>>, keys: T): Partial<Record<Key<T>, unknown>> {
  const out: Partial<Record<Key<T>, unknown>> = {}
  for (const k of keys) if (Object.hasOwn(values, k)) out[k as Key<T>] = values[k]
  return out
}
