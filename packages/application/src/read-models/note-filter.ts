/**
 * Personal view filters and the similar-idea hint (change postit-visual-system). Computed on the
 * device only: filtering never changes the board for the others.
 */
import { NOTE_COLOR_COUNT, type SnapshotNote } from '@retroboard/domain'
import type { ColumnItem } from './column-items'

export interface NoteFilter {
  readonly text: string
  /** Note colours to keep; empty: all. */
  readonly colors: readonly number[]
  /** Author label to keep (as shown on notes); null: all. */
  readonly author: string | null
  /** Only notes (or clusters) with at least one vote. */
  readonly voted: boolean
}

export const EMPTY_FILTER: NoteFilter = { text: '', colors: [], author: null, voted: false }

export const foldText = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export const isFilterActive = (f: NoteFilter): boolean => f.text.trim() !== '' || f.colors.length > 0 || f.author !== null || f.voted

export function matchesFilter(n: SnapshotNote, f: NoteFilter): boolean {
  const q = foldText(f.text.trim())
  if (q && !foldText(n.text).includes(q)) return false
  if (f.colors.length && !f.colors.includes(n.color % NOTE_COLOR_COUNT)) return false
  if (f.author !== null && n.author !== f.author) return false
  if (f.voted && !((n.votes ?? 0) > 0 || n.voted)) return false
  return true
}

/**
 * Column items left by a filter. A cluster stays when its title matches the text or one of its
 * notes matches, and then shows only the matching notes (all of them when the title matched).
 */
export function filterItems(items: readonly ColumnItem[], f: NoteFilter): ColumnItem[] {
  if (!isFilterActive(f)) return [...items]
  const out: ColumnItem[] = []
  for (const it of items) {
    if (it.kind === 'note') {
      if (matchesFilter(it.note, f)) out.push(it)
      continue
    }
    // "Has votes" applies to the cluster as a whole (its score includes its notes' votes).
    if (f.voted && it.votes <= 0) continue
    const titleHit = f.text.trim() !== '' && foldText(it.title).includes(foldText(f.text.trim()))
    const notes = it.notes.filter((n) => matchesFilter(n, { ...f, text: titleHit ? '' : f.text, voted: false }))
    if (notes.length) out.push({ ...it, notes })
  }
  return out
}

// ----- Similar ideas -----

// Stryker disable StringLiteral: word list data; behaviour is tested on real sentences.
const STOP = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'au', 'aux', 'en', 'dans', 'sur', 'pour', 'par', 'avec', 'sans',
  'est', 'sont', 'pas', 'ne', 'plus', 'trop', 'tres', 'on', 'nous', 'vous', 'il', 'elle', 'ils', 'elles', 'ce', 'ces', 'cette', 'qui', 'que',
  'se', 'sa', 'son', 'ses', 'leur', 'notre', 'nos', 'je', 'tu', 'fait', 'faire', 'trop', 'peu', 'bien', 'mal',
  'the', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'be', 'was', 'not', 'no', 'too', 'very',
  'we', 'you', 'it', 'they', 'this', 'that', 'our', 'my', 'your', 'at', 'by', 'from', 'as', 'do', 'does', 'have', 'has', 'more', 'so',
  'mais', 'donc', 'car', 'ca', 'cela', 'etre', 'avoir', 'ete', 'a', 'y', 'toujours', 'souvent', 'parfois', 'beaucoup', 'tout', 'tous', 'toute', 'toutes', 'aussi', 'encore',
  'but', 'been', 'were', 'will', 'would', 'should', 'could', 'can', 'all', 'some', 'any', 'also', 'just', 'always', 'often', 'still', 'lot', 'lots', 'their', 'there', 'than', 'then',
])
// Stryker restore StringLiteral

/** Crude stemmer: plurals (s, x, es) and the commonest English endings, so "meetings" ~ "meeting" and "deployed" ~ "deploy". */
function stem(w: string): string {
  let r = w
  if (r.length > 4 && r.endsWith('es')) r = r.slice(0, -2)
  else if (r.length > 3 && (r.endsWith('s') || r.endsWith('x'))) r = r.slice(0, -1)
  if (r.length > 5 && r.endsWith('ing')) r = r.slice(0, -3)
  else if (r.length > 4 && r.endsWith('ed')) r = r.slice(0, -2)
  return r.length > 3 && r.endsWith('e') ? r.slice(0, -1) : r
}

/** Meaningful tokens: folded, stop words out, plurals and endings stemmed. */
export function tokens(text: string): Set<string> {
  const out = new Set<string>()
  for (const w of foldText(text).match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (w.length < 2 || STOP.has(w)) continue
    out.add(stem(w))
  }
  return out
}

const grams = (w: string): Set<string> => {
  const p = `^${w}$`
  const g = new Set<string>()
  for (let i = 0; i + 3 <= p.length; i++) g.add(p.slice(i, i + 3))
  return g
}

/** How alike two words are: 1 when equal, a Dice score on character trigrams for typos and close forms (0 under 0.7). */
function wordMatch(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 5 || b.length < 5) return 0
  const ga = grams(a)
  const gb = grams(b)
  let shared = 0
  for (const g of ga) if (gb.has(g)) shared++
  const dice = (2 * shared) / (ga.size + gb.size)
  return dice >= 0.7 ? dice : 0
}

/**
 * Soft overlap: each word of the smaller idea counts for its best match in the other (typos and close forms
 * count a little less than exact words). A one-word idea only matches a long sentence weakly.
 */
export function similarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.size || !tb.size) return 0
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta]
  let score = 0
  for (const w of small) {
    if (big.has(w)) { score += 1; continue }
    let best = 0
    for (const o of big) best = Math.max(best, wordMatch(w, o))
    score += best
  }
  const overlap = score / small.size
  return small.size === 1 && big.size > 2 ? overlap * 0.6 : overlap
}

export const SIMILAR_THRESHOLD = 0.75

/** Published ideas of a column that look like the draft being written, most similar first (3 max). */
export function similarIdeas(draft: string, notes: readonly SnapshotNote[], columnId: string, max = 3): SnapshotNote[] {
  if (tokens(draft).size === 0) return []
  return notes
    .filter((n) => n.columnId === columnId)
    .map((n) => ({ n, s: similarity(draft, n.text) }))
    .filter((x) => x.s >= SIMILAR_THRESHOLD)
    .sort((x, y) => y.s - x.s || x.n.createdAt - y.n.createdAt)
    .slice(0, max)
    .map((x) => x.n)
}
