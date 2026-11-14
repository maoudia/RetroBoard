import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it, vi } from 'vitest'
import { type Bytes, deriveWrapKey, utf8 } from '@retroboard/crypto'
import { createFakeDirectory } from '@retroboard/testkit'
import { VAULT_FOLDER, folderAccess, folderPickerSupported, openVaultFolder, pickFolder, requestFolderAccess } from '../app/adapters/sync/folder-handle'
import { type WorkerLike, installKdfWorker } from '../app/adapters/sync/kdf-client'
import { createSyncStateStore } from '../app/adapters/sync/sync-state'

describe('folder support is a feature test', () => {
  it('sees the picker or not, whatever the browser calls itself', () => {
    expect(folderPickerSupported({ showDirectoryPicker: () => undefined })).toBe(true)
    expect(folderPickerSupported({ navigator: { userAgent: 'Chrome/130 Windows' } })).toBe(false)
    expect(folderPickerSupported({})).toBe(false)
  })

  it('opens the picker with the vault id and write access, and says nothing when the person closes it', async () => {
    const dir = createFakeDirectory('Docs')
    const calls: unknown[] = []
    const scope = { showDirectoryPicker: async (o: unknown) => { calls.push(o); return dir } }
    expect(await pickFolder(scope)).toBe(dir)
    expect(calls).toEqual([{ mode: 'readwrite', id: 'retroboard-sync' }])
    expect(await pickFolder({ showDirectoryPicker: async () => { throw new DOMException('closed', 'AbortError') } })).toBeNull()
    await expect(pickFolder({ showDirectoryPicker: async () => { throw new DOMException('no', 'SecurityError') } })).rejects.toThrow('no')
    expect(await pickFolder({})).toBeNull()
  })
})

describe('folder permission states', () => {
  it('granted needs nothing', async () => {
    expect(await folderAccess(createFakeDirectory())).toBe('granted')
  })

  it('prompt is a click away and the app never asks by itself', async () => {
    const dir = createFakeDirectory()
    dir.permission = 'prompt'
    const request = vi.spyOn(dir, 'requestPermission')
    expect(await folderAccess(dir)).toBe('prompt')
    expect(request).not.toHaveBeenCalled()
    expect(await requestFolderAccess(dir)).toBe('granted')
    expect(await folderAccess(dir)).toBe('granted')
  })

  it('a refused request stays prompt or denied', async () => {
    const dir = createFakeDirectory()
    dir.permission = 'prompt'
    dir.grantOnRequest = 'denied'
    expect(await requestFolderAccess(dir)).toBe('denied')
    expect(await folderAccess(dir)).toBe('denied')
  })

  it('a folder that moved or was deleted is missing, with or without the permission call', async () => {
    const dir = createFakeDirectory()
    dir.remove()
    expect(await folderAccess(dir)).toBe('missing')
    expect(await requestFolderAccess(dir)).toBe('missing')
    const bare = { ...createFakeDirectory(), queryPermission: undefined, requestPermission: undefined, entries: () => ({ [Symbol.asyncIterator]: () => ({ next: async () => { throw new DOMException('gone', 'NotFoundError') } }) }) }
    expect(await folderAccess(bare)).toBe('missing')
    expect(await requestFolderAccess(bare)).toBe('missing')
  })

  it('a handle without the permission methods is taken as granted, any other failure as denied', async () => {
    const bare = { ...createFakeDirectory(), queryPermission: undefined, requestPermission: undefined }
    expect(await folderAccess(bare)).toBe('granted')
    expect(await requestFolderAccess(bare)).toBe('granted')
    const odd = { ...createFakeDirectory(), queryPermission: async () => { throw new TypeError('x') }, requestPermission: async () => { throw new TypeError('x') } }
    expect(await folderAccess(odd)).toBe('denied')
    expect(await requestFolderAccess(odd)).toBe('denied')
  })

  it('the vault lives in a RetroBoard subfolder, made on request', async () => {
    const dir = createFakeDirectory()
    await expect(openVaultFolder(dir, false)).rejects.toMatchObject({ name: 'NotFoundError' })
    const sub = await openVaultFolder(dir, true)
    expect(sub.name).toBe(VAULT_FOLDER)
    expect((await openVaultFolder(dir, false)).name).toBe('RetroBoard')
  })
})

