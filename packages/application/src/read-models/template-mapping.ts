import { mapColumns } from '@retroboard/domain'

export interface MappingRow { to: string; from: string[] }

/**
 * Preview of a format change that keeps the notes ("Went wrong + Ideas -> Change"): which old columns
 * land in each new one. Uses the domain mapping, so the preview is exactly what every peer will do.
 * Only new columns that receive notes from old columns are listed first; empty new columns follow with no sources.
 */
export function templateMapping(oldTitles: readonly string[], newTitles: readonly string[]): MappingRow[] {
  if (!newTitles.length) return []
  const map = mapColumns(oldTitles.map((_, i) => String(i)), newTitles.map((_, i) => String(i)))
  const rows: MappingRow[] = newTitles.map((to) => ({ to, from: [] }))
  oldTitles.forEach((title, i) => { rows[Number(map[String(i)])]!.from.push(title) })
  return rows
}
