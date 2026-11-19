/** The storage providers a deployment offers (change user-drive-storage). */
export interface ProviderSettings {
  /** The public client id of the Entra app registration of this deployment (a GUID). Unset: OneDrive is not offered. */
  ONEDRIVE_CLIENT_ID?: string
  /** Extra connect-src origins of the provider worker scripts, comma separated: the fake Graph of the e2e harness. Never set in production. */
  FAKE_PROVIDER_ORIGINS?: string
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `/providers.json`: what the page may offer, read at run time because the site is static and a self-hosted image is not rebuilt
 * for each deployment. A client id is public by design (Entra single-page application, no secret). Where a fake provider origin is
 * configured (the e2e harness only), the endpoints point at it and the worker policy allows it.
 */
export function providersResponse(settings: ProviderSettings, head: boolean): Response {
  const clientId = (settings.ONEDRIVE_CLIENT_ID ?? '').trim()
  const fake = (settings.FAKE_PROVIDER_ORIGINS ?? '').split(',')[0]!.trim()
  const body = GUID.test(clientId)
    ? { onedrive: { clientId, ...(fake ? { authority: `${fake}/consumers`, graph: `${fake}/v1.0` } : {}) } }
    : {}
  return new Response(head ? null : JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
