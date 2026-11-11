/**
 * Personal settings as a file (change export-destinations-v2): export from one browser, import in another.
 * Pure functions: only known keys with the type of their default are accepted, so a hand-edited or foreign file
 * can never inject anything into the settings store.
 */
export const SETTINGS_FILE_FORMAT = 'retroboard-settings'
export const SETTINGS_FILE_VERSION = 1

/** Secrets of this device: never written to a settings file (it gets shared) and never read from one. */
const DEVICE_ONLY = ['slackWebhook']

export interface SettingsFile { format: typeof SETTINGS_FILE_FORMAT; version: typeof SETTINGS_FILE_VERSION; exportedAt: string; settings: Record<string, unknown> }

export function buildSettingsFile(settings: Readonly<Record<string, unknown>>, now: Date): string {
  const file: SettingsFile = { format: SETTINGS_FILE_FORMAT, version: SETTINGS_FILE_VERSION, exportedAt: now.toISOString(), settings: Object.fromEntries(Object.entries(settings).filter(([k]) => !DEVICE_ONLY.includes(k))) }
  return `${JSON.stringify(file, null, 2)}\n`
}

/** The settings of a file, or null when it is not a settings file of this version. Unknown keys and wrong types are dropped. */
export function parseSettingsFile(text: string, defaults: Readonly<Record<string, unknown>>): Record<string, unknown> | null {
  let data: unknown
  try { data = JSON.parse(text) } catch { return null }
  if (typeof data !== 'object' || data === null) return null
  const f = data as Partial<SettingsFile>
  if (f.format !== SETTINGS_FILE_FORMAT || f.version !== SETTINGS_FILE_VERSION) return null
  if (typeof f.settings !== 'object' || f.settings === null || Array.isArray(f.settings)) return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(f.settings)) {
    if (!Object.hasOwn(defaults, k) || DEVICE_ONLY.includes(k)) continue
    const d = defaults[k]
    if (d === null ? v === null || typeof v === 'string' : typeof v === typeof d) out[k] = v
  }
  return out
}
