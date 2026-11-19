import { describe, expect, it } from 'vitest'
import { type FakeGraph, type FakeGraphOptions, createFakeGraph } from '../src'

const REDIRECT = 'http://127.0.0.1:8787/storage/callback'
const PAGE = 'http://127.0.0.1:8787'
const VERIFIER = 'v'.repeat(48)
const enc = new TextEncoder()
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const challengeOf = async (v: string) => b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(v))))

async function authorizeUrl(g: FakeGraph, over: Record<string, string | null> = {}) {
  const params: Record<string, string | null> = {
    client_id: g.clientId, redirect_uri: REDIRECT, response_type: 'code', code_challenge_method: 'S256', code_challenge: await challengeOf(VERIFIER), state: 's1', ...over,
  }
  const url = new URL(`${g.authority}/oauth2/v2.0/authorize`)
  for (const [k, v] of Object.entries(params)) if (v !== null) url.searchParams.set(k, v)
  return url.toString()
}
const authorize = async (g: FakeGraph, over: Record<string, string | null> = {}, init: RequestInit = {}) => g.fetch(await authorizeUrl(g, over), init)

const form = (g: FakeGraph, body: Record<string, string>, init: RequestInit = {}) =>
  g.fetchFrom(PAGE)(`${g.authority}/oauth2/v2.0/token`, { method: 'POST', body: new URLSearchParams(body).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, ...init })

async function codeOf(g: FakeGraph, over: Record<string, string | null> = {}, init: RequestInit = {}) {
  const res = await authorize(g, over, init)
  return new URL(res.headers.get('location')!).searchParams.get('code')!
}

async function signIn(g: FakeGraph) {
  const res = await form(g, { client_id: g.clientId, grant_type: 'authorization_code', code: await codeOf(g), redirect_uri: REDIRECT, code_verifier: VERIFIER })
  return (await res.json()) as { access_token: string; refresh_token: string }
}

