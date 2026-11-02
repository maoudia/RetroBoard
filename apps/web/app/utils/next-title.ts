/**
 * Suggests the title of the next retro from the previous one (change board-creation-v2, task 1.2):
 * "Sprint 42" becomes "Sprint 43", "Retro S12 - Team A" becomes "Retro S13 - Team A".
 * Titles holding a date ("Retro 01/11") or no small number give nothing: the dated default stays.
 */
export function nextTitle(previous: string | null | undefined): string | null {
  const title = (previous ?? '').trim()
  if (!title || /\d{1,2}[/.-]\d{1,2}/.test(title)) return null
  const m = /^(.*?)(\d{1,3})(\D*)$/.exec(title)
  if (!m) return null
  const [, head, digits, tail] = m as unknown as [string, string, string, string]
  return `${head}${Number(digits) + 1}${tail}`
}
