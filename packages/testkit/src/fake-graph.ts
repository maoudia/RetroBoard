/**
 * An in-memory Microsoft identity platform and Microsoft Graph for the OneDrive adapter (change user-drive-storage, ADR-0039): the
 * authorize and token endpoints (authorization code with PKCE for a single-page application, refresh tokens that live 24 hours
 * from the interactive sign-in and rotate), and the slice of Graph the adapter uses on the app folder: children with paging and
 * `$select`, item metadata with the pre-authenticated download URL, simple upload, upload sessions with fragments, delete,
 * throttling, expiry and quota. It answers through the web `fetch` signature, so a unit test calls it in process and the e2e
 * harness mounts it on a real port; it also records every URL and every body, so the plaintext guard covers this adapter too.
 *
 * It follows what Microsoft documents and what the spike recorded (`design.md`), including the three behaviours that are not
 * verified live: whether a simple `PUT` honours `If-Match` and `conflictBehavior` (`simplePreconditions`), whether parent
 * folders are created on demand (`createsParents`), and the CORS headers of the download and upload hosts.
 */
import { findPlaintext } from './sync-target'

export interface FakeGraphOptions {
  /** Where the fake lives (default `https://fake.graph.test`); the identity endpoints are under `/consumers`, Graph under `/v1.0`. */
  readonly origin?: string
  readonly clientId?: string
  /** Redirect URIs registered as "Single-page application". */
  readonly redirectUris?: readonly string[]
  readonly now?: () => number
  /** Children per page (Graph's default is 200). */
  readonly pageSize?: number
  /** Total bytes the app folder may hold before `507` (default unlimited). */
  readonly quota?: number
  /** Does a simple `PUT .../content` honour `If-Match` and `@microsoft.graph.conflictBehavior`? Undocumented by Microsoft, so a test runs both. */
  readonly simplePreconditions?: boolean
  /** Are missing parent folders created by a path-based upload? */
  readonly createsParents?: boolean
}

export interface FakeRequest {
  /** The account the request acts for (from its token or its upload URL), when it names one. */
  readonly account: string | null
  readonly method: string
  readonly url: string
  readonly authorization: string | null
  readonly headers: Readonly<Record<string, string>>
  readonly body: Uint8Array
}

export interface Fault {
  readonly status: number
  readonly headers?: Readonly<Record<string, string>>
  readonly body?: unknown
  /** How many matching requests fail (default 1). */
  readonly times?: number
  /** Which requests fail (default: any request to Graph, an upload host or a download host, not the identity endpoints). */
  readonly when?: (request: FakeRequest) => boolean
}

export interface FakeGraph {
  readonly origin: string
  /** `<origin>/consumers`: what the app calls the authority. */
  readonly authority: string
  /** `<origin>/v1.0`. */
  readonly graph: string
  readonly clientId: string
  fetch: typeof fetch
  /** The same, as a page of this origin would send it: a browser adds the `Origin` header a single-page application's token request needs. */
  fetchFrom(pageOrigin: string): typeof fetch
  /** Every request in order, with its body. */
  readonly requests: readonly FakeRequest[]
  /** Counts the adapter's choices can be asserted on. */
  readonly stats: { simplePuts: number; sessions: number; fragments: number; downloads: number; tokenRequests: number; refreshes: number }
  /** The stored objects of an account by app-folder path. */
  objects(account?: string): ReadonlyMap<string, Uint8Array>
  /** Seeds an object the way another device or the user would have left it. */
  seed(path: string, bytes: Uint8Array, account?: string): void
  fail(fault: Fault): void
  /** The next `times` Graph requests answer 429 with `Retry-After`. */
  throttle(times: number, retryAfterSeconds?: number | string): void
  /** Every access token issued so far (of one account, or of all) stops working (401), refresh tokens still work. */
  expireAccessTokens(account?: string): void
  /** Refresh tokens stop working, as when the person removed the app at account.microsoft.com. */
  revokeRefreshTokens(account?: string): void
  /** Moves the fake's clock forward. */
  advance(ms: number): void
  /** Whether the Microsoft session cookie is alive: `prompt=none` succeeds only then. */
  setSession(alive: boolean, account?: string): void
  /** The next authorize request ends in this error (`access_denied`, ...) instead of a code. */
  denyNextAuthorize(error: string): void
  /** Every account that signed in, and what the app folder of each holds. */
  accounts(): readonly string[]
  /** Throws when a canary occurs in any URL or any body the fake received. */
  assertNoPlaintext(canaries: readonly string[]): void
}

