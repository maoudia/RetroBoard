import type { Group, Snapshot, SnapshotNote } from '@retroboard/domain'

export type ColumnItem =
  | { kind: 'note'; key: string; note: SnapshotNote; votes: number }
  | { kind: 'group'; key: string; group: Group; notes: SnapshotNote[]; votes: number; title: string }

export type SortMode = 'time' | 'votes'

/** First note's text, used when a group has no title yet (same behaviour as RetroTool). */
export const groupTitle = (g: Group, notes: SnapshotNote[]): string => g.title ?? notes[0]?.text ?? ''

/**
 * Turns a snapshot into what a column renders: loose notes and stacks.
 * Stable: ties keep creation order so lists do not jitter between snapshots.
 */
export function buildColumnItems(s: Pick<Snapshot, 'notes' | 'groups'>, columnId: string, sort: SortMode): ColumnItem[] {
  const byGroup = new Map<string, SnapshotNote[]>()
  const items: ColumnItem[] = []
  for (const n of s.notes) {
    if (n.columnId !== columnId) continue
    if (n.groupId) {
      const list = byGroup.get(n.groupId) ?? []
      list.push(n)
      byGroup.set(n.groupId, list)
    } else {
      items.push({ kind: 'note', key: n.id, note: n, votes: n.votes ?? 0 })
    }
  }
  const order = new Map(s.notes.map((n, i) => [n.id, i]))
  for (const g of s.groups) {
    const notes = byGroup.get(g.id)
    if (!notes?.length) continue
    const votes = notes.reduce((sum, n) => sum + (n.votes ?? 0), 0)
    items.push({ kind: 'group', key: g.id, group: g, notes, votes, title: groupTitle(g, notes) })
  }
  const pos = (i: ColumnItem) => order.get(i.kind === 'note' ? i.note.id : i.notes[0]!.id) ?? 0
  items.sort((a, b) => (sort === 'votes' ? b.votes - a.votes : 0) || pos(a) - pos(b))
  return items
}
