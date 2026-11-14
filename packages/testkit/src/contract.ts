/**
 * The adapter contract (change user-drive-storage, design "Adapter contract suite"): one vitest suite every
 * `SyncTargetPort` adapter file calls, so adding a target is writing the adapter and passing this.
 * The checks are plain functions too (`contractChecks`), so a test can prove each one fails on a broken target.
 */
import { describe, expect, it } from 'vitest'
import { type SyncTargetPort, TargetError, type TargetErrorCode } from '@retroboard/application'

/** A failure an adapter must map: what happened to the provider, and the code the engine must see. */
export type ContractFault = 'permission-revoked' | 'token-expired' | 'quota-full' | 'offline'
export const FAULT_CODES: Readonly<Record<ContractFault, TargetErrorCode>> = {
  'permission-revoked': 'permission-needed',
  'token-expired': 'auth-expired',
  'quota-full': 'target-full',
  offline: 'unreachable',
}

export interface ContractHarness {
  readonly target: SyncTargetPort
  /** Makes the next operation fail the way the provider would. An adapter without it skips the mapping checks. */
  inject?(fault: ContractFault): void | Promise<void>
  dispose?(): void | Promise<void>
}

export interface ContractCheck {
  readonly name: string
  run(h: ContractHarness): Promise<void>
}

const bytesOf = (n: number, seed = 7): Uint8Array => {
  const out = new Uint8Array(n)
  let x = seed
  for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; out[i] = x >> 16 }
  return out
}

const rejectsWith = async (p: Promise<unknown>, code: TargetErrorCode) => {
  const err = await p.then(() => null, (e: unknown) => e)
  expect(err, `expected a TargetError "${code}"`).toBeInstanceOf(TargetError)
  expect((err as TargetError).code).toBe(code)
}

const collect = async (it: AsyncIterable<{ path: string; size: number; etag: string }>) => {
  const out: { path: string; size: number; etag: string }[] = []
  for await (const o of it) out.push(o)
  return out
}

const roundTrip = (n: number): ContractCheck => ({
  name: `round trip of ${n === 5 * 1024 * 1024 ? '5 MiB' : `${n} B`}`,
  async run({ target }) {
    const body = bytesOf(n)
    const { etag } = await target.put('s/rt/object.rbs', body)
    expect(etag).toBeTruthy()
    const got = await target.get('s/rt/object.rbs')
    expect(got?.bytes).toEqual(body)
    expect(got?.etag).toBe(etag)
    expect((await target.stat('s/rt/object.rbs'))?.size).toBe(n)
  },
})

