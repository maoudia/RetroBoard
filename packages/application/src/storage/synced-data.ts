/**
 * Applying and recording synced preferences (change user-drive-storage, design "Vault engine", merge rules): a value per key
 * with the stamp of the write that set it. A remote stamp is clamped to the receive time plus the drift allowance, so a
 * device whose clock runs a year ahead cannot pin a setting; a local edit always stamps above the one it replaces, so a
 * device whose clock runs behind still wins over what it saw. Pure.
 */
import { type Library, type LibraryRecord, mergeLibrary } from './library'
import type { StampedMap } from './stream-codecs'
import { type Stamped, mergeStamped, nextStamp } from './stamp'

/** The most a remote stamp may be ahead of the clock that receives it (the hybrid clock's `MAX_DRIFT_MS`, in `packages/sync`). */
export const STAMP_DRIFT_MS = 60_000

/** The same value with a stamp no later than `now` plus the allowance. */
export const clampStamped = (s: Stamped<unknown>, now: number): Stamped<unknown> =>
  s.stamp.at > now + STAMP_DRIFT_MS ? { value: s.value, stamp: { at: now + STAMP_DRIFT_MS, device: s.stamp.device } } : s

/** What a remote change does to the local map: each key by last write wins, after clamping. */
export function mergeIncoming(local: StampedMap, incoming: StampedMap, now: number): StampedMap {
  return mergeStamped(local, Object.fromEntries(Object.entries(incoming).map(([k, s]) => [k, clampStamped(s, now)])))
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)

/**
 * The map after the person changed their values: each key whose current value differs from the one the map holds is
 * written with a new stamp above the stamp it replaces. Keys the map has and `current` lacks stay as they are.
 */
export function recordEdits(map: StampedMap, current: Readonly<Record<string, unknown>>, now: number, device: string): StampedMap {
  const out = new Map(Object.entries(map))
  for (const [key, value] of Object.entries(current)) {
    const old = Object.hasOwn(map, key) ? map[key] : undefined
    if (value === undefined || (old && same(old.value, value))) continue
    out.set(key, { value, stamp: nextStamp(old?.stamp, now, device) })
  }
  return Object.fromEntries(out)
}

/** The plain values of a synced map, for the keys in the list: what the stores take. */
export function valuesOf(map: StampedMap, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((k) => Object.hasOwn(map, k)).map((k) => [k, map[k]!.value]))
}

/** A library change from another device, its stamps clamped like any other remote stamp. */
export function mergeIncomingLibrary(local: Library, incoming: Library, now: number): Library {
  // Stryker disable next-line EqualityOperator: at the limit itself the clamped stamp equals the original
  const clamp = (r: LibraryRecord): LibraryRecord => (r.stamp.at > now + STAMP_DRIFT_MS ? { ...r, stamp: { at: now + STAMP_DRIFT_MS, device: r.stamp.device } } : r)
  return mergeLibrary(local, Object.fromEntries(Object.entries(incoming).map(([id, r]) => [id, clamp(r)])))
}
