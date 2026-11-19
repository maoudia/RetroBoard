/**
 * What the OneDrive worker does with a message (change user-drive-storage): configure, trade a code for tokens, restore a session,
 * and run one operation of the target. It is a plain function over a `fetch`, so a test drives it in the page; the worker script
 * (`workers/onedrive.ts`) only connects it to `postMessage`.
 */
import { type ObjectInfo, TargetError, type SyncTargetPort } from '@retroboard/application'
import { createGraphTarget, type GraphClientDeps } from '~/adapters/sync/onedrive-graph'
import { createOnedriveAuth, type OnedriveAuth } from '~/adapters/sync/onedrive-auth'
import type { WorkerReply, WorkerRequest, WorkerValue } from '~/adapters/sync/onedrive-protocol'

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

  async function run(request: WorkerRequest): Promise<WorkerValue> {
    if (request.op === 'config') {
      const { config } = request
      auth = createOnedriveAuth({
        fetch: deps.fetch, authority: config.authority, clientId: config.clientId, redirectUri: config.redirectUri,
        ...(deps.now ? { now: deps.now } : {}),
        onRefreshToken: (refreshToken) => { latest = refreshToken; deps.emit({ event: 'refresh-token', refreshToken }) },
      })
      const a = auth
      target = createGraphTarget({ fetch: deps.fetch, graph: config.graph, token: () => a.accessToken(), invalidate: () => a.invalidate(), ...(deps.now ? { now: deps.now } : {}), ...deps.graph })
      return {}
    }
    if (!auth || !target) throw new TargetError('unsupported')
    switch (request.op) {
      case 'exchange': latest = undefined; await auth.exchange(request.code, request.verifier); return latest ? { refreshToken: latest } : {}
      case 'restore': auth.restore(request.refreshToken); return {}
      case 'forget': auth.forget(); return {}
      case 'list': { const objects: ObjectInfo[] = []; for await (const o of target.list(request.prefix)) objects.push(o); return { objects: objects.map(plain) } }
      case 'get': return { found: await target.get(request.path) }
      case 'put': return { etag: (await target.put(request.path, request.bytes, request.ifMatch === undefined ? undefined : { ifMatch: request.ifMatch })).etag }
      case 'delete': await target.delete(request.path); return {}
      case 'stat': { const info = await target.stat(request.path); return { info: info ? plain(info) : null } }
    }
  }

  return async (request) => {
    try { return { id: request.id, ok: true, value: await run(request) } } catch (e) {
      // Only the code leaves the worker: a message or a cause could carry a name or a response body.
      const code = e instanceof TargetError ? e.code : 'unreachable'
      return { id: request.id, ok: false, code, ...(e instanceof TargetError && e.retryAfterMs !== undefined ? { retryAfterMs: e.retryAfterMs } : {}) }
    }
  }
}
