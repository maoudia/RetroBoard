import { describe, expect, it } from 'vitest'
import { TargetError } from '@retroboard/application'
import type { SyncTargetPort } from '@retroboard/application'
import {
  type ContractFault, type ContractHarness, contractChecks, createMemoryTarget, faultChecks, findPlaintext, runSyncTargetContract,
} from '../src'

const faults = (t: ReturnType<typeof createMemoryTarget>): ContractHarness['inject'] => (f: ContractFault) =>
  t.failNext({ 'permission-revoked': 'permission-needed', 'token-expired': 'auth-expired', 'quota-full': 'target-full', offline: 'unreachable' }[f] as 'unreachable')

runSyncTargetContract('in-memory fake', () => {
  const target = createMemoryTarget()
  return { target, inject: faults(target) }
})

runSyncTargetContract('in-memory fake without conditional puts', () => ({ target: createMemoryTarget({ capabilities: { conditionalPut: 'none' } }) }))

const enc = new TextEncoder()
const b64 = (s: string) => btoa(s)

describe('memory target', () => {
  it('queues failures, keeps retryAfterMs and rejects what exceeds the size limit', async () => {
    const t = createMemoryTarget({ capabilities: { maxObjectBytes: 4 } })
    t.failNext('throttled', 1500)
    const err = await t.get('info.json').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(TargetError)
    expect((err as TargetError).retryAfterMs).toBe(1500)
    expect((err as TargetError).message).toBe('throttled')
    await expect(t.put('info.json', new Uint8Array(5))).rejects.toMatchObject({ code: 'too-large' })
    await t.put('info.json', new Uint8Array(4))
    expect(t.capabilities.conditionalPut).toBe('etag')
  })
  it('hands out copies, so a caller cannot alter what is stored or what the guard recorded', async () => {
    const t = createMemoryTarget({ now: () => 42 })
    const body = new Uint8Array([1, 2, 3])
    await t.put('info.json', body)
    body[0] = 9
    const got = await t.get('info.json')
    got!.bytes[1] = 9
    expect((await t.get('info.json'))?.bytes).toEqual(new Uint8Array([1, 2, 3]))
    expect(t.objects().get('info.json')).toEqual(new Uint8Array([1, 2, 3]))
    expect(t.seenBodies[0]).toEqual(new Uint8Array([1, 2, 3]))
    expect((await t.stat('info.json'))?.modifiedAt).toBe(42)
  })
  it('lists in path order and refuses a bad prefix', async () => {
    const t = createMemoryTarget()
    await t.put('s/b/x.rbs', new Uint8Array(1))
    await t.put('s/a/x.rbs', new Uint8Array(1))
    const out: string[] = []
    for await (const o of t.list('s/')) out.push(o.path)
    expect(out).toEqual(['s/a/x.rbs', 's/b/x.rbs'])
    await expect((async () => { for await (const _ of t.list('S/')) void _ })()).rejects.toMatchObject({ code: 'unsupported' })
  })
})