const approot = (g: FakeGraph) => `${g.graph}/me/drive/special/approot`
const api = (g: FakeGraph, token: string, path: string, init: RequestInit = {}) =>
  g.fetch(`${approot(g)}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } })
const names = async (res: Response) => ((await res.json()) as { value: { name: string }[] }).value.map((v) => v.name)
const body = (n: number, fill = 1) => new Uint8Array(n).fill(fill)

const ready = async (options: FakeGraphOptions = {}) => {
  const g = createFakeGraph(options)
  const { access_token: token, refresh_token: refresh } = await signIn(g)
  return { g, token, refresh }
}

describe('fake graph: defaults', () => {
  it('registers the local single-page-application redirects and reads the real clock', async () => {
    const g = createFakeGraph()
    expect((await authorize(g, { redirect_uri: 'http://localhost:8787/storage/callback' })).status).toBe(302)
    expect((await authorize(g, { redirect_uri: 'http://elsewhere.test/cb' })).status).toBe(400)
    const { token } = await ready()
    expect(token).toMatch(/^at-/)
  })
})

describe('fake graph: authorize', () => {
  it('refuses a request that is not a code flow with PKCE', async () => {
    const g = createFakeGraph()
    for (const over of [{ client_id: 'other' }, { redirect_uri: null }, { response_type: 'token' }, { code_challenge_method: 'plain' }, { code_challenge: null }]) {
      expect((await authorize(g, over)).status, JSON.stringify(over)).toBe(400)
    }
  })

  it('hands back the state when there is one, and none when there is not', async () => {
    const g = createFakeGraph()
    expect(new URL((await authorize(g)).headers.get('location')!).searchParams.get('state')).toBe('s1')
    expect(new URL((await authorize(g, { state: null })).headers.get('location')!).searchParams.has('state')).toBe(false)
  })

  it('answers the error it was told to once, and login_required without a session on a silent request', async () => {
    const g = createFakeGraph()
    g.denyNextAuthorize('access_denied')
    expect(new URL((await authorize(g)).headers.get('location')!).searchParams.get('error')).toBe('access_denied')
    expect(new URL((await authorize(g)).headers.get('location')!).searchParams.get('code')).not.toBeNull()
    g.setSession(false)
    expect(new URL((await authorize(g, { prompt: 'none' })).headers.get('location')!).searchParams.get('error')).toBe('login_required')
    g.setSession(true)
    expect(new URL((await authorize(g, { prompt: 'none' })).headers.get('location')!).searchParams.get('code')).not.toBeNull()
  })

  it('signs in the account named by the cookie', async () => {
    const g = createFakeGraph()
    const code = await codeOf(g, {}, { headers: { cookie: 'rb_fake_account=alice' } })
    await form(g, { client_id: g.clientId, grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: VERIFIER })
    expect(g.accounts()).toEqual(['alice'])
  })
})

describe('fake graph: token', () => {
  const grant = (g: FakeGraph, code: string, over: Record<string, string> = {}) =>
    form(g, { client_id: g.clientId, grant_type: 'authorization_code', code, redirect_uri: REDIRECT, code_verifier: VERIFIER, ...over })
  const error = async (res: Response) => ((await res.json()) as { error: string }).error

  it('refuses an unknown application, an unknown, used or expired code, a different redirect and a wrong or missing verifier', async () => {
    const g = createFakeGraph()
    expect(await error(await form(g, { client_id: 'other', grant_type: 'authorization_code' }))).toBe('invalid_client')
    expect(await error(await form(g, { client_id: g.clientId, grant_type: 'authorization_code' }))).toBe('invalid_grant')
    const code = await codeOf(g)
    expect((await grant(g, code)).status).toBe(200)
    expect(await error(await grant(g, code))).toBe('invalid_grant')
    expect(await error(await grant(g, await codeOf(g), { redirect_uri: 'http://localhost:8787/storage/callback' }))).toBe('invalid_grant')
    expect(await error(await grant(g, await codeOf(g), { code_verifier: 'w'.repeat(48) }))).toBe('invalid_grant')
    const noVerifier = await codeOf(g)
    expect(await error(await form(g, { client_id: g.clientId, grant_type: 'authorization_code', code: noVerifier, redirect_uri: REDIRECT }))).toBe('invalid_grant')
    const stale = await codeOf(g)
    g.advance(61_000)
    expect(await error(await grant(g, stale))).toBe('invalid_grant')
  })

  it('wants the Origin of a single-page application on the code request', async () => {
    const g = createFakeGraph()
    const res = await g.fetch(`${g.authority}/oauth2/v2.0/token`, { method: 'POST', body: new URLSearchParams({ client_id: g.clientId, grant_type: 'authorization_code', code: await codeOf(g), redirect_uri: REDIRECT, code_verifier: VERIFIER }).toString() })
    expect(await error(res)).toBe('invalid_request')
  })

  it('refuses a grant type it does not know, a missing refresh token, an unknown one and one past its day', async () => {
    const { g, refresh } = await ready()
    expect(await error(await form(g, { client_id: g.clientId, grant_type: 'password' }))).toBe('unsupported_grant_type')
    expect(await error(await form(g, { client_id: g.clientId, grant_type: 'refresh_token' }))).toBe('invalid_grant')
    expect(await error(await form(g, { client_id: g.clientId, grant_type: 'refresh_token', refresh_token: 'rt-nope' }))).toBe('invalid_grant')
    expect((await form(g, { client_id: g.clientId, grant_type: 'refresh_token', refresh_token: refresh })).status).toBe(200)
    g.advance(25 * 60 * 60 * 1000)
    expect(await error(await form(g, { client_id: g.clientId, grant_type: 'refresh_token', refresh_token: refresh }))).toBe('invalid_grant')
    expect(g.stats.refreshes).toBe(4)
  })

  it('stops the tokens of one account or of all of them', async () => {
    const g = createFakeGraph()
    const alice = (await (await grant(g, await codeOf(g, {}, { headers: { cookie: 'rb_fake_account=alice' } }))).json()) as { access_token: string; refresh_token: string }
    const other = await signIn(g)
    g.expireAccessTokens('someone-else')
    expect((await api(g, alice.access_token, '')).status).toBe(200)
    g.expireAccessTokens('default')
    expect((await api(g, other.access_token, '')).status).toBe(401)
    g.revokeRefreshTokens('default')
    expect((await form(g, { client_id: g.clientId, grant_type: 'refresh_token', refresh_token: other.refresh_token })).status).toBe(400)
    expect((await form(g, { client_id: g.clientId, grant_type: 'refresh_token', refresh_token: alice.refresh_token })).status).toBe(200)
    g.revokeRefreshTokens()
    expect((await form(g, { client_id: g.clientId, grant_type: 'refresh_token', refresh_token: alice.refresh_token })).status).toBe(400)
  })
})

describe('fake graph: the app folder', () => {
  it('refuses a request without a token, with an unknown one and with an expired one', async () => {
    const { g, token } = await ready()
    expect((await g.fetch(approot(g))).status).toBe(401)
    expect((await api(g, 'at-unknown', '')).status).toBe(401)
    g.advance(3600 * 1000)
    expect((await api(g, token, '')).status).toBe(401)
  })

  it('answers 404 to a path it cannot read and 405 to a method it does not know', async () => {
    const { g, token } = await ready()
    expect((await api(g, token, 'X')).status).toBe(404)
    expect((await api(g, token, ':/s/x.rbs:', { method: 'PATCH' })).status).toBe(405)
    expect((await api(g, token, ':/s/x.rbs:/children', { method: 'GET' })).status).toBe(404)
  })

  it('lists folders made on purpose beside the objects, once', async () => {
    const { g, token } = await ready()
    g.seed('s/x.rbs', body(1))
    const made = await api(g, token, '/children', { method: 'POST', body: JSON.stringify({ name: 's', folder: {} }) })
    expect(made.status).toBe(201)
    await api(g, token, '/children', { method: 'POST', body: JSON.stringify({ name: 'm', folder: {} }) })
    await api(g, token, ':/m:/children', { method: 'POST', body: JSON.stringify({ name: 'inner', folder: {} }) })
    expect(await names(await api(g, token, '/children'))).toEqual(['m', 's'])
    expect(await names(await api(g, token, ':/m:/children'))).toEqual(['inner'])
    const folder = await (await api(g, token, ':/m:')).json() as { name: string; folder: unknown }
    expect([folder.name, typeof folder.folder]).toEqual(['m', 'object'])
    expect((await api(g, token, ':/nope:')).status).toBe(404)
    expect((await api(g, token, ':/nope:/children')).status).toBe(404)
  })

  it('refuses a folder without a name or without folder facet, and one made in a folder that is not there', async () => {
    const { g, token } = await ready()
    expect((await api(g, token, '/children', { method: 'POST', body: JSON.stringify({ folder: {} }) })).status).toBe(400)
    expect((await api(g, token, '/children', { method: 'POST', body: JSON.stringify({ name: 'x' }) })).status).toBe(400)
    expect((await api(g, token, ':/gone:/children', { method: 'POST', body: JSON.stringify({ name: 'x', folder: {} }) })).status).toBe(404)
  })

  it('pages the children by $top and by its own page size, and ignores a $top that is not a number', async () => {
    const { g, token } = await ready({ pageSize: 2 })
    for (const n of ['a', 'b', 'c']) g.seed(`s/${n}.rbs`, body(1))
    const first = (await (await api(g, token, ':/s:/children')).json()) as { value: unknown[]; '@odata.nextLink'?: string }
    expect(first.value).toHaveLength(2)
    const second = (await (await g.fetch(first['@odata.nextLink']!, { headers: { Authorization: `Bearer ${token}` } })).json()) as { value: unknown[]; '@odata.nextLink'?: string }
    expect(second.value).toHaveLength(1)
    expect(second['@odata.nextLink']).toBeUndefined()
    expect(((await (await api(g, token, ':/s:/children?$top=1')).json()) as { value: unknown[] }).value).toHaveLength(1)
    expect(((await (await api(g, token, ':/s:/children?$top=abc')).json()) as { value: unknown[] }).value).toHaveLength(2)
    expect(((await (await api(g, token, ':/s:/children?$top=0')).json()) as { value: unknown[] }).value).toHaveLength(2)
  })

  it('reports an object, narrowed by $select, and a folder inside the same folder as an object only once', async () => {
    const { g, token } = await ready()
    g.seed('s/x.rbs', body(3))
    await api(g, token, '/children', { method: 'POST', body: JSON.stringify({ name: 's', folder: {} }) })
    expect(await names(await api(g, token, '/children'))).toEqual(['s'])
    const item = (await (await api(g, token, ':/s/x.rbs:?$select=size')).json()) as Record<string, unknown>
    expect(Object.keys(item).sort()).toEqual(['id', 'size'])
    expect((await api(g, token, ':/s/x.rbs:', { method: 'DELETE' })).status).toBe(204)
    expect((await api(g, token, ':/s/x.rbs:', { method: 'DELETE' })).status).toBe(404)
  })

  it('stops a simple upload that would pass the quota, and lets one that replaces a smaller object through', async () => {
    const { g, token } = await ready({ quota: 10 })
    const put = (n: number, path = 's/x.rbs') => api(g, token, `:/${path}:/content`, { method: 'PUT', body: body(n) })
    expect((await put(11)).status).toBe(507)
    expect((await put(8)).status).toBe(201)
    expect((await put(10)).status).toBe(200)
    expect((await put(3, 's/y.rbs')).status).toBe(507)
  })

  it('refuses a path-based upload when parents are not created on demand', async () => {
    const { g, token } = await ready({ createsParents: false })
    expect((await api(g, token, ':/s/x.rbs:/content', { method: 'PUT', body: body(1) })).status).toBe(404)
    expect((await api(g, token, ':/s/x.rbs:/createUploadSession', { method: 'POST', body: '{}' })).status).toBe(404)
    expect((await api(g, token, ':/x.rbs:/content', { method: 'PUT', body: body(1) })).status).toBe(201)
  })
})

describe('fake graph: upload sessions', () => {
  const open = async (g: FakeGraph, token: string, path: string, payload: unknown = {}, headers: Record<string, string> = {}) => {
    const res = await api(g, token, `:/${path}:/createUploadSession`, { method: 'POST', body: payload === null ? undefined : JSON.stringify(payload), headers })
    return { res, url: res.status === 200 ? ((await res.json()) as { uploadUrl: string }).uploadUrl : '' }
  }
  const fragment = (g: FakeGraph, url: string, bytes: Uint8Array, range: string | null, init: RequestInit = {}) =>
    g.fetch(url, { method: 'PUT', body: bytes, headers: range ? { 'Content-Range': range } : {}, ...init })

  it('opens without a body, and refuses a session that would pass the quota or whose precondition does not hold', async () => {
    const { g, token } = await ready({ quota: 100 })
    expect((await open(g, token, 's/x.rbs', null)).res.status).toBe(200)
    expect((await open(g, token, 's/x.rbs', { fileSize: 101 })).res.status).toBe(507)
    expect((await open(g, token, 's/x.rbs', {}, { 'If-Match': '"nope"' })).res.status).toBe(412)
    g.seed('s/x.rbs', body(1))
    expect((await open(g, token, 's/x.rbs', {}, { 'If-Match': '"nope"' })).res.status).toBe(412)
  })

  it('refuses what an upload URL must not accept: credentials, an unknown session, a method, a missing or a misplaced range', async () => {
    const { g, token } = await ready()
    const { url } = await open(g, token, 's/x.rbs')
    expect((await fragment(g, url, body(3), 'bytes 0-2/3', { headers: { Authorization: `Bearer ${token}`, 'Content-Range': 'bytes 0-2/3' } })).status).toBe(401)
    expect((await fragment(g, `${g.origin}/up/gone`, body(3), 'bytes 0-2/3')).status).toBe(404)
    expect((await g.fetch(url, { method: 'POST', body: body(1) })).status).toBe(405)
    expect((await fragment(g, url, body(3), null)).status).toBe(400)
    expect((await fragment(g, url, body(3), 'bytes 5-7/8')).status).toBe(416)
    expect((await fragment(g, url, body(2), 'bytes 0-2/3')).status).toBe(416)
    expect((await fragment(g, url, body(3), 'bytes 0-2/9')).status).toBe(400)
    expect((await g.fetch(url)).status).toBe(200)
    expect((await g.fetch(url, { method: 'DELETE' })).status).toBe(204)
    expect((await g.fetch(url)).status).toBe(404)
  })

  it('assembles fragments, and stops a finished upload that would pass the quota or whose precondition no longer holds', async () => {
    const unit = 320 * 1024
    const { g, token } = await ready({ quota: unit + 10 })
    const one = await open(g, token, 's/x.rbs')
    expect((await fragment(g, one.url, body(unit), `bytes 0-${unit - 1}/${unit + 5}`)).status).toBe(202)
    expect((await fragment(g, one.url, body(5), `bytes ${unit}-${unit + 4}/${unit + 5}`)).status).toBe(201)
    expect(g.objects().get('s/x.rbs')).toHaveLength(unit + 5)
    const over = await open(g, token, 's/y.rbs')
    expect((await fragment(g, over.url, body(20), 'bytes 0-19/20')).status).toBe(507)
    const raced = await open(g, token, 's/z.rbs', { item: { '@microsoft.graph.conflictBehavior': 'fail' } })
    g.seed('s/z.rbs', body(1))
    expect((await fragment(g, raced.url, body(2), 'bytes 0-1/2')).status).toBe(409)
  })
})

describe('fake graph: download', () => {
  it('serves an object by its pre-authenticated URL only, and answers 404 to an unknown one', async () => {
    const { g, token } = await ready()
    g.seed('s/x.rbs', body(2, 7))
    const item = (await (await api(g, token, ':/s/x.rbs:')).json()) as Record<string, string>
    const url = item['@microsoft.graph.downloadUrl']!
    expect((await g.fetch(url, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(401)
    expect(new Uint8Array(await (await g.fetch(url)).arrayBuffer())).toEqual(body(2, 7))
    expect((await g.fetch(`${g.origin}/dl/missing`)).status).toBe(404)
    expect(g.stats.downloads).toBe(3)
  })
})

describe('fake graph: the wire', () => {
  it('answers a preflight, a path it does not serve, and refuses a host that is not its own', async () => {
    const { g } = await ready()
    const pre = await g.fetch(`${g.graph}/me/drive`, { method: 'OPTIONS' })
    expect([pre.status, pre.headers.get('access-control-allow-methods')]).toEqual([204, 'GET, PUT, POST, DELETE, OPTIONS'])
    expect((await g.fetch(`${g.origin}/nowhere`)).status).toBe(404)
    await expect(g.fetch('https://elsewhere.test/')).rejects.toThrow(TypeError)
  })

  it('fails the identity endpoints only for a fault that names them, with the body it was given or a default one', async () => {
    const g = createFakeGraph()
    g.fail({ status: 503, when: (r) => r.url.includes('/token') })
    const res = await form(g, { client_id: g.clientId, grant_type: 'authorization_code' })
    expect([res.status, await res.json()]).toEqual([503, { error: 'injected' }])
    g.fail({ status: 500 })
    expect((await authorize(g)).status).toBe(302)
    expect((await g.fetch(approot(g))).status).toBe(500)
    g.fail({ status: 503, body: { error: { code: 'custom' } }, headers: { 'X-Test': '1' } })
    expect((await g.fetch(approot(g))).headers.get('x-test')).toBe('1')
    g.throttle(1, '3')
    const throttled = await g.fetch(approot(g))
    expect([throttled.status, throttled.headers.get('retry-after')]).toEqual([429, '3'])
  })

  it('knows no plaintext reached it, and says when it did', async () => {
    const { g, token } = await ready()
    await api(g, token, ':/s/x.rbs:/content', { method: 'PUT', body: enc.encode('CANARY-title') })
    expect(() => g.assertNoPlaintext(['CANARY-other'])).not.toThrow()
    expect(() => g.assertNoPlaintext(['CANARY-title'])).toThrow(/plaintext reached the target/)
  })

  it('names the account of a request by its token or its upload URL', async () => {
    const { g, token } = await ready()
    const { uploadUrl } = (await (await api(g, token, ':/s/x.rbs:/createUploadSession', { method: 'POST', body: '{}' })).json()) as { uploadUrl: string }
    await g.fetch(uploadUrl)
    expect(g.requests.at(-1)!.account).toBe('default')
  })
})
