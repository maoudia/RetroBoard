import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { createFakeGraph } from '@retroboard/testkit'
import { createLocalSealer, resetDeviceKeyCache } from '../app/adapters/device-key'
import { openReplicaDb } from '../app/adapters/replica-idb'
import { DEFAULT_AUTHORITY, DEFAULT_GRAPH, onedriveConfig } from '../app/adapters/sync/onedrive-config'
import { createOnedriveSession } from '../app/adapters/sync/onedrive-session'
import { createSyncStateStore } from '../app/adapters/sync/sync-state'
import { PAGE, REDIRECT, loopbackWorker } from './onedrive-helpers'

const CLIENT = '11111111-2222-4333-8444-555555555555'

class MemoryStorage { readonly map = new Map<string, string>(); getItem(k: string) { return this.map.get(k) ?? null } setItem(k: string, v: string) { this.map.set(k, v) } removeItem(k: string) { this.map.delete(k) } }

/** The whole round trip of the page without a browser: the session, its worker (in process), the fake Microsoft, and the redirects as the window would follow them. */
function setup() {
  const clock = { now: 1_700_000_000_000 }
  const fake = createFakeGraph({ redirectUris: [REDIRECT], now: () => clock.now })
  const storage = new MemoryStorage()
  const factory = new IDBFactory()
  const state = createSyncStateStore(factory)
  const navigations: string[] = []
  const make = () => createOnedriveSession({
    config: { clientId: fake.clientId, authority: fake.authority, graph: fake.graph, redirectUri: REDIRECT },
    state, sealer: createLocalSealer(openReplicaDb(factory)), storage, now: () => clock.now,
    navigate: (url) => { navigations.push(url) },
    makeWorker: () => loopbackWorker(fake.fetchFrom(PAGE), { sleep: async () => undefined }),
  })
  /** What Microsoft does with the authorize URL the window was sent to: it answers with the redirect back. */
  const follow = async (url: string) => (await fake.fetch(url)).headers.get('Location')!
  const search = (location: string) => new URL(location).search
  return { fake, clock, storage, state, navigations, make, follow, search }
}

describe('a OneDrive session, from the click to the stored token', () => {
  beforeEach(() => resetDeviceKeyCache())

  it('signs in: the redirect out, the code back, the tokens traded in the worker, the refresh token sealed, and a restart restores it', async () => {
    const t = setup()
    const session = t.make()
    await session.start('/boards', 'connect', 'select_account')
    const back = await t.follow(t.navigations[0]!)
    expect(await session.complete(t.search(back))).toEqual({ kind: 'signed-in', returnTo: '/boards', intent: 'connect' })
    expect(await session.target.get('info.json')).toBeNull()
    await session.target.put('info.json', new Uint8Array(1500))
    // A new page load: a new session object finds the sealed token and works without asking Microsoft's page again.
    resetDeviceKeyCache()
    const next = t.make()
    expect(await next.restore()).toBe('ready')
    expect((await next.target.get('info.json'))?.bytes.length).toBe(1500)
    // The redirect link cannot be used twice, and a link nobody here started is dropped.
    expect(await next.complete(t.search(back))).toEqual({ kind: 'failed', returnTo: '/boards' })
    expect(await next.complete('?state=stray&code=abc')).toEqual({ kind: 'failed', returnTo: '/boards' })
    expect(await next.complete('')).toEqual({ kind: 'ignored' })
  })

  it('a silent renewal with no Microsoft session goes on by itself to the sign-in the person sees, and the second answer is not tried again', async () => {
    const t = setup()
    t.fake.setSession(false)
    const session = t.make()
    await session.start('/boards', 'renew', 'none')
    const refused = await t.follow(t.navigations[0]!)
    expect(new URL(refused).searchParams.get('error')).toBe('login_required')
    expect(await session.complete(t.search(refused))).toEqual({ kind: 'redirecting' })
    expect(new URL(t.navigations[1]!).searchParams.get('prompt')).toBe('select_account')
    t.fake.denyNextAuthorize('access_denied')
    const denied = await t.follow(t.navigations[1]!)
    expect(await session.complete(t.search(denied))).toEqual({ kind: 'failed', returnTo: '/boards' })
    expect(t.navigations).toHaveLength(2)
  })

  it('a token that is 24 hours old, or gone, asks for a new sign-in without a request to Microsoft', async () => {
    const t = setup()
    const session = t.make()
    expect(await session.restore()).toBe('sign-in-again')
    await session.start('/boards', 'connect', 'select_account')
    await session.complete(t.search(await t.follow(t.navigations[0]!)))
    const before = t.fake.requests.length
    t.clock.now += 24 * 3_600_000
    expect(await t.make().restore()).toBe('sign-in-again')
    expect(t.fake.requests.length).toBe(before)
  })

  it('forgets everything: the worker and the sealed token', async () => {
    const t = setup()
    const session = t.make()
    await session.start('/boards', 'connect', 'select_account')
    await session.complete(t.search(await t.follow(t.navigations[0]!)))
    await session.forget()
    expect(await t.state.get('onedrive-token')).toBeUndefined()
    expect(await t.make().restore()).toBe('sign-in-again')
    await expect(session.target.get('info.json')).rejects.toMatchObject({ code: 'auth-expired' })
  })
})

describe('what a deployment offers', () => {
  it('offers nothing without a client id, and takes the served one before the build-time one', () => {
    expect(onedriveConfig({}, '', PAGE)).toBeNull()
    expect(onedriveConfig(null, '', PAGE)).toBeNull()
    expect(onedriveConfig({ onedrive: { clientId: 'nope' } }, '', PAGE)).toBeNull()
    expect(onedriveConfig({}, 'not-a-guid', PAGE)).toBeNull()
    expect(onedriveConfig({}, CLIENT, PAGE)).toEqual({ clientId: CLIENT, authority: DEFAULT_AUTHORITY, graph: DEFAULT_GRAPH, redirectUri: REDIRECT })
    expect(onedriveConfig({ onedrive: { clientId: '99999999-2222-4333-8444-555555555555' } }, CLIENT, PAGE)?.clientId).toBe('99999999-2222-4333-8444-555555555555')
  })

  it('reads the endpoints a deployment serves, only when they are web addresses, and the personal-account authority otherwise', () => {
    const served = onedriveConfig({ onedrive: { clientId: CLIENT, authority: 'http://127.0.0.1:8788/consumers/', graph: 'http://127.0.0.1:8788/v1.0' } }, '', PAGE)
    expect(served).toMatchObject({ authority: 'http://127.0.0.1:8788/consumers', graph: 'http://127.0.0.1:8788/v1.0' })
    const hostile = onedriveConfig({ onedrive: { clientId: CLIENT, authority: 'javascript:alert(1)', graph: 42 } }, '', PAGE)
    expect(hostile).toMatchObject({ authority: DEFAULT_AUTHORITY, graph: DEFAULT_GRAPH })
    expect(DEFAULT_AUTHORITY).toContain('/consumers')
  })
})