describe('plaintext guard', () => {
  const canary = 'CANARY-title-7f3a'
  it('passes on sealed-looking data and on a clean path', async () => {
    const t = createMemoryTarget()
    await t.put('s/abcdef/dev-1-aa.rbs', crypto.getRandomValues(new Uint8Array(4096)))
    expect(() => t.assertNoPlaintext([canary, 'CANARY-note-91bc'])).not.toThrow()
  })
  it('fails on a planted plaintext path', async () => {
    const t = createMemoryTarget()
    await t.put('s/canary-title-7f3a/dev.rbs', new Uint8Array(1))
    expect(() => t.assertNoPlaintext([canary])).toThrow(/in the path/)
  })
  it('fails on a planted plaintext body, in every form', async () => {
    const forms: Record<string, Uint8Array> = {
      'utf-8': enc.encode(`xx${canary}yy`),
      'utf-16le': new Uint8Array([...new Uint8Array(3), ...new Uint8Array(new Uint16Array([...canary].map((c) => c.charCodeAt(0))).buffer)]),
      'utf-16be': new Uint8Array([0, ...[...canary].flatMap((c) => [0, c.charCodeAt(0)])]),
      'percent-encoded': enc.encode(`https://x/?q=${encodeURIComponent(canary)}`),
      base64: enc.encode(`{"v":"${b64(canary)}"}`),
      'base64 at offset 1': enc.encode(`{"v":"${b64(`a${canary}`)}"}`),
      'base64 at offset 2': enc.encode(`{"v":"${b64(`ab${canary}`)}"}`),
      base64url: enc.encode(b64(`ab${canary}??>>`).replaceAll('+', '-').replaceAll('/', '_')),
    }
    for (const [form, body] of Object.entries(forms)) {
      const t = createMemoryTarget()
      await t.put('s/aaaa/dev.rbs', body)
      expect(() => t.assertNoPlaintext([canary]), form).toThrow(/object body #0/)
    }
  })
  it('matches non-ASCII canaries and reads a path in any case', () => {
    expect(findPlaintext(['Rétro-Équipe-2026'], [], [enc.encode('..Rétro-Équipe-2026..')])).toMatch(/utf-8/)
    expect(findPlaintext(['CANARY-Team-0001'], ['s/CANARY-team-0001/x'], [])).toMatch(/path/)
    expect(findPlaintext([canary], ['s/a'], [new Uint8Array(0), new Uint8Array(3)])).toBeNull()
  })
  it('refuses a canary too short to prove anything', () => {
    expect(() => findPlaintext(['abc'], [], [])).toThrow(/too short/)
  })
  it('records names given to every operation, not only puts', async () => {
    const t = createMemoryTarget()
    await t.get('s/canary-title-7f3a/x')
    expect(() => t.assertNoPlaintext([canary])).toThrow()
    const u = createMemoryTarget()
    await u.stat('s/canary-title-7f3a/x')
    await u.delete('s/canary-title-7f3a/x')
    expect(u.seenPaths).toHaveLength(2)
  })
})

/** A target with one deliberate defect; the contract must catch each. */
const broken = (defect: string): ContractHarness => {
  const inner = createMemoryTarget()
  const target: SyncTargetPort = {
    kind: 'idb', capabilities: inner.capabilities,
    list: (p, s) => (defect === 'list-ignores-prefix' ? inner.list('', s) : defect === 'list-one-page'
      ? (async function* () { let n = 0; for await (const o of inner.list(p, s)) { if (n++ < 1000) yield o } })() : inner.list(p, s)),
    get: async (p, s) => {
      const r = await inner.get(p, s)
      return defect === 'missing-get-empty' && !r ? { bytes: new Uint8Array(0), etag: 'x' } : r
    },
    put: async (p, b, o) => {
      if (defect === 'truncates') return inner.put(p, b.slice(0, Math.max(0, b.length - 1)), o)
      if (defect === 'ignores-ifmatch') return inner.put(p, b)
      if (defect === 'same-etag') { await inner.put(p, b, o); return { etag: 'same' } }
      if (defect === 'accepts-uppercase') return inner.put(p.toLowerCase(), b, o)
      return inner.put(p, b, o)
    },
    delete: async (p) => {
      if (defect === 'delete-throws-when-missing' && !(await inner.stat(p))) throw new TargetError('not-found')
      return inner.delete(p)
    },
    stat: async (p) => (defect === 'missing-stat-throws' && !(await inner.get(p)) ? Promise.reject(new TargetError('not-found')) : inner.stat(p)),
  }
  return { target, inject: (f) => inner.failNext(defect === 'wrong-code' ? 'forbidden' : ({ 'permission-revoked': 'permission-needed', 'token-expired': 'auth-expired', 'quota-full': 'target-full', offline: 'unreachable' } as const)[f]) }
}

describe('a deliberately broken target fails the contract', () => {
  const cases: [string, string][] = [
    ['truncates', 'round trip of 1 B'],
    ['truncates', 'round trip of 5 MiB'],
    ['same-etag', 'a plain put replaces the object and changes its etag'],
    ['ignores-ifmatch', 'create-only: "absent" fails on an existing path and succeeds on a free one'],
    ['ignores-ifmatch', 'ifMatch: a stale etag fails and the current one succeeds'],
    ['missing-get-empty', 'get and stat of a missing path give null'],
    ['missing-stat-throws', 'get and stat of a missing path give null'],
    ['list-ignores-prefix', 'list returns only the prefix, with sizes and etags, across 1,200 objects'],
    ['list-one-page', 'list returns only the prefix, with sizes and etags, across 1,200 objects'],
    ['delete-throws-when-missing', 'delete is idempotent'],
    ['accepts-uppercase', 'names are lowercase ASCII, so two names differing by case cannot coexist'],
  ]
  it.each(cases)('%s is caught by "%s"', async (defect, name) => {
    const check = contractChecks.find((c) => c.name === name)!
    expect(check, name).toBeDefined()
    await expect(check.run(broken(defect))).rejects.toThrow()
  })
  it.each(faultChecks.map((c) => c.name))('a wrong error code is caught by "%s"', async (name) => {
    await expect(faultChecks.find((c) => c.name === name)!.run(broken('wrong-code'))).rejects.toThrow()
  })
  it('a correct target passes every check', async () => {
    for (const check of [...contractChecks, ...faultChecks]) await check.run(broken('none'))
  }, 60_000)
})