interface Item { id: string; bytes: Uint8Array; version: number; modifiedAt: number }
/** One Microsoft account: its own app folder. A test of one browser signs in as its own account, so tests that share the fake never meet. */
interface Account { id: string; store: Map<string, Item>; folders: Set<string>; sessionAlive: boolean }
const DEFAULT_ACCOUNT = 'default'
const COOKIE = 'rb_fake_account'
interface Session { account: string; id: string; path: string; behavior: 'fail' | 'replace'; ifMatch: string | null; received: Uint8Array[]; next: number; total: number; expires: number }

const SCOPE = 'Files.ReadWrite.AppFolder offline_access'
const REFRESH_LIFETIME_MS = 24 * 60 * 60 * 1000
const ACCESS_LIFETIME_S = 3599
const FRAGMENT_UNIT = 320 * 1024
const enc = new TextEncoder()
const b64url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const sha256 = async (text: string): Promise<Uint8Array> => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))
const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
/** Microsoft answers a cross-origin request with these headers whatever the status: an error without them cannot be read by the page. */
const cors = (h: Record<string, string> = {}): Record<string, string> => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'ETag, Retry-After',
  ...h,
})
const graphError = (status: number, code: string, headers: Record<string, string> = {}): Response => json(status, { error: { code, message: code } }, cors(headers))

