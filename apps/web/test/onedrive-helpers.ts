import { type FakeGraph, type FakeGraphOptions, createFakeGraph } from '@retroboard/testkit'
import { createOnedriveAuth } from '../app/adapters/sync/onedrive-auth'
import { type GraphClientDeps, createGraphTarget } from '../app/adapters/sync/onedrive-graph'
import { authorizeUrl, challengeOf, newVerifier } from '../app/adapters/sync/oauth-pkce'
import { createWorkerCore } from '../app/adapters/sync/onedrive-worker-core'
import type { WorkerLike } from '../app/adapters/sync/onedrive-client'
import type { WorkerReply, WorkerRequest } from '../app/adapters/sync/onedrive-protocol'

export const PAGE = 'http://127.0.0.1:8787'
export const REDIRECT = `${PAGE}/storage/callback`
export const bytesOf = (n: number, seed = 7): Uint8Array => {
  const out = new Uint8Array(n)
  let x = seed
  for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; out[i] = x >> 16 }
  return out
}

/** The fake provider with a clock a test moves, and the authorization code a redirect would bring back. */
export async function fakeWithCode(options: FakeGraphOptions = {}, shared?: { fake: FakeGraph; clock: { now: number } }) {
  const clock = shared?.clock ?? { now: 1_700_000_000_000 }
  const fake = shared?.fake ?? createFakeGraph({ redirectUris: [REDIRECT], now: () => clock.now, ...options })
  const verifier = newVerifier()
  const url = authorizeUrl({ authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT, state: 'state-1', challenge: await challengeOf(verifier), prompt: 'select_account' })
  const code = new URL((await fake.fetch(url)).headers.get('Location')!).searchParams.get('code')!
  return { fake, clock, verifier, code }
}

export interface Connected {
  readonly fake: FakeGraph
  readonly clock: { now: number }
  readonly refreshTokens: string[]
  readonly sleeps: number[]
  /** The next request fails as the network would, once. */
  dropNext(match?: (url: string, init?: RequestInit) => boolean): void
  /** Runs before every request leaves, and the request waits for it (to measure concurrency). */
  hold(before: () => Promise<void>): void
  readonly target: ReturnType<typeof createGraphTarget>
  readonly auth: ReturnType<typeof createOnedriveAuth>
}

/** A signed-in adapter over the fake: the same path the page takes (authorize, token exchange, Graph with a bearer token). */
export async function connect(options: FakeGraphOptions & { graph?: Partial<GraphClientDeps>; shared?: { fake: FakeGraph; clock: { now: number } } } = {}): Promise<Connected> {
  const { graph: graphOptions, shared, ...fakeOptions } = options
  const { fake, clock, verifier, code } = await fakeWithCode(fakeOptions, shared)
  const page = fake.fetchFrom(PAGE)
  let drop: ((url: string, init?: RequestInit) => boolean) | null = null
  let before: (() => Promise<void>) | null = null
  const fetchWithDrops = (async (url: string, init?: RequestInit) => {
    if (drop?.(String(url), init)) { drop = null; throw new TypeError('Failed to fetch') }
    await before?.()
    return page(url, init)
  }) as typeof fetch
  const refreshTokens: string[] = []
  const auth = createOnedriveAuth({ fetch: fetchWithDrops, authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT, now: () => clock.now, onRefreshToken: (t) => refreshTokens.push(t) })
  await auth.exchange(code, verifier)
  const sleeps: number[] = []
  const target = createGraphTarget({
    fetch: fetchWithDrops, graph: fake.graph, token: () => auth.accessToken(), invalidate: () => auth.invalidate(), now: () => clock.now,
    sleep: async (ms) => { sleeps.push(ms) }, random: () => 1, ...graphOptions,
  })
  return { fake, clock, refreshTokens, sleeps, target, auth, dropNext: (match = () => true) => { drop = match }, hold: (fn) => { before = fn } }
}

/** The OneDrive worker, in the page: messages are structured-cloned both ways, as `postMessage` would. */
export function loopbackWorker(fetchImpl: typeof fetch, graph: Parameters<typeof createWorkerCore>[0]['graph'] = {}): WorkerLike & { readonly sent: WorkerRequest[] } {
  const sent: WorkerRequest[] = []
  const worker: WorkerLike & { sent: WorkerRequest[] } = {
    sent, onerror: null, onmessage: null, terminate() { /* nothing to end */ },
    postMessage(message: unknown) {
      const request = structuredClone(message) as WorkerRequest
      sent.push(request)
      void handle(request).then((reply) => queueMicrotask(() => worker.onmessage?.({ data: structuredClone(reply) })))
    },
  }
  const handle = createWorkerCore({ fetch: fetchImpl, emit: (reply: WorkerReply) => queueMicrotask(() => worker.onmessage?.({ data: structuredClone(reply) })), graph })
  return worker
}
