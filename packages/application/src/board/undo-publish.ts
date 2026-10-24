import type { SnapshotNote } from '@retroboard/domain'

/** How long the author can take a publication back (change publishing-ux-redesign). */
export const UNDO_WINDOW_MS = 10_000

export interface PublishedItem { readonly columnId: string; readonly text: string; readonly color: number }

/**
 * The notes a publication created: mine, same column and text, created since the publication
 * (the client does not know note ids before the fold returns them). One note per item, the
 * oldest match first, so publishing the same text twice and undoing removes both.
 */
export function publishedNotes(notes: readonly SnapshotNote[], items: readonly PublishedItem[], since: number): SnapshotNote[] {
  const pool = notes.filter((n) => n.mine && n.createdAt >= since).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  const taken = new Set<string>()
  const out: SnapshotNote[] = []
  for (const item of items) {
    const n = pool.find((x) => !taken.has(x.id) && x.columnId === item.columnId && x.text === item.text)
    if (n) { taken.add(n.id); out.push(n) }
  }
  return out
}

/** Whether "Undo" is still offered at `now` for a publication made at `at`. */
export const canUndo = (at: number, now: number): boolean => now - at >= 0 && now - at < UNDO_WINDOW_MS
