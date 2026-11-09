/**
 * The clock time of an event ("11:22 PM", "23:22") in the language of the app, two digits for the hour and the minutes.
 * The one formatter of the list panels (history, activity, chat); pair it with `font-variant-numeric: tabular-nums`
 * so the times line up in a column (change history-panel-phone-layout).
 */
export function formatClock(at: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(at))
}
