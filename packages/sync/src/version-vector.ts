/**
 * Version vector keyed by author (signing key): the highest event clock seen per author.
 * Peers compare vectors to know who holds events the other lacks (resync, resurrection).
 */
export type VersionVector = Readonly<Record<string, number>>

export function observe(vv: VersionVector, author: string, at: number): VersionVector {
  return (vv[author] ?? -1) >= at ? vv : { ...vv, [author]: at }
}

export function merge(a: VersionVector, b: VersionVector): VersionVector {
  const out: Record<string, number> = { ...a }
  for (const [k, v] of Object.entries(b)) if ((out[k] ?? -1) < v) out[k] = v
  return out
}

/** True when `a` has seen everything `b` has. */
export function dominates(a: VersionVector, b: VersionVector): boolean {
  return Object.entries(b).every(([k, v]) => (a[k] ?? -1) >= v)
}

/** Authors for which `mine` holds newer events than `theirs`, with the clock to send from (exclusive). */
export function ahead(mine: VersionVector, theirs: VersionVector): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(mine)) if (v > (theirs[k] ?? -1)) out[k] = theirs[k] ?? -1
  return out
}
