import type { Snapshot } from '@retroboard/domain'
import { SIMILAR_THRESHOLD, similarity } from '../read-models/note-filter'
import { cutOnWord } from './title-suggestions'

export interface SimilarGroupPlan {
  label: string
  noteIds: string[]
}

const LABEL_MAX = 32

/**
 * Preview of "group similar ideas" for one column: loose, unfrozen ideas that look alike (same measure as the
 * similar-idea hint) are chained into one cluster. Deterministic: creation order, union by shared similarity.
 */
export function groupSimilarPlan(s: Pick<Snapshot, 'notes'>, columnId: string): SimilarGroupPlan[] {
  const pool = s.notes.filter((n) => n.columnId === columnId && !n.groupId && !n.frozen)
  const parent = pool.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)))
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      if (similarity(pool[i]!.text, pool[j]!.text) >= SIMILAR_THRESHOLD) parent[find(j)] = find(i)
    }
  }
  const groups = new Map<number, typeof pool>()
  pool.forEach((n, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), n]))
  return [...groups.values()]
    .filter((g) => g.length >= 2)
    .map((g) => ({
      label: cutOnWord([...g].sort((a, b) => a.text.length - b.text.length)[0]!.text.trim(), LABEL_MAX),
      noteIds: g.map((n) => n.id),
    }))
}
