import { describe, expect, it } from 'vitest'
import { TargetError } from '@retroboard/application'
import { FRAGMENT_UNIT, parseRetryAfter } from '../app/adapters/sync/onedrive-graph'
import { bytesOf, connect } from './onedrive-helpers'

const MIB = 1024 * 1024
const code = async (p: Promise<unknown>) => ((await p.then(() => null, (e: unknown) => e)) as TargetError | null)?.code

describe('onedrive target: how it talks to Graph', () => {
  it('reads through the pre-authenticated download URL, without credentials, and never through the /content redirect', async () => {
    const c = await connect()
    await c.target.put('info.json', bytesOf(2000))
    expect((await c.target.get('info.json'))?.bytes).toEqual(bytesOf(2000))
    const downloads = c.fake.requests.filter((r) => new URL(r.url).pathname.startsWith('/dl/'))
    expect(downloads).toHaveLength(1)
    expect(downloads[0]!.authorization).toBeNull()
    expect(c.fake.requests.some((r) => r.url.includes('/content') && r.method === 'GET')).toBe(false)
    const metadata = c.fake.requests.find((r) => r.method === 'GET' && r.url.includes('approot:/info.json'))!
    expect(decodeURIComponent(metadata.url)).toContain('$select=id,size,eTag,@microsoft.graph.downloadUrl')
  })

  it('writes small unconditional objects with one simple PUT, and conditional ones through an upload session whose fragments carry no Authorization', async () => {
    const c = await connect()
    await c.target.put('s/a/x.rbs', bytesOf(3000))
    expect(c.fake.stats).toMatchObject({ simplePuts: 1, sessions: 0 })
    const first = await c.target.put('info.json', bytesOf(3000, 1), { ifMatch: 'absent' })
    await c.target.put('info.json', bytesOf(3001, 2), { ifMatch: first.etag })
    expect(c.fake.stats).toMatchObject({ simplePuts: 1, sessions: 2, fragments: 2 })
    const fragments = c.fake.requests.filter((r) => new URL(r.url).pathname.startsWith('/up/') && r.method === 'PUT')
    expect(fragments.every((r) => r.authorization === null)).toBe(true)
    expect(fragments[0]!.headers['content-range']).toBe('bytes 0-2999/3000')
    expect(c.fake.requests.filter((r) => r.url.includes('createUploadSession')).every((r) => r.authorization?.startsWith('Bearer '))).toBe(true)
  })

  it('sends a conditional write as a simple PUT with the header Microsoft would honour, when the owner has confirmed it live', async () => {
    const c = await connect({ graph: { conditional: 'simple' } })
    const made = await c.target.put('info.json', bytesOf(10), { ifMatch: 'absent' })
    await c.target.put('info.json', bytesOf(11), { ifMatch: made.etag })
    expect(c.fake.stats).toMatchObject({ simplePuts: 2, sessions: 0 })
    const puts = c.fake.requests.filter((r) => r.method === 'PUT')
    expect(puts[0]!.url).toContain('conflictBehavior=fail')
    expect(puts[1]!.headers['if-match']).toBe(made.etag)
  })

  it('uploads a large object in fragments that are a multiple of 320 KiB, in order, and the last one short', async () => {
    const c = await connect({ graph: { fragmentBytes: 2 * FRAGMENT_UNIT, simpleMaxBytes: FRAGMENT_UNIT } })
    const body = bytesOf(5 * FRAGMENT_UNIT + 1234)
    await c.target.put('s/big/o.rbs', body)
    expect(c.fake.stats.fragments).toBe(3)
    const ranges = c.fake.requests.filter((r) => r.method === 'PUT' && r.url.includes('/up/')).map((r) => r.headers['content-range'])
    expect(ranges).toEqual([`bytes 0-${2 * FRAGMENT_UNIT - 1}/${body.length}`, `bytes ${2 * FRAGMENT_UNIT}-${4 * FRAGMENT_UNIT - 1}/${body.length}`, `bytes ${4 * FRAGMENT_UNIT}-${body.length - 1}/${body.length}`])
    expect((await c.target.get('s/big/o.rbs'))?.bytes).toEqual(body)
  })

  it('refuses a fragment size the provider would refuse', () => {
    return expect(connect({ graph: { fragmentBytes: 1000 } })).rejects.toThrow(/320 KiB/)
  })

  it('resumes an upload from where the session says it stands after a server error or a dropped connection', async () => {
    const c = await connect({ graph: { fragmentBytes: 2 * FRAGMENT_UNIT, simpleMaxBytes: FRAGMENT_UNIT } })
    const body = bytesOf(5 * FRAGMENT_UNIT)
    c.fake.fail({ status: 500, when: (r) => r.method === 'PUT' && r.url.includes('/up/') && r.headers['content-range']!.startsWith(`bytes ${2 * FRAGMENT_UNIT}-`) })
    await c.target.put('s/big/a.rbs', body)
    expect((await c.target.get('s/big/a.rbs'))?.bytes).toEqual(body)
    expect(c.fake.stats.sessions).toBe(1)
    c.dropNext((url, init) => init?.method === 'PUT' && url.includes('/up/') && String((init.headers as Record<string, string>)['Content-Range']).startsWith(`bytes ${2 * FRAGMENT_UNIT}-`))
    await c.target.put('s/big/b.rbs', body)
    expect((await c.target.get('s/big/b.rbs'))?.bytes).toEqual(body)
    expect(c.fake.stats.sessions).toBe(2)
    expect(c.sleeps.length).toBe(2)
  })

  it('starts over with a new session when the first has expired, and cancels one it gives up on', async () => {
    const c = await connect({ graph: { fragmentBytes: FRAGMENT_UNIT, simpleMaxBytes: FRAGMENT_UNIT } })
    c.fake.fail({ status: 404, when: (r) => r.method === 'PUT' && r.url.includes('/up/') })
    const body = bytesOf(2 * FRAGMENT_UNIT)
    await c.target.put('s/big/c.rbs', body)
    expect(c.fake.stats.sessions).toBe(2)
    expect((await c.target.get('s/big/c.rbs'))?.bytes).toEqual(body)
    const doomed = await connect({ graph: { fragmentBytes: FRAGMENT_UNIT, simpleMaxBytes: FRAGMENT_UNIT } })
    doomed.fake.fail({ status: 403, when: (r) => r.method === 'PUT' && r.url.includes('/up/') })
    expect(await code(doomed.target.put('s/big/d.rbs', body))).toBe('forbidden')
    expect(doomed.fake.requests.some((r) => r.method === 'DELETE' && r.url.includes('/up/'))).toBe(true)
  })

  it('creates the folders of a path when the provider does not, and a precondition on a missing item stays a failed precondition', async () => {
    const c = await connect({ createsParents: false })
    await c.target.put('s/aaaa/x.rbs', bytesOf(10))
    expect((await c.target.get('s/aaaa/x.rbs'))?.bytes).toEqual(bytesOf(10))
    expect(await code(c.target.put('s/zzzz/y.rbs', bytesOf(10), { ifMatch: '"{nothing},1"' }))).toBe('precondition-failed')
  })

  it('follows nextLink across pages, and refuses a link that leaves the host', async () => {
    const c = await connect({ pageSize: 50 })
    for (let i = 0; i < 120; i++) await c.target.put(`s/p/o${String(i).padStart(4, '0')}.rbs`, new Uint8Array(3))
    const listed: string[] = []
    for await (const o of c.target.list('s/p/')) listed.push(o.path)
    expect(listed).toHaveLength(120)
    const pages = c.fake.requests.filter((r) => r.method === 'GET' && r.url.includes(':/children'))
    expect(pages).toHaveLength(3)
    const hostile = await connect()
    await hostile.target.put('s/p/o.rbs', new Uint8Array(3))
    hostile.fake.fail({ status: 200, body: { value: [], '@odata.nextLink': 'https://elsewhere.example/steal?token=1' }, when: (r) => r.url.includes(':/children') })
    expect(await code((async () => { for await (const _ of hostile.target.list('s/p/')) { /* drain */ } })())).toBe('unreachable')
    expect(hostile.fake.requests.some((r) => r.url.includes('elsewhere'))).toBe(false)
  })

  it('lists across the folders a prefix reaches, and ignores what is not a vault name', async () => {
    const c = await connect()
    await c.target.put('m/dev1.rbm', bytesOf(5))
    await c.target.put('s/aaaa/x.rbs', bytesOf(5))
    await c.target.put('s/bbbb/y.rbs', bytesOf(5))
    c.fake.seed('Notes.txt', bytesOf(3))
    c.fake.seed('s/Mixed/z.rbs', bytesOf(3))
    const all = async (prefix: string) => { const out: string[] = []; for await (const o of c.target.list(prefix)) out.push(o.path); return out.sort() }
    expect(await all('s/')).toEqual(['s/aaaa/x.rbs', 's/bbbb/y.rbs'])
    expect(await all('')).toEqual(['m/dev1.rbm', 's/aaaa/x.rbs', 's/bbbb/y.rbs'])
    expect(await all('info')).toEqual([])
  })
})

