/**
 * `SyncTargetPort` over Microsoft Graph and the app folder of a OneDrive personal account (change user-drive-storage, design
 * "OneDrive adapter"). It runs inside the provider worker (`/sync/onedrive.js`, its own Content-Security-Policy) and moves bytes
 * the vault layer has already sealed: no key, no plaintext, and a path that is a hash.
 *
 * What Microsoft documents, and what this follows: the vault lives under `/me/drive/special/approot` (never addressed by its
 * visible name, which the person may rename); a download goes through the pre-authenticated `@microsoft.graph.downloadUrl`
 * (the `/content` redirect cannot cross a CORS preflight), without credentials; a conditional write goes through an upload
 * session, the one place `If-Match` and `conflictBehavior` are documented (`conditional: 'simple'` uses a plain `PUT` instead,
 * once the owner's live check shows it honours them); fragments are a multiple of 320 KiB and carry no `Authorization`.
 * Throttling (429, 503, 509) honours `Retry-After` and otherwise backs off; every failure leaves as a `TargetError`.
 */
import {
  type ObjectInfo, type ObjectPath, type PutOptions, type SyncTargetPort, type TargetCapabilities, TargetError,
  isObjectPath, isObjectPrefix,
} from '@retroboard/application'

export const FRAGMENT_UNIT = 320 * 1024
const MIB = 1024 * 1024

export interface GraphClientDeps {
  readonly fetch: typeof fetch
  /** `https://graph.microsoft.com/v1.0`. */
  readonly graph: string
  /** A current access token; throws a `TargetError` (`auth-expired` when the person must sign in again). */
  readonly token: () => Promise<string>
  /** The access token was refused: the next `token()` gets a new one. */
  readonly invalidate: () => void
  readonly sleep?: (ms: number) => Promise<void>
  readonly random?: () => number
  readonly now?: () => number
  /** How a write with a precondition travels: through an upload session (documented) or a simple `PUT` (to confirm live). */
  readonly conditional?: 'session' | 'simple'
  /** Fragment size of an upload session: a multiple of 320 KiB, below 60 MiB (default 5 MiB). */
  readonly fragmentBytes?: number
  /** Above this a write goes through an upload session (default 4 MiB). */
  readonly simpleMaxBytes?: number
  readonly maxInFlight?: number
  readonly attempts?: number
}

const CAPABILITIES: TargetCapabilities = { conditionalPut: 'etag', atomicPut: true, listsModifiedTime: true, maxObjectBytes: 64 * MIB }

/** A wait longer than this is not worth holding a pass for: the scheduler backs off for that long instead. */
const MAX_AUTO_WAIT_MS = 30_000
const BACKOFF_BASE_MS = 1_000
const BACKOFF_MAX_MS = 60_000
const THROTTLED = new Set([429, 503, 509])

/** Seconds or an HTTP date, in milliseconds; null when absent or unreadable (a browser only shows it when the host exposes it). */
export function parseRetryAfter(value: string | null, now: number): number | null {
  if (value === null || value.trim() === '') return null
  if (/^\d+$/.test(value.trim())) return Number(value.trim()) * 1000
  const at = Date.parse(value)
  return Number.isNaN(at) ? null : Math.max(0, at - now)
}

interface DriveItem {
  id?: string
  name?: string
  size?: number
  eTag?: string
  lastModifiedDateTime?: string
  folder?: unknown
  file?: unknown
  '@microsoft.graph.downloadUrl'?: string
}

const SELECT_LIST = 'id,name,size,eTag,lastModifiedDateTime,file,folder'

