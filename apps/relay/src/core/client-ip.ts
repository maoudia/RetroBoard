/** The deployment settings that decide where the client address comes from. */
export interface ClientIpSettings {
  /** Name of the header to trust (`CF-Connecting-IP` on Cloudflare). Unset: no header is trusted. */
  CLIENT_IP_HEADER?: string
  /** For `X-Forwarded-For`: how many proxies of ours append to it (default 1). The address is read that many entries from the right. */
  TRUSTED_PROXIES?: string
}

/**
 * The address a request is attributed to (page limiter key). Only the header the deployment names is
 * read, so a client cannot choose its own key by sending another forwarding header; without one the
 * socket address is used. Null when neither is known.
 */
export function clientIp(request: Request, settings: ClientIpSettings, socketAddress: string | null): string | null {
  const name = settings.CLIENT_IP_HEADER?.trim()
  if (!name) return socketAddress
  const value = request.headers.get(name)
  if (!value) return socketAddress
  if (name.toLowerCase() !== 'x-forwarded-for') return value.trim() || socketAddress
  const hops = value.split(',').map((h) => h.trim()).filter(Boolean)
  const trusted = Math.max(1, Number.parseInt(settings.TRUSTED_PROXIES ?? '1', 10) || 1)
  return hops[hops.length - trusted] ?? socketAddress
}
