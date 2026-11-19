import { describe, expect, it } from 'vitest'
import { createMemoryTarget } from '@retroboard/testkit'
import {
  type RecoveryKeyView, TargetError, type UnlockSecret, type UnlockedVault, type VaultCryptoPort, type VaultEnginePort, type VaultInfo, type VaultSyncReport,
  WAITING_FOR_FILE_MS, createVault, disconnectAndForget, statusOfError, syncVault, unlockVault,
} from '../src'

const REPORT: VaultSyncReport = { pushed: 0, pulled: 0, streams: [], waiting: [], warnings: [], devices: [], info: { vaultId: 'v' }, infoChanged: false }
const KEY: RecoveryKeyView = { text: 'AAAA-BBBB', qr: 'RBR1:AAAA' }

function fakeVault(over: Partial<VaultEnginePort> = {}): UnlockedVault & { calls: string[] } {
  const calls: string[] = []
  const engine: VaultEnginePort = {
    sync: async () => { calls.push('sync'); return REPORT },
    publishInfo: async () => { calls.push('publish') },
    updateInfo: async () => { calls.push('update') },
    deleteStream: async () => { calls.push('deleteStream') },
    deleteVault: async () => { calls.push('deleteVault') },
    ...over,
  }
  return { info: { vaultId: 'v' }, engine, newRecoveryKey: async () => KEY, calls }
}

function fakeCrypto(over: Partial<VaultCryptoPort> = {}) {
  const vault = fakeVault()
  const crypto: VaultCryptoPort = {
    parseInfo: (bytes) => { try { return JSON.parse(new TextDecoder().decode(bytes)) as VaultInfo } catch { return null } },
    acceptablePassword: (p) => p.length >= 12,
    tooNew: (i) => i.minReader === 9,
    create: async () => ({ info: { vaultId: 'v' }, recoveryKey: KEY, vault }),
    unlock: async (_i, s: UnlockSecret) => ('password' in s ? (s.password === 'correct horse' ? { ok: true, vault } : { ok: false, reason: 'wrong-secret' }) : { ok: false, reason: 'malformed-key' }),
    ...over,
  }
  return { crypto, vault }
}

const NOW = 1_700_000_000_000
const clock = { now: () => NOW }

describe('what a failure of the target means', () => {
  it('a throttled target asks to be left alone for as long as it says, and says nothing when it does not', () => {
    expect(statusOfError(new TargetError('throttled', { retryAfterMs: 4000 }))).toStrictEqual({ status: 'offline', retryAfterMs: 4000 })
    expect(statusOfError(new TargetError('throttled'))).toStrictEqual({ status: 'offline' })
  })

  it('a file from the sync client may be missing for a day', () => {
    expect(WAITING_FOR_FILE_MS).toBe(86_400_000)
  })
})

describe('createVault', () => {
  it('looks for a vault by listing info and nothing else', async () => {
    const target = createMemoryTarget()
    const { crypto } = fakeCrypto()
    await createVault({ target, crypto, clock }, 'correct horse')
    expect(target.seenPaths[0]).toBe('info')
  })

  it('refuses a short password before touching the target', async () => {
    const target = createMemoryTarget()
    const { crypto } = fakeCrypto()
    expect(await createVault({ target, crypto, clock }, 'short')).toEqual({ ok: false, error: 'weak-password' })
    expect(target.seenPaths).toEqual([])
  })

  it('publishes info.json once and hands back the recovery key', async () => {
    const target = createMemoryTarget()
    const { crypto, vault } = fakeCrypto()
    const result = await createVault({ target, crypto, clock }, 'correct horse')
    expect(result).toEqual({ ok: true, vault, recoveryKey: KEY })
    expect(vault.calls).toEqual(['publish'])
  })

  it('never overwrites a vault: a target that holds info.json, or a conflict copy of it, refuses', async () => {
    for (const name of ['info.json', 'info.copy-0a1b2c3d.json']) {
      const target = createMemoryTarget()
      await target.put(name, new Uint8Array(3))
      const { crypto, vault } = fakeCrypto()
      expect(await createVault({ target, crypto, clock }, 'correct horse')).toEqual({ ok: false, error: 'vault-exists' })
      expect(vault.calls).toEqual([])
    }
  })

  it('tells a target failure as a status', async () => {
    const target = createMemoryTarget()
    target.failNext('permission-needed')
    const { crypto } = fakeCrypto()
    expect(await createVault({ target, crypto, clock }, 'correct horse')).toEqual({ ok: false, error: 'target', outcome: { status: 'allow-folder' } })
  })
})

describe('unlockVault', () => {
  const put = (target: ReturnType<typeof createMemoryTarget>, text: string) => target.put('info.json', new TextEncoder().encode(text))

  it('opens the vault with the right password', async () => {
    const target = createMemoryTarget()
    await put(target, '{"vaultId":"v","minReader":1}')
    const { crypto, vault } = fakeCrypto()
    expect(await unlockVault({ target, crypto, clock }, { password: 'correct horse' })).toEqual({ ok: true, vault })
  })

  it('says what is wrong: no vault, an unreadable file, a newer format, a wrong password, a malformed key', async () => {
    const target = createMemoryTarget()
    const { crypto } = fakeCrypto()
    const deps = { target, crypto, clock }
    expect(await unlockVault(deps, { password: 'correct horse' })).toEqual({ ok: false, error: 'no-vault' })
    await put(target, '')
    expect(await unlockVault(deps, { password: 'correct horse' })).toEqual({ ok: false, error: 'unreadable' })
    await put(target, '{"vaultId":"v","minReader":9}')
    expect(await unlockVault(deps, { password: 'correct horse' })).toEqual({ ok: false, error: 'newer-reader' })
    await put(target, '{"vaultId":"v","minReader":1}')
    expect(await unlockVault(deps, { password: 'nope nope nope' })).toEqual({ ok: false, error: 'wrong-secret' })
    expect(await unlockVault(deps, { recoveryKey: 'AAAA' })).toEqual({ ok: false, error: 'malformed-key' })
  })

  it('tells a target failure as a status', async () => {
    const target = createMemoryTarget()
    target.failNext('not-found')
    const { crypto } = fakeCrypto()
    expect(await unlockVault({ target, crypto, clock }, { password: 'x' })).toEqual({ ok: false, error: 'target', outcome: { status: 'folder-not-found' } })
  })
})

