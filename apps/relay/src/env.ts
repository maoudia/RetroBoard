import type { RelayRoom } from './adapters/cloudflare'
import type { Settings } from './core/http'

/** The Worker environment: the deployment settings plus the two Cloudflare bindings. */
export interface Env extends Settings {
  ASSETS: Fetcher
  /** Protocol v2: memory-only forwarder of encrypted envelopes. */
  RELAY: DurableObjectNamespace<RelayRoom>
}