export function createGraphTarget(deps: GraphClientDeps): SyncTargetPort {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const random = deps.random ?? Math.random
  const now = deps.now ?? Date.now
  const mode = deps.conditional ?? 'session'
  const fragmentBytes = deps.fragmentBytes ?? 5 * MIB
  const simpleMax = deps.simpleMaxBytes ?? 4 * MIB
  const attempts = deps.attempts ?? 5
  const graphOrigin = new URL(deps.graph).origin
  if (fragmentBytes % FRAGMENT_UNIT !== 0 || fragmentBytes >= 60 * MIB) throw new Error('fragment size must be a multiple of 320 KiB below 60 MiB')

  // At most `maxInFlight` requests at a time: Graph throttles per user, and a vault pass is bursty.
  let free = deps.maxInFlight ?? 3
  const queue: (() => void)[] = []
  const acquire = (): Promise<void> => (free > 0 ? (free -= 1, Promise.resolve()) : new Promise<void>((r) => queue.push(r)))
  const release = () => { const next = queue.shift(); if (next) next(); else free += 1 }

  const backoff = (attempt: number): number => Math.min(BACKOFF_BASE_MS * 2 ** (attempt - 1), BACKOFF_MAX_MS) * (0.5 + random() / 2)

  interface Send { method: string; headers?: Record<string, string>; body?: BodyInit | null; auth?: boolean }

  /** One request with the policy of the adapter: bearer token, one refresh after a 401, waits on throttling. */
  async function send(url: string, init: Send): Promise<Response> {
    let refreshed = false
    for (let attempt = 1; ; attempt++) {
      const headers: Record<string, string> = { ...init.headers }
      if (init.auth !== false) headers.Authorization = `Bearer ${await deps.token()}`
      await acquire()
      let res: Response
      try {
        res = await deps.fetch(url, { method: init.method, headers, body: init.body ?? null, credentials: 'omit', referrerPolicy: 'no-referrer' })
      } catch (e) {
        throw e instanceof TargetError ? e : new TargetError('unreachable', { cause: e })
      } finally { release() }
      if (res.status === 401 && init.auth !== false && !refreshed) { refreshed = true; deps.invalidate(); attempt -= 1; continue }
      if (!THROTTLED.has(res.status)) return res
      const wait = parseRetryAfter(res.headers.get('Retry-After'), now()) ?? backoff(attempt)
      if (attempt >= attempts || wait > MAX_AUTO_WAIT_MS) throw new TargetError('throttled', { retryAfterMs: Math.ceil(wait) })
      await sleep(Math.ceil(wait))
    }
  }

  /** What a refusal means to the engine. Never carries a body, a name or a path. */
  function refusal(res: Response): TargetError {
    switch (res.status) {
      case 401: return new TargetError('auth-expired')
      case 403: return new TargetError('forbidden')
      case 404: return new TargetError('not-found')
      case 409: case 412: return new TargetError('precondition-failed')
      case 413: return new TargetError('too-large')
      case 507: return new TargetError('target-full')
      case 400: case 405: case 501: return new TargetError('unsupported')
      default: return THROTTLED.has(res.status) ? new TargetError('throttled') : new TargetError('unreachable')
    }
  }

  const reply = async <T>(res: Response): Promise<T> => {
    try { return (await res.json()) as T } catch (e) { throw new TargetError('unreachable', { cause: e }) }
  }

  const enc = (path: string): string => path.split('/').map(encodeURIComponent).join('/')
  const root = `${deps.graph}/me/drive/special/approot`
  const itemUrl = (path: string): string => `${root}:/${enc(path)}`
  const folderUrl = (folder: string): string => (folder === '' ? `${root}/children` : `${root}:/${enc(folder)}:/children`)

  function checkPath(path: string, prefix = false): void {
    if (!(prefix ? isObjectPrefix(path) : isObjectPath(path))) throw new TargetError('unsupported')
  }

  /** A paging link must stay on the host we were already talking to. */
  function sameHost(link: string): string {
    if (new URL(link).origin !== graphOrigin) throw new TargetError('unreachable')
    return link
  }

  /** An upload or download host is the provider's to choose (the worker policy names them), but never over a weaker scheme than Graph's. */
  function sameScheme(link: string): string {
    try { if (new URL(link).protocol === new URL(deps.graph).protocol) return link } catch { /* not a URL */ }
    throw new TargetError('unreachable')
  }

  // ---- list ----

  async function* walk(folder: string, prefix: string, depth: number): AsyncGenerator<ObjectInfo> {
    let url: string | null = `${folderUrl(folder)}?$top=200&$select=${SELECT_LIST}`
    while (url) {
      const res = await send(url, { method: 'GET' })
      if (res.status === 404) return
      if (!res.ok) throw refusal(res)
      const page = await reply<{ value?: DriveItem[]; '@odata.nextLink'?: string }>(res)
      for (const entry of page.value ?? []) {
        const name = entry.name ?? ''
        const path = folder === '' ? name : `${folder}/${name}`
        if (entry.folder) {
          if (depth < 2 && isObjectPath(path) && (`${path}/`.startsWith(prefix) || prefix.startsWith(`${path}/`))) yield* walk(path, prefix, depth + 1)
        } else if (path.startsWith(prefix) && isObjectPath(path) && entry.eTag) {
          yield { path, size: entry.size ?? 0, etag: entry.eTag, ...(entry.lastModifiedDateTime ? { modifiedAt: Date.parse(entry.lastModifiedDateTime) } : {}) }
        }
      }
      url = page['@odata.nextLink'] ? sameHost(page['@odata.nextLink']) : null
    }
  }

  // ---- get and stat ----

  async function metadata(path: string, select: string): Promise<DriveItem | null> {
    const res = await send(`${itemUrl(path)}?$select=${select}`, { method: 'GET' })
    if (res.status === 404) return null
    if (!res.ok) throw refusal(res)
    const item = await reply<DriveItem>(res)
    return item.folder ? null : item
  }

  async function download(path: string): Promise<{ bytes: Uint8Array; etag: string } | null> {
    // The download URL is short-lived: one fresh metadata read when it has expired by the time we use it.
    for (let round = 1; round <= 2; round++) {
      const item = await metadata(path, 'id,size,eTag,@microsoft.graph.downloadUrl')
      if (!item?.eTag) return null
      if ((item.size ?? 0) === 0) return { bytes: new Uint8Array(0), etag: item.eTag }
      const link = item['@microsoft.graph.downloadUrl']
      if (!link) throw new TargetError('unreachable')
      // No Authorization: the URL carries its own, and a credential would force a preflight the download host does not answer.
      const res = await send(sameScheme(link), { method: 'GET', auth: false })
      if ([401, 403, 404].includes(res.status) && round === 1) continue
      if (!res.ok) throw refusal(res)
      const bytes = new Uint8Array(await res.arrayBuffer())
      if (bytes.length !== item.size) throw new TargetError('unreachable')
      return { bytes, etag: item.eTag }
    }
    throw new TargetError('unreachable')
  }

  // ---- put ----

  const itemEtag = async (res: Response, path: string): Promise<string> => {
    const item = await reply<DriveItem>(res)
    if (item.eTag) return item.eTag
    const read = await metadata(path, 'id,eTag')
    if (!read?.eTag) throw new TargetError('unreachable')
    return read.eTag
  }

  /**
   * A 404 on a write is a missing parent folder, unless a precondition named the item: then the item is what is missing. Folders are
   * created on demand and the write goes once more, in case the provider does not create them itself (to confirm live).
   */
  async function writing(path: string, opts: PutOptions, attempt: () => Promise<Response>): Promise<Response> {
    const first = await attempt()
    if (first.status !== 404) return first
    if (opts.ifMatch !== undefined && opts.ifMatch !== 'absent') throw new TargetError('precondition-failed')
    await ensureParents(path)
    return attempt()
  }

  async function ensureParents(path: string): Promise<void> {
    const parts = path.split('/').slice(0, -1)
    for (let i = 0; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('/')
      const res = await send(folderUrl(parent), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: parts[i], folder: {}, '@microsoft.graph.conflictBehavior': 'replace' }),
      })
      if (!res.ok && res.status !== 409) throw refusal(res)
    }
  }

  async function simplePut(path: string, bytes: Uint8Array, opts: PutOptions): Promise<{ etag: string }> {
    const query = opts.ifMatch === 'absent' ? '?@microsoft.graph.conflictBehavior=fail' : ''
    const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' }
    if (opts.ifMatch !== undefined && opts.ifMatch !== 'absent') headers['If-Match'] = opts.ifMatch
    const res = await writing(path, opts, () => send(`${itemUrl(path)}:/content${query}`, { method: 'PUT', headers, body: bytes as BodyInit }))
    if (!res.ok) throw refusal(res)
    return { etag: await itemEtag(res, path) }
  }

  async function sessionPut(path: string, bytes: Uint8Array, opts: PutOptions): Promise<{ etag: string }> {
    for (let restart = 1; ; restart++) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (opts.ifMatch !== undefined && opts.ifMatch !== 'absent') headers['If-Match'] = opts.ifMatch
      const created = await writing(path, opts, () => send(`${itemUrl(path)}:/createUploadSession`, {
        method: 'POST', headers,
        body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': opts.ifMatch === 'absent' ? 'fail' : 'replace' }, fileSize: bytes.length }),
      }))
      if (!created.ok) throw refusal(created)
      const uploadUrl = sameScheme((await reply<{ uploadUrl?: string }>(created)).uploadUrl ?? '')
      const done = await uploadFragments(uploadUrl, bytes)
      if (done === 'expired' && restart < 2) continue
      if (done === 'expired') throw new TargetError('unreachable')
      return { etag: await itemEtag(done, path) }
    }
  }

  /** The fragments of one session, resumed from `nextExpectedRanges` after a failure. 'expired' means start over. */
  async function uploadFragments(uploadUrl: string, bytes: Uint8Array): Promise<Response | 'expired'> {
    let next = 0
    let retries = 0
    try {
      while (true) {
        const last = Math.min(next + fragmentBytes, bytes.length) - 1
        let res: Response
        try {
          res = await send(uploadUrl, { method: 'PUT', auth: false, headers: { 'Content-Range': `bytes ${next}-${last}/${bytes.length}` }, body: bytes.slice(next, last + 1) as BodyInit })
        } catch (e) {
          // The connection dropped mid-fragment: ask the session where it stands, then go on from there.
          if (!(e instanceof TargetError) || e.code !== 'unreachable' || (retries += 1) >= attempts) throw e
          await sleep(backoff(retries))
          const known = await resume(uploadUrl)
          if (known === 'expired') return 'expired'
          next = known
          continue
        }
        if (res.status === 202) { next = firstExpected(await reply<{ nextExpectedRanges?: string[] }>(res), last + 1); continue }
        if (res.status === 200 || res.status === 201) return res
        if (res.status === 404) return 'expired'
        if (res.status === 416 || (res.status >= 500 && res.status < 600 && (retries += 1) < attempts)) {
          if (res.status !== 416) await sleep(backoff(retries))
          const known = await resume(uploadUrl)
          if (known === 'expired') return 'expired'
          next = known
          continue
        }
        throw refusal(res)
      }
    } catch (e) {
      // Leave no half-finished session behind: it holds quota until it expires.
      void send(uploadUrl, { method: 'DELETE', auth: false }).catch(() => undefined)
      throw e
    }
  }

  const firstExpected = (status: { nextExpectedRanges?: string[] }, fallback: number): number => {
    const start = Number.parseInt(status.nextExpectedRanges?.[0] ?? '', 10)
    return Number.isFinite(start) ? start : fallback
  }

  async function resume(uploadUrl: string): Promise<number | 'expired'> {
    const res = await send(uploadUrl, { method: 'GET', auth: false })
    if (res.status === 404) return 'expired'
    if (!res.ok) throw refusal(res)
    return firstExpected(await reply(res), 0)
  }

  return {
    kind: 'onedrive',
    capabilities: CAPABILITIES,
    async *list(prefix: ObjectPath) {
      checkPath(prefix, true)
      const slash = prefix.lastIndexOf('/')
      yield* walk(slash === -1 ? '' : prefix.slice(0, slash), prefix, 0)
    },
    async get(path) {
      checkPath(path)
      return download(path)
    },
    async put(path, bytes, opts: PutOptions = {}) {
      checkPath(path)
      if (bytes.length > CAPABILITIES.maxObjectBytes) throw new TargetError('too-large')
      const conditional = opts.ifMatch !== undefined
      // An empty body cannot be sent as a fragment: it goes as a plain upload (the vault pads every object, so none is empty).
      if (bytes.length === 0 || (bytes.length <= simpleMax && (!conditional || mode === 'simple'))) return simplePut(path, bytes, opts)
      return sessionPut(path, bytes, opts)
    },
    async delete(path) {
      checkPath(path)
      const res = await send(itemUrl(path), { method: 'DELETE' })
      if (res.status !== 404 && !res.ok) throw refusal(res)
    },
    async stat(path) {
      checkPath(path)
      const item = await metadata(path, SELECT_LIST)
      if (!item?.eTag) return null
      return { path, size: item.size ?? 0, etag: item.eTag, ...(item.lastModifiedDateTime ? { modifiedAt: Date.parse(item.lastModifiedDateTime) } : {}) }
    },
  }
}
