import type { Snapshot } from '@retroboard/domain'

type View = Pick<Snapshot, 'columns' | 'notes' | 'groups'>

/**
 * Votes a format change would set aside (change fix-votes-after-format-change): the votes shown today
 * on ideas whose new column is not votable. `newVotable` is the votable flag of each new column, in order.
 * Null while counts are hidden: the number must not leak them.
 */
export function votesSetAside(s: View, newVotable: readonly boolean[]): number | null {
  if (s.notes.some((n) => n.votes === null) || s.groups.some((g) => g.votes === null)) return null
  // Same mapping as the format change: old column i goes to new column i, the extra ones to the last.
  const off = (columnId: string) => newVotable[Math.min(s.columns.findIndex((c) => c.id === columnId), newVotable.length - 1)] === false
  const loose = s.notes.filter((n) => !n.groupId && off(n.columnId)).reduce((n, x) => n + x.votes!, 0)
  return loose + s.groups.filter((g) => off(g.columnId)).reduce((n, g) => n + g.votes!, 0)
}