describe('sync state in IndexedDB', () => {
  it('keeps values by key, replaces them, deletes them and clears all', async () => {
    const store = createSyncStateStore(new IDBFactory())
    expect(await store.get('a')).toBeUndefined()
    await store.set('a', { n: 1 })
    await store.set('b', 'two')
    expect(await store.get('a')).toEqual({ n: 1 })
    await store.set('a', { n: 2 })
    expect(await store.get('a')).toEqual({ n: 2 })
    await store.delete('a')
    expect(await store.get('a')).toBeUndefined()
    await store.clear()
    expect(await store.get('b')).toBeUndefined()
  })
})

describe('key derivation worker client', () => {
  function fake() {
    const w = { posted: [] as { id: number }[], terminated: 0, onmessage: null as ((e: { data: unknown }) => void) | null, onerror: null as (() => void) | null,
      postMessage(m: { id: number }) { w.posted.push(m) }, terminate() { w.terminated++ } }
    return w
  }
  const params = { id: 'argon2id', m: 19 * 1024, t: 2, p: 1 } as const

  it('sends Argon2id to the worker and takes the key it answers with, then ends the worker when idle', async () => {
    vi.useFakeTimers()
    const w = fake()
    const uninstall = installKdfWorker(() => w as unknown as WorkerLike, 1000)
    try {
      const pending = deriveWrapKey(utf8('pw'), new Uint8Array(16), params)
      await Promise.resolve()
      expect(w.posted).toHaveLength(1)
      w.onmessage!({ data: { id: w.posted[0]!.id, key: new Uint8Array(32).fill(5) as Bytes } })
      expect(await pending).toEqual(new Uint8Array(32).fill(5))
      await vi.advanceTimersByTimeAsync(999)
      expect(w.terminated).toBe(0)
      await vi.advanceTimersByTimeAsync(1)
      expect(w.terminated).toBe(1)
    } finally { uninstall(); vi.useRealTimers() }
  })

  it('a worker that fails or answers with an error rejects, and the next call starts a new one', async () => {
    const workers: ReturnType<typeof fake>[] = []
    const uninstall = installKdfWorker(() => { const w = fake(); workers.push(w); return w as unknown as WorkerLike })
    try {
      const a = deriveWrapKey(utf8('pw'), new Uint8Array(16), params)
      await Promise.resolve()
      workers[0]!.onmessage!({ data: { id: workers[0]!.posted[0]!.id, error: 'derivation-failed' } })
      await expect(a).rejects.toThrow('derivation-failed')
      const b = deriveWrapKey(utf8('pw'), new Uint8Array(16), params)
      await Promise.resolve()
      workers[0]!.onerror!()
      await expect(b).rejects.toThrow('derivation-failed')
      expect(workers[0]!.terminated).toBe(1)
      const c = deriveWrapKey(utf8('pw'), new Uint8Array(16), params)
      await Promise.resolve()
      expect(workers).toHaveLength(2)
      workers[1]!.onmessage!({ data: { id: workers[1]!.posted[0]!.id, key: new Uint8Array(32) as Bytes } })
      await c
    } finally { uninstall() }
  })

  it('answers with an unknown id are ignored, and uninstalling puts the derivation back in the page', async () => {
    const w = fake()
    const uninstall = installKdfWorker(() => w as unknown as WorkerLike)
    const a = deriveWrapKey(utf8('pw'), new Uint8Array(16), params)
    await Promise.resolve()
    w.onmessage!({ data: { id: 999, key: new Uint8Array(32) as Bytes } })
    w.onmessage!({ data: { id: w.posted[0]!.id, key: new Uint8Array(32).fill(1) as Bytes } })
    await a
    uninstall()
    expect(w.terminated).toBe(1)
    expect((await deriveWrapKey(utf8('pw'), new Uint8Array(16), { id: 'pbkdf2-sha256', iterations: 600_000 })).length).toBe(32)
  })
})
