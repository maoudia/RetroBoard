/**
 * The page's side of the key-derivation worker (`kdf-worker.ts`): installs itself as the crypto layer's off-thread deriver.
 * Where there is no `Worker` (an old browser, a test) nothing is installed and the derivation runs in the page as before.
 */
import { type Bytes, type KdfParams, useWrapKeyDeriver } from '@retroboard/crypto'

interface Reply { id: number; key?: Bytes; error?: string }

export interface WorkerLike {
  postMessage(message: unknown): void
  onmessage: ((event: { data: Reply }) => void) | null
  onerror: ((event: unknown) => void) | null
  terminate(): void
}

/** Starts the worker on first use and ends it a moment after the last answer, so an idle page holds no thread. */
export function installKdfWorker(make: () => WorkerLike, idleMs = 30_000): () => void {
  let worker: WorkerLike | null = null
  let idle: ReturnType<typeof setTimeout> | null = null
  let next = 1
  const waiting = new Map<number, { resolve: (k: Bytes) => void; reject: (e: Error) => void }>()

  const end = () => { worker?.terminate(); worker = null; if (idle) clearTimeout(idle); idle = null }
  function start(): WorkerLike {
    if (worker) return worker
    const w = make()
    w.onmessage = ({ data }) => {
      const job = waiting.get(data.id)
      waiting.delete(data.id)
      if (data.key) job?.resolve(data.key)
      else job?.reject(new Error(data.error ?? 'derivation-failed'))
      if (waiting.size === 0) idle = setTimeout(end, idleMs)
    }
    w.onerror = () => { for (const job of waiting.values()) job.reject(new Error('derivation-failed')); waiting.clear(); end() }
    return (worker = w)
  }

  useWrapKeyDeriver((secret: Uint8Array, salt: Uint8Array, kdf: KdfParams) => new Promise<Bytes>((resolve, reject) => {
    if (idle) { clearTimeout(idle); idle = null }
    const id = next++
    waiting.set(id, { resolve, reject })
    start().postMessage({ id, secret, salt, kdf })
  }))
  return () => { useWrapKeyDeriver(null); end() }
}

/** The real worker, when the browser has one. */
export const createKdfWorker = (): WorkerLike => new Worker(new URL('./kdf-worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike
