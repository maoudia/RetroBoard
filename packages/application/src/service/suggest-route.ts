/**
 * Typo suggestions for the 404 page (change service-pages): which known route did the visitor
 * most likely mean? Pure; runs on the device, nothing is sent anywhere.
 */

/** Optimal string alignment distance: insert, delete, substitute and swap of two neighbours. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0]![j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1)
    }
  }
  return d[a.length]![b.length]!
}

/** Known routes close to the requested path (first segment only), best first, at most `max`. */
export function suggestRoutes(path: string, routes: readonly string[], max = 2): string[] {
  const seg = path.split(/[?#]/)[0]!.split('/').filter(Boolean)[0]?.toLowerCase() ?? ''
  if (!seg) return []
  // Short names tolerate one slip, longer ones two.
  const limit = seg.length <= 4 ? 1 : 2
  return routes
    .map((r) => ({ r, d: editDistance(seg, r.replace(/^\//, '').toLowerCase()) }))
    .filter((x) => x.r !== '/' && x.d > 0 && x.d <= limit)
    .sort((a, b) => a.d - b.d || a.r.localeCompare(b.r))
    .slice(0, max)
    .map((x) => x.r)
}
