import type { Snapshot } from '@retroboard/domain'

export interface AuthorGroupPlan {
  author: string
  noteIds: string[]
}

/**
 * Preview of "group by author" for one column: every named author with at least two loose ideas gets one cluster.
 * Anonymous, already clustered and frozen ideas stay where they are. Authors keep first-idea order (stable).
 */
export function groupByAuthorPlan(s: Pick<Snapshot, 'notes'>, columnId: string): AuthorGroupPlan[] {
  const byAuthor = new Map<string, { author: string; noteIds: string[] }>()
  for (const n of s.notes) {
    if (n.columnId !== columnId || n.groupId || n.frozen) continue
    const author = n.author?.trim()
    if (!author) continue
    const key = author.toLowerCase()
    const entry = byAuthor.get(key) ?? { author, noteIds: [] }
    entry.noteIds.push(n.id)
    byAuthor.set(key, entry)
  }
  return [...byAuthor.values()].filter((p) => p.noteIds.length >= 2)
}
