/**
 * The page's side of the OneDrive worker (change user-drive-storage): a `SyncTargetPort` whose calls travel as typed messages to
 * `/sync/onedrive.js`, and the few calls that sign in. The worker is started on the first use, so a browser that never connects
 * OneDrive never fetches the script and never opens a connection to Microsoft.
 */
import { type ObjectInfo, type SyncTargetPort, type TargetCapabilities, TargetError } from '@retroboard/application'
import type { OnedriveConfig, WorkerReply, WorkerRequest } from '~/adapters/sync/onedrive-protocol'

export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void
  onmessage: ((event: { data: WorkerReply }) => void) | null
  onerror: ((event: unknown) => void) | null
  terminate(): void
}

export const ONEDRIVE_WORKER_URL = '/sync/onedrive.js'
export const createOnedriveWorker = (): WorkerLike => new Worker(ONEDRIVE_WORKER_URL) as unknown as WorkerLike

export interface OnedriveClient {
  readonly target: SyncTargetPort
  /** Trades the redirect's code for tokens: resolves with the refresh token to keep, if the worker gave one. */
  exchange(code: string, verifier: string): Promise<string | undefined>
  /** A refresh token kept from an earlier session. */
  restore(refreshToken: string): Promise<void>
  /** Called with each refresh token the token endpoint hands out. */
  onRefreshToken(listener: (refreshToken: string) => void): void
  /** Forgets the tokens and ends the worker. */
  forget(): Promise<void>
}

const CAPABILITIES: TargetCapabilities = { conditionalPut: 'etag', atomicPut: true, listsModifiedTime: true, maxObjectBytes: 64 * 1024 * 1024 }

export function createOnedriveClient(config: OnedriveConfig, make: () => WorkerLike = createOnedriveWorker): OnedriveClient {
  let worker: WorkerLike | null = null
  let ready: Promise<void> | null = null
  let next = 1
  const waiting = new Map<number, { resolve: (r: Extract<WorkerReply, { ok: true }>['value']) => void; reject: (e: Error) => void }>()
  let listener: ((refreshToken: string) => void) | null = null

  const lose = (error: Error) => { for (const job of waiting.values()) job.reject(error); waiting.clear(); worker?.terminate(); worker = null; ready = null }

  function start(): WorkerLike {
    if (worker) return worker
    const w = make()
    w.onmessage = ({ data }) => {
      if ('event' in data) { listener?.(data.refreshToken); return }
      const job = waiting.get(data.id)
      waiting.delete(data.id)
      if (!job) return
      if (data.ok) job.resolve(data.value)
      else job.reject(new TargetError(data.code, data.retryAfterMs === undefined ? {} : { retryAfterMs: data.retryAfterMs }))
    }
    // A worker that fails to load (offline, blocked) is a target that cannot be reached, not an exception.
    w.onerror = () => lose(new TargetError('unreachable'))
    return (worker = w)
  }

  type Body<T extends WorkerRequest['op']> = Omit<Extract<WorkerRequest, { op: T }>, 'id' | 'op'>

  async function call<T extends WorkerRequest['op']>(op: T, body: Body<T>, transfer: Transferable[] = []) {
    const w = start()
    ready ??= new Promise<void>((resolve, reject) => {
      const id = next++
      waiting.set(id, { resolve: () => resolve(), reject })
      // A plain copy: the configuration may be a reactive object of the page, which a message cannot carry.
      w.postMessage({ id, op: 'config', config: { clientId: config.clientId, authority: config.authority, graph: config.graph, redirectUri: config.redirectUri } } satisfies WorkerRequest)
    })
    await ready
    return new Promise<Extract<WorkerReply, { ok: true }>['value']>((resolve, reject) => {
      const id = next++
      waiting.set(id, { resolve, reject })
      w.postMessage({ id, op, ...body }, transfer)
    })
  }

  const target: SyncTargetPort = {
    kind: 'onedrive',
    capabilities: CAPABILITIES,
    async *list(prefix) { for (const o of (await call('list', { prefix })).objects ?? []) yield o as ObjectInfo },
    async get(path) { return (await call('get', { path })).found ?? null },
    async put(path, bytes, opts) {
      // Copied, so the caller's array survives the transfer.
      const copy = bytes.slice()
      const out = await call('put', { path, bytes: copy, ...(opts?.ifMatch === undefined ? {} : { ifMatch: opts.ifMatch }) }, [copy.buffer as ArrayBuffer])
      return { etag: out.etag ?? '' }
    },
    async delete(path) { await call('delete', { path }) },
    async stat(path) { return ((await call('stat', { path })).info ?? null) as ObjectInfo | null },
  }

  return {
    target,
    exchange: async (code, verifier) => (await call('exchange', { code, verifier })).refreshToken,
    restore: async (refreshToken) => { await call('restore', { refreshToken }) },
    onRefreshToken: (l) => { listener = l },
    async forget() { if (worker) await call('forget', {}).catch(() => undefined); lose(new TargetError('unreachable')) },
  }
}
