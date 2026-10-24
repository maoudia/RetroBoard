import type { Room } from './room'

export interface Env {
  ASSETS: Fetcher
  ROOM: DurableObjectNamespace<Room>
  /** Extra allowed WebSocket origins, comma separated (local dev with `nuxt dev`). */
  ALLOWED_ORIGINS?: string
}
