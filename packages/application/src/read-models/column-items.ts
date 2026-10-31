import type { Snapshot, SnapshotGroup, SnapshotNote } from '@retroboard/domain'
import { cutOnWord } from '../clusters/title-suggestions'

export type ColumnItem =
  | { kind: 'note'; key: string; note: SnapshotNote; votes: number }
  | { kind: 'group'; key: string; group: SnapshotGroup; notes: SnapshotNote[]; votes: number; title: string }

/** 'time' is oldest first (creation order), the default. */
export type SortMode = 'time' | 'newest' | 'votes' | 'author' | 'color' | 'size' | 'alpha'
export const SORT_MODES: readonly SortMode[] = ['time', 'newest', 'votes', 'author', 'color', 'size', 'alpha']

const DEFAULT_TITLE_MAX = 40
/** Named title, else the shortest idea cut to 40 characters on a word boundary (read model only, nothing stored). */
export const groupTitle = (g: Pick<SnapshotGroup, 'title'>, notes: SnapshotNote[]): string => {
  if (g.title) return g.title
  const shortest = notes.map((n) => n.text.trim()).filter(Boolean).sort((a, b) => a.length - b.length)[0]
  return shortest ? cutOnWord(shortest, DEFAULT_TITLE_MAX) : ''
}

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
    // The cluster score comes from the domain: its own votes plus its notes' votes.
    const votes = g.votes ?? 0
    items.push({ kind: 'group', key: g.id, group: g, notes, votes, title: groupTitle(g, notes) })
  }
  const pos = (i: ColumnItem) => order.get(i.kind === 'note' ? i.note.id : i.notes[0]!.id) ?? 0
  const first = (i: ColumnItem) => (i.kind === 'note' ? i.note : i.notes[0]!)
  const text = (i: ColumnItem) => (i.kind === 'note' ? i.note.text : i.title).trim().toLowerCase()
  const author = (i: ColumnItem) => first(i).author?.trim().toLowerCase() ?? ''
  const by: Record<SortMode, (a: ColumnItem, b: ColumnItem) => number> = {
    time: () => 0,
    newest: (a, b) => pos(b) - pos(a),
    votes: (a, b) => b.votes - a.votes,
    // Anonymous notes go last.
    author: (a, b) => (author(a) === author(b) ? 0 : !author(a) ? 1 : !author(b) ? -1 : author(a).localeCompare(author(b))),
    color: (a, b) => first(a).color - first(b).color,
    size: (a, b) => (b.kind === 'group' ? b.notes.length : 1) - (a.kind === 'group' ? a.notes.length : 1),
    alpha: (a, b) => text(a).localeCompare(text(b)),
  }
  items.sort((a, b) => by[sort](a, b) || pos(a) - pos(b))
  return items
}
