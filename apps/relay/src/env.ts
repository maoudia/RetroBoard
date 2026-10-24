import type { Room } from './room'

export interface Env {
  ASSETS: Fetcher
  ROOM: DurableObjectNamespace<Room>
  /** Extra allowed WebSocket origins, comma separated (local dev with `nuxt dev`). */
  ALLOWED_ORIGINS?: string
  /** Chrome origin trial tokens keyed by host (WebMCP). Public values, not secrets. */
  ORIGIN_TRIAL_TOKENS?: Record<string, string>
}
