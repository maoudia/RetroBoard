/**
 * Local keyword grouping (change results-insights): the words that come back across ideas, computed on the
 * device with plain counting. No network, no model, nothing leaves the browser.
 */
const STOP_FR = 'a au aux avec ce ces cet cette comme dans de des du elle en et il ils je la le les leur leurs lui ma mais me mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous plus tout tous très trop être avoir est sont était fait faire faut peu bien aussi donc car si y c d j l m n s t'
const STOP_EN = 'a an and are as at be been but by for from had has have he her his i if in into is it its me my no not of on or our she so than that the their them then there these they this to too us was we were what when which who will with you your more very just can could should would about all any also because do does done get got how'
const STOP = new Set(`${STOP_FR} ${STOP_EN}`.split(' '))

export interface Keyword { word: string; count: number }

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu

/** Lower case, accents kept for display but folded for matching, so "equipe" and "équipe" count together. */
const fold = (w: string) => w.normalize('NFD').replace(/\p{M}/gu, '')

/** Drops trailing apostrophes and hyphens with a plain scan: a regex on a long run of them backtracks quadratically. */
export function trimTrailingJoiners(w: string): string {
  let end = w.length
  while (end > 0 && (w[end - 1] === "'" || w[end - 1] === '-')) end--
  return w.slice(0, end)
}

/** Words used in at least `minNotes` different notes, most frequent first. Counts notes, not repeats inside one note. */
export function topKeywords(texts: readonly string[], opts: { minNotes?: number; limit?: number } = {}): Keyword[] {
  const minNotes = opts.minNotes ?? 2
  const limit = opts.limit ?? 8
  const seen = new Map<string, { display: Map<string, number>; count: number }>()
  for (const text of texts) {
    const inThis = new Set<string>()
    for (const raw of text.toLowerCase().match(WORD) ?? []) {
      const w = trimTrailingJoiners(raw)
      const key = fold(w)
      if (key.length < 3 || STOP.has(key) || STOP.has(w) || /^\d+$/.test(key) || inThis.has(key)) continue
      inThis.add(key)
      const e = seen.get(key) ?? { display: new Map<string, number>(), count: 0 }
      e.count++
      e.display.set(w, (e.display.get(w) ?? 0) + 1)
      seen.set(key, e)
    }
  }
  return [...seen.values()]
    .filter((e) => e.count >= minNotes)
    .map((e) => ({ word: [...e.display.entries()].sort((a, b) => b[1] - a[1])[0]![0], count: e.count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit)
}
