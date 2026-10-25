import type { RelayRoom } from './relay-room'

export interface Env {
  ASSETS: Fetcher
  /** Protocol v2: memory-only forwarder of encrypted envelopes. */
  RELAY: DurableObjectNamespace<RelayRoom>
  /** Extra allowed WebSocket origins, comma separated (local dev with `nuxt dev`). */
  /** "1" switches the site to maintenance mode (503 + Retry-After). */
  MAINTENANCE?: string
  /** HTML navigations allowed per client and minute before the "too many requests" page. 0 disables. Default 300. */
  RATE_LIMIT_PER_MIN?: string
  ALLOWED_ORIGINS?: string
  /** Chrome origin trial tokens keyed by host (WebMCP). Public values, not secrets. */
  ORIGIN_TRIAL_TOKENS?: Record<string, string>
}
