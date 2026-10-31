/**
 * Duplicate names (change identity-conflicts): the latest joiner is asked to pick another name.
 * Pure rule on the peer list; the popup and the bookkeeping of who was here first live in the web app.
 */
export interface ConflictPeer {
  name: string | null
  me: boolean
  key?: string
}

/** Case, accents and spacing do not tell two names apart. */
export const nameKey = (name: string | null | undefined): string =>
  (name ?? '').normalize('NFD').replace(/\p{M}+/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * The name of a participant who was here first and is called like me, or null.
 * `earlier` holds the keys of the peers already present when I arrived (or when I chose my name):
 * only the latest joiner is asked, never the one who was there first.
 */
export function nameConflict(peers: readonly ConflictPeer[], earlier: ReadonlySet<string>): string | null {
  const mine = nameKey(peers.find((p) => p.me)?.name)
  if (!mine) return null
  const other = peers.find((p) => !p.me && p.key !== undefined && earlier.has(p.key) && nameKey(p.name) === mine)
  return other?.name ?? null
}
