/**
 * What the OneDrive worker does with a message (change user-drive-storage): configure, trade a code for tokens, restore a session,
 * and run one operation of the target. It is a plain function over a `fetch`, so a test drives it in the page; the worker script
 * (`workers/onedrive.ts`) only connects it to `postMessage`.
 */
import { type ObjectInfo, TargetError, type SyncTargetPort } from '@retroboard/application'
import { createGraphTarget, type GraphClientDeps } from '~/adapters/sync/onedrive-graph'
import { createOnedriveAuth, type OnedriveAuth } from '~/adapters/sync/onedrive-auth'
import type { OnedriveConfig, WorkerReply, WorkerRequest, WorkerValue } from '~/adapters/sync/onedrive-protocol'

export interface WorkerCoreDeps {
  readonly fetch: typeof fetch
  readonly emit: (reply: WorkerReply) => void
  readonly now?: () => number
  /** Graph client options a test tunes (fragment size, sleep, conditional mode). */
  readonly graph?: Partial<Pick<GraphClientDeps, 'sleep' | 'random' | 'conditional' | 'fragmentBytes' | 'simpleMaxBytes' | 'attempts' | 'maxInFlight'>>
}

const plain = (o: ObjectInfo) => ({ path: o.path, size: o.size, etag: o.etag, ...(o.modifiedAt === undefined ? {} : { modifiedAt: o.modifiedAt }) })

export function createWorkerCore(deps: WorkerCoreDeps): (request: WorkerRequest) => Promise<WorkerReply> {
  let auth: OnedriveAuth | null = null
  let target: SyncTargetPort | null = null
  let latest: string | undefined

  function configure(config: OnedriveConfig): WorkerValue {
    const a = createOnedriveAuth({
      fetch: deps.fetch, authority: config.authority, clientId: config.clientId, redirectUri: config.redirectUri,
      ...(deps.now ? { now: deps.now } : {}),
      onRefreshToken: (refreshToken) => { latest = refreshToken; deps.emit({ event: 'refresh-token', refreshToken }) },
    })
    auth = a
    target = createGraphTarget({ fetch: deps.fetch, graph: config.graph, token: () => a.accessToken(), invalidate: () => a.invalidate(), ...(deps.now ? { now: deps.now } : {}), ...deps.graph })
    return {}
  }

  /** The session the other operations act on: nothing is possible before the page has configured the worker. */
  function ready(): { auth: OnedriveAuth; target: SyncTargetPort } {
    if (!auth || !target) throw new TargetError('unsupported')
    return { auth, target }
  }

  /** One handler per operation, looked up by name: the message picks a handler, never a branch of the code. */
  const handlers: { [K in WorkerRequest['op']]: (request: Extract<WorkerRequest, { op: K }>) => Promise<WorkerValue> | WorkerValue } = {
    config: (r) => configure(r.config),
    async exchange(r) { latest = undefined; await ready().auth.exchange(r.code, r.verifier); return latest ? { refreshToken: latest } : {} },
    restore(r) { ready().auth.restore(r.refreshToken); return {} },
    forget() { ready().auth.forget(); return {} },
    async list(r) { const objects: ObjectInfo[] = []; for await (const o of ready().target.list(r.prefix)) objects.push(o); return { objects: objects.map(plain) } },
    async get(r) { return { found: await ready().target.get(r.path) } },
    async put(r) { return { etag: (await ready().target.put(r.path, r.bytes, r.ifMatch === undefined ? undefined : { ifMatch: r.ifMatch })).etag } },
    async delete(r) { await ready().target.delete(r.path); return {} },
    async stat(r) { const info = await ready().target.stat(r.path); return { info: info ? plain(info) : null } },
  }

  async function run(request: WorkerRequest): Promise<WorkerValue> {
    const handler = Object.hasOwn(handlers, request.op) ? (handlers[request.op] as (r: WorkerRequest) => Promise<WorkerValue> | WorkerValue) : null
    if (!handler) throw new TargetError('unsupported')
    return handler(request)
  }

  return async (request) => {
    try { return { id: request.id, ok: true, value: await run(request) } } catch (e) {
      // Only the code leaves the worker: a message or a cause could carry a name or a response body.
      const code = e instanceof TargetError ? e.code : 'unreachable'
      return { id: request.id, ok: false, code, ...(e instanceof TargetError && e.retryAfterMs !== undefined ? { retryAfterMs: e.retryAfterMs } : {}) }
    }
  }
}
