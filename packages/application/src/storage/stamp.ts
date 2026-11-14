/**
 * Last-write-wins stamps of synced data (change user-drive-storage, design "Vault engine"): the hybrid-clock time of
 * the write, then the id of the device that made it, so two devices always agree on which write is the later one.
 */
export interface Stamp { readonly at: number; readonly device: string }
export interface Stamped<T> { readonly value: T; readonly stamp: Stamp }

/** Total order: time, then device id. */
export const compareStamps = (a: Stamp, b: Stamp): number => a.at - b.at || (a.device < b.device ? -1 : a.device > b.device ? 1 : 0)

/** The stamp of a local edit: never at or below the stamp it replaces, even when this device's clock runs behind. */
export const nextStamp = (previous: Stamp | undefined, now: number, device: string): Stamp =>
  ({ at: Math.max(now, (previous?.at ?? 0) + 1), device })

/**
 * Per-key last write wins. Pure, and independent of argument order and grouping, so devices converge whatever the
 * order segments arrive in. Built through a Map: a key such as `__proto__` is data, never a prototype write.
 */
export function mergeStamped<T>(a: Readonly<Record<string, Stamped<T>>>, b: Readonly<Record<string, Stamped<T>>>): Record<string, Stamped<T>> {
  const out = new Map(Object.entries(a))
  for (const [key, entry] of Object.entries(b)) {
    const mine = out.get(key)
    if (!mine || compareStamps(entry.stamp, mine.stamp) > 0) out.set(key, entry)
  }
  return Object.fromEntries(out)
}
