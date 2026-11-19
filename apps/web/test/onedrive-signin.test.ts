import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { TargetError } from '@retroboard/application'
import { createLocalSealer, resetDeviceKeyCache } from '../app/adapters/device-key'
import { openReplicaDb } from '../app/adapters/replica-idb'
import { createOnedriveAuth } from '../app/adapters/sync/onedrive-auth'
import {
  NEEDS_INTERACTION, PENDING_MS, type SessionStorageLike, authorizeUrl, challengeOf, newVerifier, parseCallback, safeReturn, startSignIn, takePending,
} from '../app/adapters/sync/oauth-pkce'
import { createSyncStateStore } from '../app/adapters/sync/sync-state'
import { REFRESH_LIFETIME_MS, createTokenStore, stillValid } from '../app/adapters/sync/token-store'
import { PAGE, REDIRECT, fakeWithCode } from './onedrive-helpers'

class MemoryStorage implements SessionStorageLike {
  readonly map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
}

describe('PKCE and the authorize URL', () => {
  it('derives the challenge as RFC 7636 does (its own test vector)', async () => {
    expect(await challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('makes a long, URL-safe, never repeated verifier', () => {
    const a = newVerifier()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(newVerifier()).not.toBe(a)
  })

  it('asks for the app folder and a refresh token, as a public client: code flow, S256, the consumers authority, no secret, no login hint', async () => {
    const url = new URL(authorizeUrl({ authority: 'https://login.microsoftonline.com/consumers', clientId: 'cid', redirectUri: REDIRECT, state: 'st', challenge: 'ch', prompt: 'select_account' }))
    expect(url.origin + url.pathname).toBe('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'cid', response_type: 'code', redirect_uri: REDIRECT, response_mode: 'query', scope: 'Files.ReadWrite.AppFolder offline_access',
      state: 'st', code_challenge: 'ch', code_challenge_method: 'S256', prompt: 'select_account',
    })
  })

  it('keeps the verifier in the tab until the redirect comes back, once, and not for ever', async () => {
    const storage = new MemoryStorage()
    const url = new URL(await startSignIn({ authority: 'https://a.example/consumers', clientId: 'cid', redirectUri: REDIRECT, returnTo: '/boards', intent: 'connect', prompt: 'select_account', storage, now: () => 1000 }))
    const state = url.searchParams.get('state')!
    const stored = JSON.parse([...storage.map.values()][0]!) as { verifier: string }
    expect(url.searchParams.get('code_challenge')).toBe(await challengeOf(stored.verifier))
    // The only thing in the URL is the state: the verifier stays in the tab.
    expect(url.toString()).not.toContain(stored.verifier)
    expect(takePending(storage, state, 1000 + 5)).toMatchObject({ returnTo: '/boards', intent: 'connect', prompt: 'select_account', verifier: stored.verifier })
    expect(takePending(storage, state, 1000 + 5)).toBeNull()
    await startSignIn({ authority: 'https://a.example/consumers', clientId: 'cid', redirectUri: REDIRECT, returnTo: '/boards', intent: 'renew', prompt: 'none', storage, now: () => 1000 })
    const old = [...storage.map.keys()][0]!.replace('retroboard:oauth:', '')
    expect(takePending(storage, old, 1000 + PENDING_MS + 1)).toBeNull()
    expect(takePending(storage, 'never-started')).toBeNull()
    expect(storage.map.size).toBe(0)
  })

  it('only ever sends the person back to a path of this site', () => {
    expect(safeReturn('/boards#c=abc')).toBe('/boards#c=abc')
    expect(safeReturn('/board?x=1#r=room&k=key')).toBe('/board?x=1#r=room&k=key')
    for (const hostile of ['//evil.example', 'https://evil.example/', 'javascript:alert(1)', '\\evil.example', '', 'boards']) expect(safeReturn(hostile)).toBe('/boards')
  })

  it('reads what the redirect brought: a code, or the error Microsoft named; anything else is not ours', () => {
    expect(parseCallback('?code=abc&state=s1&session_state=x')).toEqual({ ok: true, state: 's1', code: 'abc' })
    expect(parseCallback('?error=login_required&error_description=x&state=s1')).toEqual({ ok: false, state: 's1', error: 'login_required' })
    expect(parseCallback('?code=abc')).toBeNull()
    expect(parseCallback('?state=s1')).toBeNull()
    expect(parseCallback('')).toBeNull()
    expect(NEEDS_INTERACTION.has('login_required')).toBe(true)
    expect(NEEDS_INTERACTION.has('access_denied')).toBe(false)
  })
})

describe('the token endpoint', () => {
  it('trades the code once, with the verifier, for tokens it keeps in memory and hands the refresh token on', async () => {
    const { fake, verifier, code } = await fakeWithCode()
    const handed: string[] = []
    const auth = createOnedriveAuth({ fetch: fake.fetchFrom(PAGE), authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT, onRefreshToken: (t) => handed.push(t) })
    await auth.exchange(code, verifier)
    expect(auth.signedIn).toBe(true)
    expect(handed).toHaveLength(1)
    expect(await auth.accessToken()).toMatch(/^at-/)
    const second = createOnedriveAuth({ fetch: fake.fetchFrom(PAGE), authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT })
    await expect(second.exchange(code, verifier)).rejects.toMatchObject({ code: 'auth-expired' })
    const request = fake.requests.find((r) => r.url.endsWith('/token'))!
    const form = new URLSearchParams(new TextDecoder().decode(request.body))
    expect(Object.fromEntries(form)).toMatchObject({ grant_type: 'authorization_code', client_id: fake.clientId, redirect_uri: REDIRECT, code_verifier: verifier, scope: 'Files.ReadWrite.AppFolder offline_access' })
    expect(form.has('client_secret')).toBe(false)
  })

  it('refuses a code with the wrong verifier', async () => {
    const { fake, code } = await fakeWithCode()
    const auth = createOnedriveAuth({ fetch: fake.fetchFrom(PAGE), authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT })
    await expect(auth.exchange(code, newVerifier())).rejects.toMatchObject({ code: 'auth-expired' })
    expect(auth.signedIn).toBe(false)
  })

  it('renews from a restored refresh token, once at a time, and keeps the rotated token', async () => {
    const { fake, verifier, code, clock } = await fakeWithCode()
    const handed: string[] = []
    const first = createOnedriveAuth({ fetch: fake.fetchFrom(PAGE), authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT, now: () => clock.now, onRefreshToken: (t) => handed.push(t) })
    await first.exchange(code, verifier)
    const restored = createOnedriveAuth({ fetch: fake.fetchFrom(PAGE), authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT, now: () => clock.now, onRefreshToken: (t) => handed.push(t) })
    restored.restore(handed[0]!)
    const tokens = await Promise.all([restored.accessToken(), restored.accessToken(), restored.accessToken()])
    expect(new Set(tokens).size).toBe(1)
    expect(fake.stats.refreshes).toBe(1)
    expect(handed).toHaveLength(2)
    expect(handed[1]).not.toBe(handed[0])
  })

  it('has nothing to renew from before a sign-in, and forgets everything on request', async () => {
    const { fake, verifier, code } = await fakeWithCode()
    const auth = createOnedriveAuth({ fetch: fake.fetchFrom(PAGE), authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT })
    await expect(auth.accessToken()).rejects.toMatchObject({ code: 'auth-expired' })
    await auth.exchange(code, verifier)
    auth.forget()
    expect(auth.signedIn).toBe(false)
    await expect(auth.accessToken()).rejects.toBeInstanceOf(TargetError)
    expect(fake.stats.refreshes).toBe(0)
  })

  it('tells an expired grant, a throttled endpoint, a down endpoint and a lost network apart', async () => {
    const { fake, verifier, code } = await fakeWithCode()
    const make = (fetchImpl: typeof fetch) => createOnedriveAuth({ fetch: fetchImpl, authority: fake.authority, clientId: fake.clientId, redirectUri: REDIRECT })
    const auth = make(fake.fetchFrom(PAGE))
    await auth.exchange(code, verifier)
    const restored = make(fake.fetchFrom(PAGE))
    restored.restore('rt-unknown')
    await expect(restored.accessToken()).rejects.toMatchObject({ code: 'auth-expired' })
    for (const [status, expected] of [[429, 'throttled'], [503, 'unreachable'], [400, 'forbidden']] as const) {
      fake.fail({ status, body: { error: 'server_error' }, when: (r) => r.url.endsWith('/token') })
      const again = make(fake.fetchFrom(PAGE))
      again.restore('rt-unknown')
      await expect(again.accessToken()).rejects.toMatchObject({ code: expected })
    }
    const offline = make((() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch)
    offline.restore('rt-x')
    await expect(offline.accessToken()).rejects.toMatchObject({ code: 'unreachable' })
  })
})

describe('the refresh token at rest', () => {
  beforeEach(() => resetDeviceKeyCache())

  it('is sealed with the device key in the connection database, with the moment of sign-in beside it, and goes with "forget"', async () => {
    const factory = new IDBFactory()
    const state = createSyncStateStore(factory)
    const store = createTokenStore(state, createLocalSealer(openReplicaDb(factory)))
    expect(await store.load()).toBeNull()
    await store.signedIn('rt-secret-token-value', 5000)
    const raw = await state.get<{ sealed: string; signedAt: number }>('onedrive-token')
    expect(JSON.stringify(raw)).not.toContain('secret')
    expect(raw?.signedAt).toBe(5000)
    expect(await store.load()).toEqual({ refreshToken: 'rt-secret-token-value', signedAt: 5000 })
    await store.rotated('rt-rotated')
    expect(await store.load()).toEqual({ refreshToken: 'rt-rotated', signedAt: 5000 })
    await store.clear()
    expect(await store.load()).toBeNull()
    await store.rotated('rt-orphan')
    expect(await store.load()).toBeNull()
  })

  it('is not readable once the device key is gone, and counts its 24 hours from the sign-in with a margin', async () => {
    const factory = new IDBFactory()
    const state = createSyncStateStore(factory)
    await createTokenStore(state, createLocalSealer(openReplicaDb(factory))).signedIn('rt-secret', 0)
    resetDeviceKeyCache()
    expect(await createTokenStore(state, createLocalSealer(openReplicaDb(new IDBFactory()))).load()).toBeNull()
    const token = { refreshToken: 'x', signedAt: 1_000_000 }
    expect(stillValid(token, 1_000_000 + 60_000)).toBe(true)
    expect(stillValid(token, 1_000_000 + REFRESH_LIFETIME_MS - 10 * 60_000)).toBe(true)
    expect(stillValid(token, 1_000_000 + REFRESH_LIFETIME_MS - 60_000)).toBe(false)
    expect(stillValid(token, 1_000_000 + REFRESH_LIFETIME_MS + 1)).toBe(false)
  })
})
