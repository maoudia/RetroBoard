/**
 * The OneDrive worker (change user-drive-storage), built to `/sync/onedrive.js` by `scripts/build-sync-workers.mjs` and served by
 * the Worker with a Content-Security-Policy of its own that names only the Microsoft origins: the network, the access token and
 * the Graph calls live here and nowhere in the page.
 */
import { createWorkerCore } from '../onedrive-worker-core'
import type { WorkerRequest } from '../onedrive-protocol'

const scope = self as unknown as { postMessage(message: unknown, transfer?: Transferable[]): void; onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null }
const handle = createWorkerCore({ fetch: (input, init) => fetch(input, init), emit: (reply) => scope.postMessage(reply) })

scope.onmessage = (event) => {
  // A dedicated worker only hears its own page, whose messages carry no origin: anything else is not ours.
  if (event.origin !== '') return
  void handle(event.data).then((reply) => {
    const found = 'ok' in reply && reply.ok ? reply.value.found : null
    scope.postMessage(reply, found ? [found.bytes.buffer as ArrayBuffer] : [])
  })
}
