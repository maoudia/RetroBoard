export type ThemeVariantPref = 'theme' | 'light' | 'dark' | 'system'

/** Settings stored by older versions: the personal theme ('themeMode', 'myTheme') is gone. */
export function migrate(stored: Record<string, unknown>): Record<string, unknown> {
  const { themeMode: _mode, myTheme: _mine, ...rest } = stored
  const variant = rest.variant
  if (variant !== undefined && !['theme', 'light', 'dark', 'system'].includes(variant as string)) delete rest.variant
  if (rest.uiMode !== undefined && rest.uiMode !== 'simple' && rest.uiMode !== 'advanced') delete rest.uiMode
  return rest as Record<string, unknown>
}