export function createFakeGraph(options: FakeGraphOptions = {}): FakeGraph {
  const origin = options.origin ?? 'https://fake.graph.test'
  const clientId = options.clientId ?? '11111111-2222-4333-8444-555555555555'
  const redirectUris = options.redirectUris ?? ['http://127.0.0.1:8787/storage/callback', 'http://localhost:8787/storage/callback']
  const pageSize = options.pageSize ?? 200
  const simplePreconditions = options.simplePreconditions ?? true
  const createsParents = options.createsParents ?? true
  let skew = 0
  const clock = (): number => (options.now ?? Date.now)() + skew

  const accountsMap = new Map<string, Account>()
  const acct = (id: string): Account => {
    let a = accountsMap.get(id)
    // Folders made explicitly live beside the objects (an upload creates its own when `createsParents`).
    if (!a) accountsMap.set(id, a = { id, store: new Map(), folders: new Set(), sessionAlive: true })
    return a
  }
  const sessions = new Map<string, Session>()
  const codes = new Map<string, { challenge: string; redirectUri: string; expires: number; account: string }>()
  const accessTokens = new Map<string, { expires: number; account: string }>()
  const refreshTokens = new Map<string, { until: number; account: string }>()
  const faults: (Fault & { left: number })[] = []
  const requests: FakeRequest[] = []
  const stats = { simplePuts: 0, sessions: 0, fragments: 0, downloads: 0, tokenRequests: 0, refreshes: 0 }
  let counter = 0
  let deny: string | null = null

  const nextId = (prefix: string): string => `${prefix}${String(++counter).padStart(6, '0')}`
  const etagOf = (i: Item): string => `"{${i.id}},${i.version}"`
  const total = (a: Account): number => [...a.store.values()].reduce((n, i) => n + i.bytes.length, 0)
  const withCors = (res: Response): Response => { for (const [k, v] of Object.entries(cors())) res.headers.set(k, v); return res }

  function itemJson(path: string, i: Item, select: string[] | null) {
    const all: Record<string, unknown> = {
      id: i.id, name: path.slice(path.lastIndexOf('/') + 1), size: i.bytes.length, eTag: etagOf(i), cTag: `"c:{${i.id}},${i.version}"`,
      lastModifiedDateTime: new Date(i.modifiedAt).toISOString(), file: { mimeType: 'application/octet-stream' },
      '@microsoft.graph.downloadUrl': `${origin}/dl/${i.id}?tempauth=${counter}`,
    }
    if (!select) return all
    return Object.fromEntries(Object.entries(all).filter(([k]) => k === 'id' || select.includes(k)))
  }

  function children(a: Account, folder: string): { name: string; folder?: true; path: string; item?: Item }[] {
    const base = folder === '' ? '' : `${folder}/`
    const out = new Map<string, { name: string; folder?: true; path: string; item?: Item }>()
    for (const [path, item] of a.store) {
      if (!path.startsWith(base)) continue
      const rest = path.slice(base.length)
      const slash = rest.indexOf('/')
      if (slash === -1) out.set(rest, { name: rest, path, item })
      else out.set(rest.slice(0, slash), { name: rest.slice(0, slash), folder: true, path: `${base}${rest.slice(0, slash)}` })
    }
    for (const f of a.folders) {
      if (!f.startsWith(base)) continue
      const name = f.slice(base.length).split('/')[0]!
      if (name && !out.has(name)) out.set(name, { name, folder: true, path: `${base}${name}` })
    }
    return [...out.values()].sort((a, b) => (a.name < b.name ? -1 : 1))
  }

  const folderExists = (a: Account, folder: string): boolean => folder === '' || a.folders.has(folder) || [...a.store.keys()].some((p) => p.startsWith(`${folder}/`))

  function put(a: Account, path: string, bytes: Uint8Array): Item {
    const old = a.store.get(path)
    const item: Item = { id: old?.id ?? nextId('01FAKE'), bytes, version: (old?.version ?? 0) + 1, modifiedAt: clock() }
    a.store.set(path, item)
    return item
  }

  /** `If-Match` and `conflictBehavior`: the answer that stops a write, or null when it may go on. */
  function precondition(a: Account, path: string, ifMatch: string | null, behavior: 'fail' | 'replace'): Response | null {
    const existing = a.store.get(path)
    if (ifMatch !== null && (!existing || etagOf(existing) !== ifMatch)) return graphError(412, 'preconditionFailed')
    if (behavior === 'fail' && existing) return graphError(409, 'nameAlreadyExists')
    return null
  }

  function bearer(req: FakeRequest): Account | Response {
    const m = /^Bearer (.+)$/.exec(req.authorization ?? '')
    const token = m ? accessTokens.get(m[1]!) : undefined
    return token && token.expires > clock() ? acct(token.account) : graphError(401, 'InvalidAuthenticationToken', { 'WWW-Authenticate': 'Bearer error="invalid_token"' })
  }

  // ---- identity ----

  async function authorize(url: URL, req: FakeRequest): Promise<Response> {
    const q = url.searchParams
    const account = new RegExp(`(?:^|;\\s*)${COOKIE}=([\\w-]+)`).exec(req.headers.cookie ?? '')?.[1] ?? DEFAULT_ACCOUNT
    const redirect = q.get('redirect_uri') ?? ''
    if (q.get('client_id') !== clientId || !redirectUris.includes(redirect) || q.get('response_type') !== 'code' || q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge')) {
      return new Response('AADSTS: invalid authorize request', { status: 400 })
    }
    const back = new URL(redirect)
    const state = q.get('state')
    if (state) back.searchParams.set('state', state)
    if (deny) { back.searchParams.set('error', deny); deny = null; return new Response(null, { status: 302, headers: { Location: back.toString() } }) }
    if (q.get('prompt') === 'none' && !acct(account).sessionAlive) {
      back.searchParams.set('error', 'login_required')
      return new Response(null, { status: 302, headers: { Location: back.toString() } })
    }
    const code = nextId('code-')
    codes.set(code, { challenge: q.get('code_challenge')!, redirectUri: redirect, expires: clock() + 60_000, account })
    back.searchParams.set('code', code)
    return new Response(null, { status: 302, headers: { Location: back.toString() } })
  }

  const grantError = (error: string, description: string, status = 400): Response => json(status, { error, error_description: description }, cors())

  async function token(req: FakeRequest): Promise<Response> {
    stats.tokenRequests += 1
    const form = new URLSearchParams(new TextDecoder().decode(req.body))
    if (form.get('client_id') !== clientId) return grantError('invalid_client', 'AADSTS700016: application not found')
    const issue = (until: number, account: string): Response => {
      acct(account)
      const access = nextId('at-')
      const refresh = nextId('rt-')
      accessTokens.set(access, { expires: clock() + ACCESS_LIFETIME_S * 1000, account })
      // A refresh token for a single-page application dies 24 hours after the interactive sign-in, and the ones it yields inherit that end.
      refreshTokens.set(refresh, { until, account })
      return json(200, { token_type: 'Bearer', scope: SCOPE, expires_in: ACCESS_LIFETIME_S, access_token: access, refresh_token: refresh }, cors())
    }
    if (form.get('grant_type') === 'authorization_code') {
      const code = codes.get(form.get('code') ?? '')
      codes.delete(form.get('code') ?? '')
      if (!code || code.expires < clock()) return grantError('invalid_grant', 'AADSTS70000: the code is invalid or expired')
      if (code.redirectUri !== form.get('redirect_uri')) return grantError('invalid_grant', 'AADSTS50011: redirect_uri mismatch')
      if (b64url(await sha256(form.get('code_verifier') ?? '')) !== code.challenge) return grantError('invalid_grant', 'AADSTS70002: PKCE verification failed')
      if (!req.headers.origin) return grantError('invalid_request', 'AADSTS9002327: a single-page application token request needs an Origin')
      return issue(clock() + REFRESH_LIFETIME_MS, code.account)
    }
    if (form.get('grant_type') === 'refresh_token') {
      stats.refreshes += 1
      const known = refreshTokens.get(form.get('refresh_token') ?? '')
      if (!known) return grantError('invalid_grant', 'AADSTS70008: the refresh token is invalid or revoked')
      if (known.until < clock()) return grantError('invalid_grant', 'AADSTS700084: the refresh token was issued to a single page app and has a fixed, limited lifetime')
      return issue(known.until, known.account)
    }
    return grantError('unsupported_grant_type', 'unsupported grant type')
  }

  // ---- graph ----

  const APPROOT = '/v1.0/me/drive/special/approot'

  async function graph(req: FakeRequest, url: URL): Promise<Response> {
    const a = bearer(req)
    if (a instanceof Response) return a
    const rest = url.pathname.slice(APPROOT.length)
    const m = rest === '' ? { path: '', action: '' } : rest === '/children' ? { path: '', action: 'children' } : /^:\/([^:]+)(?::(?:\/([A-Za-z]+))?)?$/.exec(rest)
    if (!m) return graphError(404, 'itemNotFound')
    const path = ('path' in m ? m.path : m[1]!).replace(/^\/+|\/+$/g, '')
    const action = 'action' in m ? m.action : (m[2] ?? '')
    const select = url.searchParams.get('$select')?.split(',') ?? null

    if (req.method === 'GET' && action === 'children') {
      if (!folderExists(a, path)) return graphError(404, 'itemNotFound')
      const all = children(a, path)
      const top = Math.min(Number(url.searchParams.get('$top') ?? pageSize) || pageSize, pageSize)
      const from = Number(url.searchParams.get('$skiptoken') ?? 0)
      const page = all.slice(from, from + top)
      const value = page.map((c) => (c.item ? itemJson(c.path, c.item, select) : { id: `folder-${c.path}`, name: c.name, folder: { childCount: 1 } }))
      const next = from + top < all.length ? new URL(url) : null
      next?.searchParams.set('$skiptoken', String(from + top))
      return json(200, { value, ...(next ? { '@odata.nextLink': next.toString() } : {}) }, cors())
    }
    if (req.method === 'GET' && action === '') {
      const item = a.store.get(path)
      if (!item) return folderExists(a, path) ? json(200, { id: `folder-${path}`, name: path.slice(path.lastIndexOf('/') + 1), folder: { childCount: 1 } }, cors()) : graphError(404, 'itemNotFound')
      return json(200, itemJson(path, item, select), cors())
    }
    if (req.method === 'DELETE' && action === '') {
      if (!a.store.delete(path)) return graphError(404, 'itemNotFound')
      return new Response(null, { status: 204, headers: cors() })
    }
    if (req.method === 'POST' && action === 'children') {
      const body = JSON.parse(new TextDecoder().decode(req.body)) as { name?: string; folder?: unknown }
      if (!body.name || !body.folder) return graphError(400, 'invalidRequest')
      if (path !== '' && !folderExists(a, path)) return graphError(404, 'itemNotFound')
      a.folders.add(path === '' ? body.name : `${path}/${body.name}`)
      return json(201, { id: `folder-${body.name}`, name: body.name, folder: { childCount: 0 } }, cors())
    }
    if (req.method === 'PUT' && action === 'content') {
      stats.simplePuts += 1
      const behavior = url.searchParams.get('@microsoft.graph.conflictBehavior') === 'fail' ? 'fail' : 'replace'
      const stop = simplePreconditions ? precondition(a, path, req.headers['if-match'] ?? null, behavior) : null
      if (stop) return stop
      if (!createsParents && path.includes('/') && !folderExists(a, path.slice(0, path.lastIndexOf('/')))) return graphError(404, 'itemNotFound')
      if (options.quota !== undefined && total(a) - (a.store.get(path)?.bytes.length ?? 0) + req.body.length > options.quota) return graphError(507, 'quotaLimitReached')
      const existed = a.store.has(path)
      return json(existed ? 200 : 201, itemJson(path, put(a, path, req.body), null), cors())
    }
    if (req.method === 'POST' && action === 'createUploadSession') {
      stats.sessions += 1
      if (!createsParents && path.includes('/') && !folderExists(a, path.slice(0, path.lastIndexOf('/')))) return graphError(404, 'itemNotFound')
      const body = req.body.length ? (JSON.parse(new TextDecoder().decode(req.body)) as { item?: Record<string, unknown>; fileSize?: number }) : {}
      const behavior = body.item?.['@microsoft.graph.conflictBehavior'] === 'fail' ? 'fail' : 'replace'
      const ifMatch = req.headers['if-match'] ?? null
      if (ifMatch !== null && !a.store.has(path)) return graphError(412, 'preconditionFailed')
      if (ifMatch !== null && etagOf(a.store.get(path)!) !== ifMatch) return graphError(412, 'preconditionFailed')
      if (options.quota !== undefined && typeof body.fileSize === 'number' && total(a) + body.fileSize > options.quota) return graphError(507, 'quotaLimitReached')
      const id = nextId('up-')
      sessions.set(id, { account: a.id, id, path, behavior, ifMatch, received: [], next: 0, total: -1, expires: clock() + 15 * 60_000 })
      return json(200, { uploadUrl: `${origin}/up/${id}`, expirationDateTime: new Date(clock() + 15 * 60_000).toISOString() }, cors())
    }
    return graphError(405, 'methodNotAllowed')
  }

  async function upload(req: FakeRequest, url: URL): Promise<Response> {
    const session = sessions.get(url.pathname.slice('/up/'.length))
    // The upload URL is pre-authenticated: an Authorization header on it is refused, as Microsoft documents.
    if (req.authorization !== null) return graphError(401, 'unauthenticated')
    if (!session || session.expires < clock()) return graphError(404, 'itemNotFound')
    const status = () => json(200, { expirationDateTime: new Date(session.expires).toISOString(), nextExpectedRanges: [`${session.next}-`] }, cors())
    if (req.method === 'GET') return status()
    if (req.method === 'DELETE') { sessions.delete(session.id); return new Response(null, { status: 204, headers: cors() }) }
    if (req.method !== 'PUT') return graphError(405, 'methodNotAllowed')
    stats.fragments += 1
    const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(req.headers['content-range'] ?? '')
    if (!range) return graphError(400, 'invalidRange')
    const [first, last, size] = [Number(range[1]), Number(range[2]), Number(range[3])]
    if (first !== session.next || last - first + 1 !== req.body.length) return graphError(416, 'invalidRange')
    const isLast = last + 1 === size
    if (!isLast && req.body.length % FRAGMENT_UNIT !== 0) return graphError(400, 'invalidRange')
    session.received.push(req.body)
    session.next = last + 1
    session.total = size
    if (!isLast) return json(202, { expirationDateTime: new Date(session.expires).toISOString(), nextExpectedRanges: [`${session.next}-`] }, cors())
    const bytes = new Uint8Array(size)
    let at = 0
    for (const part of session.received) { bytes.set(part, at); at += part.length }
    sessions.delete(session.id)
    const a = acct(session.account)
    const stop = precondition(a, session.path, session.ifMatch, session.behavior)
    if (stop) return withCors(stop)
    if (options.quota !== undefined && total(a) - (a.store.get(session.path)?.bytes.length ?? 0) + bytes.length > options.quota) return withCors(graphError(507, 'quotaLimitReached'))
    const existed = a.store.has(session.path)
    return json(existed ? 200 : 201, itemJson(session.path, put(a, session.path, bytes), null), cors())
  }

  function download(req: FakeRequest, url: URL): Response {
    stats.downloads += 1
    // Pre-authenticated too: credentials on it would only trigger a preflight, and Microsoft says to send none.
    if (req.authorization !== null) return graphError(401, 'unauthenticated')
    const id = url.pathname.slice('/dl/'.length)
    const found = [...accountsMap.values()].flatMap((a) => [...a.store.values()]).find((i) => i.id === id)
    if (!found) return graphError(404, 'itemNotFound')
    return new Response(found.bytes.slice(), { status: 200, headers: cors({ 'Content-Type': 'application/octet-stream' }) })
  }

  // ---- entry ----

  const fetcher = (async (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const headers: Record<string, string> = {}
    request.headers.forEach((v, k) => { headers[k] = v })
    const body = new Uint8Array(await request.arrayBuffer())
    const authorization = request.headers.get('authorization')
    const bearerToken = /^Bearer (.+)$/.exec(authorization ?? '')?.[1]
    const account = (bearerToken ? accessTokens.get(bearerToken)?.account : sessions.get(url.pathname.slice('/up/'.length))?.account) ?? null
    const req: FakeRequest = { account, method: request.method, url: request.url, authorization, headers, body }
    if (url.origin !== origin) throw new TypeError('fake graph: unknown host')
    requests.push(req)

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors({
        'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, if-match, if-none-match, content-range',
        'Access-Control-Max-Age': '0',
      }) })
    }
    const identity = url.pathname.startsWith('/consumers/')
    if (!identity) {
      const fault = faults.find((f) => f.left > 0 && (f.when ? f.when(req) : true))
      if (fault) {
        fault.left -= 1
        return json(fault.status, fault.body ?? { error: { code: 'injected', message: 'injected' } }, cors(fault.headers as Record<string, string> | undefined))
      }
    } else {
      const fault = faults.find((f) => f.left > 0 && f.when?.(req))
      if (fault) { fault.left -= 1; return json(fault.status, fault.body ?? { error: 'injected' }, cors()) }
    }
    if (url.pathname === '/consumers/oauth2/v2.0/authorize' && req.method === 'GET') return authorize(url, req)
    if (url.pathname === '/consumers/oauth2/v2.0/token' && req.method === 'POST') return token(req)
    if (url.pathname.startsWith(APPROOT)) return graph(req, url)
    if (url.pathname.startsWith('/up/')) return upload(req, url)
    if (url.pathname.startsWith('/dl/') && req.method === 'GET') return download(req, url)
    return graphError(404, 'itemNotFound')
  }) as typeof fetch

  return {
    origin, authority: `${origin}/consumers`, graph: `${origin}/v1.0`, clientId, fetch: fetcher, requests, stats,
    fetchFrom: (pageOrigin) => ((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      headers.set('Origin', pageOrigin)
      return fetcher(input, { ...init, headers })
    }) as typeof fetch,
    objects: (account = DEFAULT_ACCOUNT) => new Map([...acct(account).store].map(([p, i]) => [p, i.bytes.slice()])),
    seed(path, bytes, account = DEFAULT_ACCOUNT) { put(acct(account), path, bytes.slice()) },
    accounts: () => [...accountsMap.keys()],
    fail(fault) { faults.push({ ...fault, left: fault.times ?? 1 }) },
    throttle(times, retryAfterSeconds = 1) { faults.push({ status: 429, headers: { 'Retry-After': String(retryAfterSeconds) }, left: times }) },
    expireAccessTokens(account) { for (const t of accessTokens.values()) if (!account || t.account === account) t.expires = 0 },
    // The refresh tokens that exist now: a person who signs in again gets new ones.
    revokeRefreshTokens(account) { for (const [t, v] of refreshTokens) if (!account || v.account === account) refreshTokens.delete(t) },
    advance(ms) { skew += ms },
    setSession(alive, account = DEFAULT_ACCOUNT) { acct(account).sessionAlive = alive },
    denyNextAuthorize(error) { deny = error },
    assertNoPlaintext(canaries) {
      const hit = findPlaintext(canaries, requests.map((r) => decodeURIComponent(new URL(r.url).pathname + new URL(r.url).search)), requests.map((r) => r.body))
      if (hit) throw new Error(`plaintext reached the target: ${hit}`)
    },
  }
}