describe('onedrive target: throttling, tokens and errors', () => {
  it('waits what Retry-After says, then goes on', async () => {
    const c = await connect()
    c.fake.throttle(2, 4)
    await c.target.put('info.json', bytesOf(10))
    expect(c.sleeps).toEqual([4000, 4000])
    expect((await c.target.get('info.json'))?.bytes).toEqual(bytesOf(10))
  })

  it('reads Retry-After as seconds or as a date, and falls back to a backoff with jitter when the header is missing', async () => {
    expect(parseRetryAfter('7', 0)).toBe(7000)
    expect(parseRetryAfter('Thu, 01 Jan 1970 00:00:09 GMT', 0)).toBe(9000)
    expect(parseRetryAfter('Thu, 01 Jan 1970 00:00:09 GMT', 20_000)).toBe(0)
    expect(parseRetryAfter('soon', 0)).toBeNull()
    expect(parseRetryAfter(null, 0)).toBeNull()
    const c = await connect({ graph: { random: () => 0 } })
    c.fake.fail({ status: 503, times: 3 })
    await c.target.put('info.json', bytesOf(10))
    expect(c.sleeps).toEqual([500, 1000, 2000])
  })

  it('gives up after five attempts with the wait the provider asked for, and never sleeps through a long one', async () => {
    const c = await connect()
    c.fake.throttle(10, 2)
    const error = await c.target.put('info.json', bytesOf(10)).catch((e: unknown) => e) as TargetError
    expect([error.code, error.retryAfterMs, c.sleeps.length]).toEqual(['throttled', 2000, 4])
    const long = await connect()
    long.fake.throttle(1, 600)
    const slow = await long.target.get('info.json').catch((e: unknown) => e) as TargetError
    expect([slow.code, slow.retryAfterMs, long.sleeps.length]).toEqual(['throttled', 600_000, 0])
    const bandwidth = await connect()
    bandwidth.fake.fail({ status: 509, times: 1 })
    await bandwidth.target.put('info.json', bytesOf(10))
    expect(bandwidth.sleeps).toHaveLength(1)
  })

  it('renews an access token the provider refused, once, and reports a refresh that fails as "sign in again"', async () => {
    const c = await connect()
    await c.target.put('info.json', bytesOf(10))
    c.fake.expireAccessTokens()
    expect((await c.target.get('info.json'))?.bytes).toEqual(bytesOf(10))
    expect(c.fake.stats.refreshes).toBe(1)
    c.fake.expireAccessTokens()
    c.fake.revokeRefreshTokens()
    expect(await code(c.target.get('info.json'))).toBe('auth-expired')
  })

  it('renews the access token ahead of its end, and a refresh token is dead 24 hours after the sign-in, whatever was renewed since', async () => {
    const c = await connect()
    await c.target.put('info.json', bytesOf(10))
    c.clock.now += 3_550_000
    await c.target.get('info.json')
    expect(c.fake.stats.refreshes).toBe(1)
    expect(c.refreshTokens).toHaveLength(2)
    c.clock.now += 23 * 3_600_000
    await c.target.get('info.json')
    expect(c.fake.stats.refreshes).toBe(2)
    c.clock.now += 3_600_000
    expect(await code(c.target.get('info.json'))).toBe('auth-expired')
  })

  it('maps what Graph answers to the codes the engine understands, with no body, name or path in the error', async () => {
    const c = await connect()
    await c.target.put('s/aaaa/secret-looking.rbs', bytesOf(10))
    const cases: [number, string][] = [[403, 'forbidden'], [507, 'target-full'], [413, 'too-large'], [400, 'unsupported'], [500, 'unreachable'], [502, 'unreachable'], [404, 'not-found']]
    for (const [status, expected] of cases) {
      c.fake.fail({ status, body: { error: { code: 'x', message: 'CANARY-leak-9f31 /s/aaaa/secret-looking.rbs' } } })
      const error = await c.target.delete('s/aaaa/secret-looking.rbs').catch((e: unknown) => e) as TargetError
      // A delete treats 404 as done: that case is the only one that resolves.
      expect(error instanceof TargetError ? error.code : 'resolved').toBe(status === 404 ? 'resolved' : expected)
      if (error instanceof TargetError) expect(error.message).toBe(expected)
    }
    c.fake.fail({ status: 404 })
    expect(await c.target.get('s/aaaa/secret-looking.rbs')).toBeNull()
  })

  it('an object over the limit is refused before anything is sent', async () => {
    const c = await connect()
    const before = c.fake.requests.length
    expect(await code(c.target.put('s/aaaa/huge.rbs', new Uint8Array(64 * MIB + 1)))).toBe('too-large')
    expect(c.fake.requests.length).toBe(before)
  })

  it('refuses a path that is not an object path, before the network', async () => {
    const c = await connect()
    const before = c.fake.requests.length
    for (const bad of ['S/x.rbs', 's/a b.rbs', '../x', '']) expect(await code(c.target.get(bad))).toBe('unsupported')
    expect(c.fake.requests.length).toBe(before)
  })

  it('never holds more than three requests in flight', async () => {
    const c = await connect()
    let live = 0
    let peak = 0
    c.hold(async () => { live += 1; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 5)); live -= 1 })
    await Promise.all(Array.from({ length: 12 }, (_, i) => c.target.put(`s/many/o${i}.rbs`, new Uint8Array(3))))
    expect(peak).toBeLessThanOrEqual(3)
    expect(peak).toBeGreaterThan(1)
  })
})

