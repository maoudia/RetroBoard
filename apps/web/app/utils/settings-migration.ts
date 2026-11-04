export type ThemeVariantPref = 'theme' | 'light' | 'dark' | 'system'

/** Settings stored by older versions: the personal theme ('themeMode', 'myTheme') is gone. */
export function migrate(stored: Record<string, unknown>): Record<string, unknown> {
  const { themeMode: _mode, myTheme: _mine, ...rest } = stored
  const variant = rest.variant
  if (variant !== undefined && !['theme', 'light', 'dark', 'system'].includes(variant as string)) delete rest.variant
  if (rest.uiMode !== undefined && rest.uiMode !== 'simple' && rest.uiMode !== 'advanced') delete rest.uiMode
  // "While the tab is open" (0) is gone: a board must survive closing the tab, or it is lost when nobody else is online.
  if (rest.retentionDays === 0) rest.retentionDays = -1
  return rest as Record<string, unknown>
}
