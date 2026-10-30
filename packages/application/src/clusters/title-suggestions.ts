/**
 * Cluster title suggestions, computed locally from the cluster's ideas (no AI, no network):
 * a pair of words that go together in several ideas, then the most shared content words (4 letters or more,
 * plurals folded), then the shortest idea cut on a word boundary.
 */
// Stryker disable StringLiteral: word list data; the tests check behaviour on real sentences.
const STOP = new Set([
  // fr
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'a', 'au', 'aux', 'en', 'dans', 'sur', 'pour', 'par', 'avec', 'sans',
  'est', 'sont', 'pas', 'ne', 'plus', 'trop', 'tres', 'on', 'nous', 'vous', 'il', 'elle', 'ils', 'elles', 'ce', 'ces', 'cette', 'qui', 'que',
  'quoi', 'se', 'sa', 'son', 'ses', 'leur', 'leurs', 'notre', 'nos', 'mon', 'mes', 'ton', 'tes', 'y', 'je', 'tu', 'avoir', 'etre', 'fait', 'faire',
  // en
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'without', 'is', 'are', 'be', 'was', 'were', 'not', 'no', 'too', 'very',
  'we', 'you', 'it', 'they', 'this', 'that', 'these', 'those', 'our', 'my', 'your', 'their', 'at', 'by', 'from', 'as', 'do', 'does', 'did', 'have', 'has', 'more',
])
// Stryker restore StringLiteral

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
/** Light plural folding (fr, en): "tests" and "test" count as one word. */
const stem = (w: string) => { const f = fold(w); return f.length > 4 && /[sx]$/.test(f) && !f.endsWith('ss') ? f.slice(0, -1) : f }
const MIN_WORD = 4
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface Token { key: string; form: string; index: number }
/** Content words of one idea with their position among all words (stop words keep their slot, so adjacency is real). */
function tokens(text: string): Token[] {
  const all = text.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? []
  return all.flatMap((w, index) => (w.length >= MIN_WORD && !STOP.has(fold(w)) ? [{ key: stem(w), form: w, index }] : []))
}

/** Cuts on a word boundary (never mid-word unless one word is longer than the limit), without a trailing separator. */
export function cutOnWord(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  const hard = t.slice(0, max)
  const space = hard.lastIndexOf(' ')
  const cut = space > max / 2 ? hard.slice(0, space) : hard
  return cut.replace(/[\s,;:.-]+$/u, '')
}

export function suggestClusterTitles(texts: readonly string[], max = 3): string[] {
  const docs = texts.map(tokens)
  const words = new Map<string, { n: number; count: number; form: string; pos: number }>()
  const pairs = new Map<string, { n: number; adjacent: number; label: string; pos: number }>()
  let pos = 0
  let pairPos = 0
  for (const toks of docs) {
    const seen = new Set<string>()
    for (const t of toks) {
      const e = words.get(t.key) ?? { n: 0, count: 0, form: t.form, pos: pos++ }
      e.count++
      if (!seen.has(t.key)) { e.n++; seen.add(t.key) }
      words.set(t.key, e)
    }
    const seenPairs = new Set<string>()
    for (let i = 0; i < toks.length; i++) {
      for (let j = i + 1; j < toks.length; j++) {
        const a = toks[i]!
        const b = toks[j]!
        if (a.key === b.key) continue
        const k = [a.key, b.key].sort().join('|')
        if (seenPairs.has(k)) continue
        seenPairs.add(k)
        const e = pairs.get(k) ?? { n: 0, adjacent: 0, label: cap(`${a.form} ${b.form}`), pos: pairPos++ }
        e.n++
        if (b.index === a.index + 1) { if (!e.adjacent) e.label = cap(`${a.form} ${b.form}`); e.adjacent++ }
        pairs.set(k, e)
      }
    }
  }
  const out: string[] = []
  const add = (s: string) => { const v = s.slice(0, 60); if (v && !out.some((o) => fold(o) === fold(v))) out.push(v) }
  // Two words that go together in at least two ideas (phrases first); never two unrelated words.
  const pair = [...pairs.values()].filter((p) => p.n >= 2).sort((a, b) => b.adjacent - a.adjacent || b.n - a.n || a.pos - b.pos)[0]
  if (pair) add(pair.label)
  // Ties keep the order in which words first appear (reads naturally: "Tests lents", not "Lents tests").
  const ranked = [...words.values()].sort((a, b) => b.n - a.n || b.count - a.count || a.pos - b.pos)
  for (const e of ranked) { if (out.length >= max - 1) break; add(cap(e.form)) }
  const shortest = [...texts].map((t) => t.trim()).filter(Boolean).sort((a, b) => a.length - b.length)[0]
  if (shortest) add(cutOnWord(shortest, 40))
  return out.slice(0, max)
}
