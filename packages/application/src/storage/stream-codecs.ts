/**
 * How each synced stream looks to the vault engine (change user-drive-storage, design "Vault engine"): its items, each with a
 * token that orders writes (a larger string is newer), so the engine sends only what the target lacks and never reads the
 * data. Pure. The shape is the engine's `StreamCodec`, which this layer may not import: the app wires the two together.
 */
import { type Library, type LibraryRecord, parseLibraryRecord } from './library'
import type { Stamped } from './stamp'
import { EMPTY_WORKSPACE_DOC, type WorkspaceDoc } from './workspace-merge'
import type { SavedRetro, Team } from '../team/workspace'

export interface SyncedStreamCodec<S> {
  index(state: S): Record<string, string>
  pick(state: S, keys: readonly string[]): S
  split(state: S, maxBytes: number): S[]
  parse(value: unknown): S | null
}

/** A number that sorts as text: 16 digits hold any millisecond time for far longer than this software will exist. */
const pad = (n: number): string => String(Math.max(0, Math.trunc(n))).padStart(16, '0')

/** Cuts a list of sized items into groups of at most `maxBytes` (a group holds at least one). */
function groups<T>(items: readonly T[], size: (item: T) => number, maxBytes: number): T[][] {
  const out: T[][] = []
  let group: T[] = []
  let bytes = 0
  for (const item of items) {
    const n = size(item)
    if (group.length > 0 && bytes + n > maxBytes) { out.push(group); group = []; bytes = 0 }
    group.push(item)
    bytes += n
  }
  if (group.length > 0) out.push(group)
  return out
}

const jsonSize = (v: unknown): number => JSON.stringify(v).length + 8

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStamp = (v: unknown): v is Stamped<unknown>['stamp'] => isRecord(v) && Number.isFinite(v.at) && typeof v.device === 'string'

/** An own-property pick: a key such as `__proto__` is data, never a prototype write. */
const pickOwn = <T>(source: Readonly<Record<string, T>>, keys: readonly string[]): Record<string, T> =>
  Object.fromEntries(keys.filter((k) => Object.hasOwn(source, k)).map((k) => [k, source[k]!]))

const splitRecord = <T>(source: Readonly<Record<string, T>>, maxBytes: number): Record<string, T>[] =>
  groups(Object.entries(source), ([k, v]) => jsonSize([k, v]), maxBytes).map((g) => Object.fromEntries(g))

/** The library: a record per board id, ordered by stamp and by activity (the merge keeps the larger activity time). */
export const libraryCodec: SyncedStreamCodec<Library> = {
  index: (l) => Object.fromEntries(Object.entries(l).map(([id, r]) => [id, `${pad(r.stamp.at)}:${r.stamp.device}:${pad(r.lastActivityAt)}`])),
  pick: pickOwn,
  split: splitRecord,
  parse(value) {
    if (!isRecord(value)) return null
    const out = new Map<string, LibraryRecord>()
    for (const [id, raw] of Object.entries(value)) {
      const record = parseLibraryRecord(raw)
      if (!record || record.boardId !== id) return null
      out.set(id, record)
    }
    return Object.fromEntries(out)
  },
}

/** Settings and identity: a value per key, each with the stamp of the write that set it. */
export type StampedMap = Readonly<Record<string, Stamped<unknown>>>

export const stampedCodec: SyncedStreamCodec<StampedMap> = {
  index: (m) => Object.fromEntries(Object.entries(m).map(([k, s]) => [k, `${pad(s.stamp.at)}:${s.stamp.device}`])),
  pick: pickOwn,
  split: splitRecord,
  parse(value) {
    if (!isRecord(value)) return null
    const out = new Map<string, Stamped<unknown>>()
    for (const [key, raw] of Object.entries(value)) {
      if (!isRecord(raw) || !isStamp(raw.stamp) || !('value' in raw)) return null
      out.set(key, { value: raw.value, stamp: { at: raw.stamp.at, device: raw.stamp.device } })
    }
    return Object.fromEntries(out)
  },
}

/** A team stored under `id`: the key and the team's own id are the same. */
const team = (v: unknown, id: string): v is Team => isRecord(v) && v.id === id && typeof v.name === 'string' && typeof v.emoji === 'string' && typeof v.color === 'string'
const retro = (v: unknown): v is SavedRetro =>
  isRecord(v) && typeof v.boardId === 'string' && typeof v.teamId === 'string' && typeof v.title === 'string' && Number.isFinite(v.at) && Array.isArray(v.actions) && (v.project === null || typeof v.project === 'string')

/** The workspace: a team by id with its stamp, a saved retro by board id, an owner by name. Retros are ordered by their save time. */
export const workspaceCodec: SyncedStreamCodec<WorkspaceDoc> = {
  index: (d) => ({
    ...Object.fromEntries(Object.entries(d.teams).map(([id, s]) => [`t:${id}`, `${pad(s.stamp.at)}:${s.stamp.device}`])),
    ...Object.fromEntries(d.retros.map((r) => [`r:${r.boardId}`, `${pad(r.at)}:${JSON.stringify(r)}`])),
    ...Object.fromEntries(d.owners.map((o) => [`o:${o}`, '1'])),
  }),
  pick: (d, keys) => {
    const wanted = new Set(keys)
    return {
      teams: Object.fromEntries(Object.entries(d.teams).filter(([id]) => wanted.has(`t:${id}`))),
      retros: d.retros.filter((r) => wanted.has(`r:${r.boardId}`)),
      owners: d.owners.filter((o) => wanted.has(`o:${o}`)),
    }
  },
  split(d, maxBytes) {
    const parts: WorkspaceDoc[] = []
    const items = [
      ...Object.entries(d.teams).map(([id, s]) => ({ team: [id, s] as const })),
      ...d.retros.map((r) => ({ retro: r })),
      ...d.owners.map((o) => ({ owner: o })),
    ]
    for (const g of groups(items, jsonSize, maxBytes)) {
      parts.push({
        teams: Object.fromEntries(g.flatMap((i) => ('team' in i ? [i.team] : []))),
        retros: g.flatMap((i) => ('retro' in i ? [i.retro] : [])),
        owners: g.flatMap((i) => ('owner' in i ? [i.owner] : [])),
      })
    }
    return parts
  },
  parse(value) {
    if (!isRecord(value) || !isRecord(value.teams) || !Array.isArray(value.retros) || !Array.isArray(value.owners)) return null
    const teams = new Map<string, Stamped<Team>>()
    for (const [id, raw] of Object.entries(value.teams)) {
      if (!isRecord(raw) || !isStamp(raw.stamp) || !team(raw.value, id)) return null
      teams.set(id, { value: raw.value, stamp: { at: raw.stamp.at, device: raw.stamp.device } })
    }
    if (!value.retros.every(retro) || !value.owners.every((o) => typeof o === 'string')) return null
    return { ...EMPTY_WORKSPACE_DOC, teams: Object.fromEntries(teams), retros: value.retros as SavedRetro[], owners: value.owners as string[] }
  },
}
