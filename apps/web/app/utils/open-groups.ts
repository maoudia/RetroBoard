/** One open group per column (change group-colors-menu-and-scope): a personal view, column id to group id. */
export type OpenGroups = Record<string, string>

/** Opening a group replaces the open group of its own column and leaves the others alone. */
export function openIn(open: OpenGroups, columnId: string, groupId: string): OpenGroups {
  return open[columnId] === groupId ? open : { ...open, [columnId]: groupId }
}

export function closeIn(open: OpenGroups, columnId: string): OpenGroups {
  if (!(columnId in open)) return open
  return Object.fromEntries(Object.entries(open).filter(([c]) => c !== columnId))
}

/**
 * Keeps the open groups true to the board: a group that vanished (dissolved, merged away, reset) closes,
 * a group moved to another column stays open in its new column (a group already open there keeps its place).
 * Returns the same object when nothing changes, so a watcher never loops.
 */
export function reconcile(open: OpenGroups, groups: readonly { id: string; columnId: string }[]): OpenGroups {
  const byId = new Map(groups.map((g) => [g.id, g.columnId]))
  const next: OpenGroups = {}
  const moved: [string, string][] = []
  for (const [col, gid] of Object.entries(open)) {
    const now = byId.get(gid)
    if (now === undefined) continue
    if (now === col) next[col] = gid
    else moved.push([now, gid])
  }
  for (const [col, gid] of moved) if (!(col in next)) next[col] = gid
  const same = Object.keys(next).length === Object.keys(open).length && Object.entries(next).every(([c, g]) => open[c] === g)
  return same ? open : next
}
