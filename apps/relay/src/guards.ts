import { wantsHtml } from './errors'

/** Pages that stay up during maintenance (legal duties) plus the health probe. */
const MAINTENANCE_EXEMPT = new Set(['/healthz', '/legal', '/privacy', '/terms', '/accessibility', '/maintenance', '/busy'])

export function isMaintenance(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true'
}

/** 503 for browser navigations and sockets while MAINTENANCE is on; assets and exempt pages pass. */
export function maintenanceAction(request: Request, pathname: string): 'page' | 'text' | 'pass' {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (MAINTENANCE_EXEMPT.has(path)) return 'pass'
  if (path === '/ws2') return 'text'
  return wantsHtml(request) ? 'page' : 'pass'
}

export const RETRY_AFTER_SECONDS = 30

/**
 * Per-isolate sliding counter. Memory only (no storage), approximate by design: it stops a
 * single client from hammering page loads, it is not a security boundary. Cloudflare rate limiting
 * rules in front of the Worker remain the strong layer.
 */
export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string, now: number): boolean => {
    if (limit <= 0) return true
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > 5000) for (const [k, v] of hits) if (now - (v[v.length - 1] ?? 0) >= windowMs) hits.delete(k)
    return recent.length <= limit
  }
}