describe('syncVault', () => {
  it('is synced when nothing waits', async () => {
    const vault = fakeVault()
    expect(await syncVault({ clock }, vault)).toEqual({ status: 'synced', report: REPORT })
  })

  it('passes the request to the engine', async () => {
    let seen: unknown
    const vault = fakeVault({ sync: async (r) => { seen = r; return REPORT } })
    await syncVault({ clock }, vault, { open: ['board:a'] })
    expect(seen).toEqual({ open: ['board:a'] })
  })

  it('says it waits for a file only after 24 hours', async () => {
    const waiting = (age: number): VaultSyncReport => ({ ...REPORT, waiting: [{ path: 's/x/y.rbs', since: NOW - age }] })
    expect((await syncVault({ clock }, fakeVault({ sync: async () => waiting(WAITING_FOR_FILE_MS - 1) }))).status).toBe('synced')
    expect((await syncVault({ clock }, fakeVault({ sync: async () => waiting(WAITING_FOR_FILE_MS) }))).status).toBe('waiting-for-file')
  })

  it('never throws: a failure is a status', async () => {
    const out = await syncVault({ clock }, fakeVault({ sync: async () => { throw new TargetError('unreachable') } }))
    expect(out).toEqual({ status: 'offline' })
  })
})

describe('statusOfError', () => {
  it('maps every target code to something the person can act on', () => {
    const code = (c: ConstructorParameters<typeof TargetError>[0], retry?: number) => statusOfError(new TargetError(c, retry === undefined ? {} : { retryAfterMs: retry }))
    expect(code('permission-needed')).toEqual({ status: 'allow-folder' })
    expect(code('not-found')).toEqual({ status: 'folder-not-found' })
    expect(code('unreachable')).toEqual({ status: 'offline' })
    expect(code('target-full')).toEqual({ status: 'target-full' })
    expect(code('throttled', 5000)).toEqual({ status: 'offline', retryAfterMs: 5000 })
    expect(code('throttled')).toEqual({ status: 'offline' })
    expect(code('auth-expired')).toEqual({ status: 'sign-in-again' })
    expect(code('forbidden')).toEqual({ status: 'needs-attention', reason: 'forbidden' })
    for (const c of ['too-large', 'unsupported', 'precondition-failed'] as const) expect(code(c)).toEqual({ status: 'needs-attention', reason: 'refused' })
  })

  it('maps the vault errors by name and everything else to an unexpected failure', () => {
    const vaultError = (code: string) => Object.assign(new Error(code), { name: 'VaultError', code })
    expect(statusOfError(vaultError('min-reader'))).toEqual({ status: 'needs-attention', reason: 'newer-reader' })
    expect(statusOfError(vaultError('wrong-vault'))).toEqual({ status: 'needs-attention', reason: 'wrong-vault' })
    expect(statusOfError(vaultError('missing'))).toEqual({ status: 'needs-attention', reason: 'vault-missing' })
    expect(statusOfError(vaultError('locked'))).toEqual({ status: 'needs-attention', reason: 'unexpected' })
    expect(statusOfError(new Error('boom'))).toEqual({ status: 'needs-attention', reason: 'unexpected' })
    expect(statusOfError(null)).toEqual({ status: 'needs-attention', reason: 'unexpected' })
  })
})

describe('disconnectAndForget', () => {
  it('forgets the connection and leaves the files', async () => {
    let cleared = 0
    const vault = fakeVault()
    expect(await disconnectAndForget(vault, { deleteFiles: false, clearLocal: async () => { cleared++ } })).toEqual({ ok: true })
    expect(await disconnectAndForget(null, { deleteFiles: false, clearLocal: async () => { cleared++ } })).toEqual({ ok: true })
    expect(cleared).toBe(2)
    expect(vault.calls).toEqual([])
  })

  it('deletes the vault files first when asked, and needs the vault unlocked for it', async () => {
    let cleared = 0
    const vault = fakeVault()
    expect(await disconnectAndForget(vault, { deleteFiles: true, clearLocal: async () => { cleared++ } })).toEqual({ ok: true })
    expect(vault.calls).toEqual(['deleteVault'])
    expect(cleared).toBe(1)
    expect(await disconnectAndForget(null, { deleteFiles: true, clearLocal: async () => { cleared++ } })).toEqual({ ok: false, error: 'locked' })
    expect(cleared).toBe(1)
  })

  it('forgets nothing when the files cannot be deleted, so the person can try again', async () => {
    let cleared = 0
    const vault = fakeVault({ deleteVault: async () => { throw new TargetError('permission-needed') } })
    expect(await disconnectAndForget(vault, { deleteFiles: true, clearLocal: async () => { cleared++ } })).toEqual({ ok: false, error: 'target', outcome: { status: 'allow-folder' } })
    expect(cleared).toBe(0)
  })
})
