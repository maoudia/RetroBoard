import type { RelayRoom } from './relay-room'

export interface Env {
  ASSETS: Fetcher
  /** Protocol v2: memory-only forwarder of encrypted envelopes. */
  RELAY: DurableObjectNamespace<RelayRoom>
  /** Extra allowed WebSocket origins, comma separated (local dev with `nuxt dev`). */
  ALLOWED_ORIGINS?: string
  /** Chrome origin trial tokens keyed by host (WebMCP). Public values, not secrets. */
  ORIGIN_TRIAL_TOKENS?: Record<string, string>
}
