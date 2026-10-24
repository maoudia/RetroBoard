/**
 * Cluster title suggestions, computed locally from the cluster's ideas (no AI, no network):
 * the words several ideas share, then the most frequent meaningful words, then the shortest idea.
 */
const STOP = new Set([
  // fr
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'a', 'au', 'aux', 'en', 'dans', 'sur', 'pour', 'par', 'avec', 'sans',
  'est', 'sont', 'pas', 'ne', 'plus', 'trop', 'tres', 'on', 'nous', 'vous', 'il', 'elle', 'ils', 'elles', 'ce', 'ces', 'cette', 'qui', 'que',
  'quoi', 'se', 'sa', 'son', 'ses', 'leur', 'leurs', 'notre', 'nos', 'mon', 'mes', 'ton', 'tes', 'y', 'je', 'tu', 'avoir', 'etre', 'fait', 'faire',
  // en
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'without', 'is', 'are', 'be', 'was', 'were', 'not', 'no', 'too', 'very',
  'we', 'you', 'it', 'they', 'this', 'that', 'these', 'those', 'our', 'my', 'your', 'their', 'at', 'by', 'from', 'as', 'do', 'does', 'did', 'have', 'has', 'more',
])

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const words = (text: string) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? []).filter((w) => w.length > 2 && !STOP.has(fold(w)))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function suggestClusterTitles(texts: readonly string[], max = 3): string[] {
  const docFreq = new Map<string, { n: number; count: number; form: string; pos: number }>()
  let pos = 0
  for (const text of texts) {
    const seen = new Set<string>()
    for (const w of words(text)) {
      const k = fold(w)
      const e = docFreq.get(k) ?? { n: 0, count: 0, form: w, pos: pos++ }
      e.count++
      if (!seen.has(k)) { e.n++; seen.add(k) }
      docFreq.set(k, e)
    }
  }
  // Ties keep the order in which words first appear (reads naturally: "Tests lents", not "Lents tests").
  const ranked = [...docFreq.values()].sort((a, b) => b.n - a.n || b.count - a.count || a.pos - b.pos)
  const out: string[] = []
  const add = (s: string) => { const v = s.trim().slice(0, 60); if (v && !out.some((o) => fold(o) === fold(v))) out.push(v) }
  const shared = ranked.filter((e) => e.n >= 2).map((e) => e.form)
  if (shared.length >= 2) add(cap(`${shared[0]} ${shared[1]}`))
  for (const e of ranked) { if (out.length >= max - 1) break; add(cap(e.form)) }
  const shortest = [...texts].map((t) => t.trim()).filter(Boolean).sort((a, b) => a.length - b.length)[0]
  if (shortest) add(shortest)
  return out.slice(0, max)
}
