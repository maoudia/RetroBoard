/**
 * "2 h ago", "yesterday", or the date once it is older than a week. Pure: `now` is a parameter.
 * Used for the last opened time of the recent boards (change recent-boards-visible).
 */
export function lastOpenedLabel(at: number, now: number, locale: 'fr' | 'en'): string {
  const diff = Math.max(0, now - at)
  const min = Math.floor(diff / 60_000)
  const rtf = new Intl.RelativeTimeFormat(locale === 'fr' ? 'fr' : 'en', { numeric: 'auto' })
  if (min < 1) return locale === 'fr' ? 'à l\'instant' : 'just now'
  if (min < 60) return rtf.format(-min, 'minute')
  const hours = Math.floor(min / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  if (days < 7) return rtf.format(-days, 'day')
  return new Date(at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short' })
}
