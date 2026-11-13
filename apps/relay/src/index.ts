import { RelayRoom } from './adapters/cloudflare'
import type { Env } from './env'
import { clientIp } from './core/client-ip'
import { handleHttp } from './core/http'

export { RelayRoom }

/** The Cloudflare wiring of the HTTP handler: the assets binding, the Durable Object namespace and the configured client header. */
export default {
  fetch: (request, env): Promise<Response> => handleHttp(request, {
    assets: env.ASSETS,
    settings: env,
    clientIp: clientIp(request, env, null),
    relay: (req, room, rh) => {
      const stub = env.RELAY.get(env.RELAY.idFromName(room))
      const headers = new Headers(req.headers)
      headers.set('x-room-hash', rh)
      return stub.fetch(new Request(req.url, { headers, method: 'GET' }))
    },
  }),
} satisfies ExportedHandler<Env>
