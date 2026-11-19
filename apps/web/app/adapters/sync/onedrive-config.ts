/**
 * What this deployment offers for OneDrive (change user-drive-storage): the public client id of its Microsoft Entra app
 * registration, from `/providers.json` (a Worker setting, read at run time: the site is static and a self-hosted image is not
 * rebuilt for each deployment) or, failing that, the build-time `NUXT_PUBLIC_ONEDRIVE_CLIENT_ID`. Empty means the provider is
 * not offered at all. The endpoints are Microsoft's; only the e2e harness points them at a fake.
 */
import type { OnedriveConfig } from '~/adapters/sync/onedrive-protocol'

/** Personal Microsoft accounts only: the app folder permission is not available to work or school accounts (the spike of 3.1). */
export const DEFAULT_AUTHORITY = 'https://login.microsoftonline.com/consumers'
export const DEFAULT_GRAPH = 'https://graph.microsoft.com/v1.0'
export const CALLBACK_PATH = '/storage/callback'
/** What the person sees the folder called in their OneDrive (the name of the app registration). */
export const ONEDRIVE_FOLDER = 'Apps/RetroBoard'
/** Where a person removes the app's access: Microsoft offers an app no way to revoke its own refresh token. */
export const MICROSOFT_APP_ACCESS_URL = 'https://account.microsoft.com/privacy/app-access'

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ProvidersJson { onedrive?: { clientId?: unknown; authority?: unknown; graph?: unknown } }

const text = (v: unknown, fallback: string): string => (typeof v === 'string' && /^https?:\/\//.test(v) ? v.replace(/\/+$/, '') : fallback)

/** The configuration to offer, or null when no client id is set (or the one set is not a GUID). */
export function onedriveConfig(json: unknown, buildTimeClientId: string, origin: string): OnedriveConfig | null {
  const served = (json as ProvidersJson | null)?.onedrive
  const clientId = typeof served?.clientId === 'string' && served.clientId !== '' ? served.clientId : buildTimeClientId
  if (!GUID.test(clientId.trim())) return null
  return {
    clientId: clientId.trim(),
    authority: text(served?.authority, DEFAULT_AUTHORITY),
    graph: text(served?.graph, DEFAULT_GRAPH),
    redirectUri: `${origin}${CALLBACK_PATH}`,
  }
}
