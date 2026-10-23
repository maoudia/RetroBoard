/** WebSocket upgrades are only accepted from the site itself, or from origins listed in ALLOWED_ORIGINS. */
export function isAllowedOrigin(origin: string | null, url: URL, extra: string | undefined): boolean {
  if (!origin) return false
  try {
    if (new URL(origin).host === url.host) return true
  } catch { return false }
  return (extra ?? '').split(',').map((s) => s.trim()).filter(Boolean).includes(origin)
}