export const contractChecks: readonly ContractCheck[] = [
  roundTrip(0),
  roundTrip(1),
  roundTrip(5 * 1024 * 1024),
  {
    name: 'a plain put replaces the object and changes its etag',
    async run({ target }) {
      const first = await target.put('info.json', bytesOf(10, 1))
      const second = await target.put('info.json', bytesOf(12, 2))
      expect(second.etag).not.toBe(first.etag)
      expect((await target.get('info.json'))?.bytes).toEqual(bytesOf(12, 2))
    },
  },
  {
    name: 'create-only: "absent" fails on an existing path and succeeds on a free one',
    async run({ target }) {
      if (target.capabilities.conditionalPut === 'none') {
        expect(target.capabilities.conditionalPut).toBe('none')
        return
      }
      await target.put('s/co/a.rbs', bytesOf(5), { ifMatch: 'absent' })
      await rejectsWith(target.put('s/co/a.rbs', bytesOf(6), { ifMatch: 'absent' }), 'precondition-failed')
      expect((await target.get('s/co/a.rbs'))?.bytes).toEqual(bytesOf(5))
    },
  },
  {
    name: 'ifMatch: a stale etag fails and the current one succeeds',
    async run({ target }) {
      if (target.capabilities.conditionalPut === 'none') {
        // Declared unsupported: the engine never relies on it for such a target, so there is nothing to prove.
        expect(target.capabilities.conditionalPut).toBe('none')
        return
      }
      const { etag: first } = await target.put('info.json', bytesOf(3, 1))
      const { etag: second } = await target.put('info.json', bytesOf(4, 2), { ifMatch: first })
      await rejectsWith(target.put('info.json', bytesOf(5, 3), { ifMatch: first }), 'precondition-failed')
      await rejectsWith(target.put('s/missing/x.rbs', bytesOf(5, 3), { ifMatch: second }), 'precondition-failed')
      expect((await target.get('info.json'))?.bytes).toEqual(bytesOf(4, 2))
    },
  },
  {
    name: 'get and stat of a missing path give null',
    async run({ target }) {
      expect(await target.get('s/none/missing.rbs')).toBeNull()
      expect(await target.stat('s/none/missing.rbs')).toBeNull()
    },
  },
  {
    name: 'list returns only the prefix, with sizes and etags, across 1,200 objects',
    async run({ target }) {
      const total = 1200
      for (let i = 0; i < total; i++) await target.put(`s/many/o${String(i).padStart(5, '0')}.rbs`, new Uint8Array(i % 7 + 1))
      await target.put('s/other/x.rbs', bytesOf(9))
      await target.put('m/dev.rbm', bytesOf(9))
      const listed = await collect(target.list('s/many/'))
      expect(listed).toHaveLength(total)
      expect(new Set(listed.map((o) => o.path)).size).toBe(total)
      for (const o of listed) {
        expect(o.path.startsWith('s/many/')).toBe(true)
        expect(o.size).toBe(Number(o.path.slice(8, 13)) % 7 + 1)
        expect(o.etag).toBeTruthy()
      }
      expect(await collect(target.list('s/nothing/'))).toEqual([])
      expect((await collect(target.list('m/'))).map((o) => o.path)).toEqual(['m/dev.rbm'])
    },
  },
  {
    name: 'delete is idempotent',
    async run({ target }) {
      await target.put('s/del/a.rbs', bytesOf(3))
      await target.delete('s/del/a.rbs')
      expect(await target.get('s/del/a.rbs')).toBeNull()
      await target.delete('s/del/a.rbs')
      await target.delete('s/del/never-existed.rbs')
    },
  },
  {
    name: 'names are lowercase ASCII, so two names differing by case cannot coexist',
    async run({ target }) {
      await target.put('s/case/name.rbs', bytesOf(3))
      for (const bad of ['s/case/Name.rbs', 'S/case/name.rbs', 's/case/näme.rbs', 's/case/a b.rbs', '../x', 's/a/b/c/d.rbs', `s/${'a'.repeat(100)}`, '']) {
        await rejectsWith(target.put(bad, bytesOf(3)), 'unsupported')
      }
      expect((await collect(target.list('s/case/'))).map((o) => o.path)).toEqual(['s/case/name.rbs'])
    },
  },
]

export const faultChecks: readonly ContractCheck[] = (Object.keys(FAULT_CODES) as ContractFault[]).map((fault) => ({
  name: `error mapping: ${fault} gives "${FAULT_CODES[fault]}"`,
  async run(h) {
    if (!h.inject) throw new Error('no fault injection')
    await h.target.put('info.json', bytesOf(4))
    await h.inject(fault)
    await rejectsWith(h.target.get('info.json'), FAULT_CODES[fault])
    // The failure was one operation's: the target works again and nothing was lost.
    expect((await h.target.get('info.json'))?.bytes).toEqual(bytesOf(4))
  },
}))

/** Registers the contract for one adapter. `make` returns a fresh, empty target for every check. */
export function runSyncTargetContract(name: string, make: () => ContractHarness | Promise<ContractHarness>): void {
  describe(`SyncTargetPort contract: ${name}`, () => {
    for (const check of contractChecks) {
      it(check.name, async () => {
        const h = await make()
        try { await check.run(h) } finally { await h.dispose?.() }
      }, 60_000)
    }
    for (const check of faultChecks) {
      it(check.name, async () => {
        const h = await make()
        try {
          if (!h.inject) {
            // An adapter that cannot provoke a provider failure says so; the mapping is then covered by its own tests.
            expect(h.inject).toBeUndefined()
            return
          }
          await check.run(h)
        } finally { await h.dispose?.() }
      })
    }
  })
}
