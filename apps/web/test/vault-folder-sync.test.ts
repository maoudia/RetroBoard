import { describe, expect, it } from 'vitest'
import {
  type Library, type StampedMap, type UnlockedVault, createVault, libraryCodec, mergeIncoming, mergeIncomingLibrary, recordEdits, saveEntry, stampedCodec, syncVault, unlockVault,
} from '@retroboard/application'
import { type BoardEvent, type EngineMemory, type StreamCodec, type VaultLocal, boardCodec, boardStream, isBoardStream, mergeEvents } from '@retroboard/sync'
import { type FakeDirectory, createFakeDirectory, findPlaintext } from '@retroboard/testkit'
import { createFolderTarget } from '../app/adapters/sync/folder-target'
import { createVaultKit } from '../app/adapters/sync/vault-kit'

const PASSWORD = 'correct horse battery staple'
const CANARIES = ['CANARY-title-7f3a', 'CANARY-note-91bc', 'CANARY-name-c04e', 'CANARY-team-5d21', 'CANARY-setting-a8f6']
const [TITLE, NOTE, NAME, , SETTING] = CANARIES as [string, string, string, string, string]
const clock = { now: 1_700_000_000_000 }

/** One browser: its stores, its folder (as its own sync client sees it) and the vault engine over them. */
class Browser implements VaultLocal {
  library: Library = {}
  settings: StampedMap = {}
  events = new Map<string, BoardEvent[]>()
  keep: string[] = []
  readonly memory = { current: null as EngineMemory | null, load: async () => (this.memory.current ? structuredClone(this.memory.current) : null), save: async (m: EngineMemory) => { this.memory.current = structuredClone(m) } }
  readonly dir: FakeDirectory = createFakeDirectory()
  readonly target = createFolderTarget(this.dir)
  vault: UnlockedVault | null = null
  n = 0
  constructor(readonly device: string) {}

  codec(stream: string) { return (isBoardStream(stream) ? boardCodec : stream === 'library' ? libraryCodec : stampedCodec) as unknown as StreamCodec }
  async eager() { return ['library', 'settings', ...this.keep.map(boardStream)] }
  async read(stream: string): Promise<unknown> { return isBoardStream(stream) ? this.events.get(stream.slice(6)) ?? [] : stream === 'library' ? this.library : this.settings }
  async apply(stream: string, delta: unknown) {
    if (isBoardStream(stream)) this.events.set(stream.slice(6), mergeEvents(this.events.get(stream.slice(6)) ?? [], delta as BoardEvent[]))
    else if (stream === 'library') this.library = mergeIncomingLibrary(this.library, delta as Library, clock.now)
    else this.settings = mergeIncoming(this.settings, delta as StampedMap, clock.now)
  }

  get kit() {
    return createVaultKit({ target: this.target, local: this, memory: this.memory, device: this.device, deviceName: `Browser ${this.device}`, now: () => clock.now, random: () => (this.n++).toString(16).padStart(8, '0') })
  }
  deps() { return { target: this.target, crypto: this.kit, clock: { now: () => clock.now } } }
  save(id: string, title: string) { this.library = saveEntry(this.library, { boardId: id, title, role: 'facilitator', origin: 'created', fragment: `#c=${id}`, hasPasscode: false }, clock.now, this.device) }
  edit(values: Record<string, unknown>) { this.settings = recordEdits(this.settings, values, clock.now, this.device) }
  addEvent(boardId: string, id: string, data: string) { this.events.set(boardId, mergeEvents(this.events.get(boardId) ?? [], [{ id, data }])) }
  sync(request?: Parameters<typeof syncVault>[2]) { return syncVault(this.deps(), this.vault!, request) }
}

/** The user's sync client: copies the newer version of every file from one folder to the other, with the noise real ones make. */
function carry(from: Browser, to: Browser, noise: { conflictCopy?: boolean; halfFile?: boolean; zeroByte?: boolean } = {}) {
  for (const path of from.dir.files()) {
    const a = from.dir.read(path)!
    const at = from.dir.modified(path)!
    const known = to.dir.modified(path)
    if (known !== null && known >= at) continue
    // A half or empty copy is older than the whole one, so the next pass of the client completes it.
    if (path === 'info.json' && known !== null && noise.conflictCopy) to.dir.drop('info (conflicted copy 2026-11-14).json', a, at)
    else if (noise.halfFile && path.endsWith('.rbs')) to.dir.drop(path, a.slice(0, Math.floor(a.length / 2)), at - 1)
    else if (noise.zeroByte && path.endsWith('.rbs')) to.dir.drop(path, new Uint8Array(0), at - 1)
    else to.dir.drop(path, a, at)
  }
}

const both = (a: Browser, b: Browser) => { carry(a, b); carry(b, a) }

async function pair() {
  const a = new Browser('aaaaaaaaaaaaa')
  const b = new Browser('bbbbbbbbbbbbb')
  a.keep = ['board-1']
  const created = await createVault(a.deps(), PASSWORD)
  if (!created.ok) throw new Error(`create failed: ${created.error}`)
  a.vault = created.vault
  a.save('board-1', TITLE)
  a.addEvent('board-1', 'e1', `sealed-${NOTE}`.split('').reverse().join(''))
  a.edit({ locale: 'fr', defaultTheme: SETTING, name: NAME })
  expect((await a.sync()).status).toBe('synced')
  carry(a, b)
  const unlocked = await unlockVault(b.deps(), { password: PASSWORD })
  if (!unlocked.ok) throw new Error(`unlock failed: ${unlocked.error}`)
  b.vault = unlocked.vault
  return { a, b, recoveryKey: created.recoveryKey }
}

describe('two browsers sharing a folder through a sync client', () => {
  it('a new device unlocks with the password, sees the library, and reads a board when it opens it', async () => {
    const { a, b } = await pair()
    expect((await b.sync()).status).toBe('synced')
    expect(Object.keys(b.library)).toEqual(['board-1'])
    expect(b.settings.locale?.value).toBe('fr')
    expect(b.events.get('board-1')).toBeUndefined()
    await b.sync({ open: [boardStream('board-1')] })
    expect(b.events.get('board-1')?.map((e) => e.id)).toEqual(['e1'])
    expect(a.dir.files().filter((f) => f.startsWith('m/'))).toEqual(['m/aaaaaaaaaaaaa.rbm'])
  })

  it('unlocks with the recovery key, and refuses a wrong password and a mistyped key', async () => {
    const { a, recoveryKey } = await pair()
    const c = new Browser('ccccccccccccc')
    carry(a, c)
    expect(await unlockVault(c.deps(), { password: 'not the password at all' })).toEqual({ ok: false, error: 'wrong-secret' })
    expect(await unlockVault(c.deps(), { recoveryKey: 'AAAA-BBBB' })).toEqual({ ok: false, error: 'malformed-key' })
    const typo = recoveryKey.text.slice(0, -1) + (recoveryKey.text.endsWith('A') ? 'B' : 'A')
    expect(await unlockVault(c.deps(), { recoveryKey: typo })).toEqual({ ok: false, error: 'malformed-key' })
    const ok = await unlockVault(c.deps(), { recoveryKey: recoveryKey.text.toLowerCase() })
    expect(ok.ok).toBe(true)
  })

  it('two offline edits merge, through conflict copies, a zero-byte file and a half file', async () => {
    const { a, b } = await pair()
    await b.sync()
    carry(b, a)
    clock.now += 1000
    a.save('board-2', 'Retro A')
    a.edit({ locale: 'en' })
    b.save('board-3', 'Retro B')
    b.edit({ defaultTheme: 'night', sound: false })
    await a.sync()
    await b.sync()
    // The sync client lags: the first copies are empty or half, and info.json arrives twice.
    carry(a, b, { zeroByte: true })
    carry(b, a, { halfFile: true, conflictCopy: true })
    expect(['synced', 'waiting-for-file']).toContain((await a.sync()).status)
    await b.sync()
    clock.now += 60_000
    for (let round = 0; round < 3; round++) { both(a, b); clock.now += 60_000; await a.sync(); await b.sync() }
    both(a, b)
    await a.sync(); await b.sync()
    expect(Object.keys(a.library).sort()).toEqual(['board-1', 'board-2', 'board-3'])
    expect(a.library).toEqual(b.library)
    expect(a.settings).toEqual(b.settings)
    expect(a.settings.locale?.value).toBe('en')
    expect(b.settings.sound?.value).toBe(false)
    // The copies of info.json were merged into it and removed; nothing else was deleted.
    expect(a.dir.files().filter((f) => f.includes('conflicted'))).toEqual([])
  })

  it('never puts a title, a note, a name or a setting in the folder, in a file name or a file', async () => {
    const { a, b } = await pair()
    await b.sync({ open: [boardStream('board-1')] })
    b.save('board-2', `${TITLE}-again`)
    await b.sync()
    carry(b, a)
    await a.sync()
    for (const browser of [a, b]) {
      const paths = browser.dir.files()
      expect(paths.length).toBeGreaterThan(5)
      const bodies = paths.map((p) => browser.dir.read(p)!)
      expect(findPlaintext(CANARIES, paths, bodies)).toBeNull()
      expect(findPlaintext([TITLE], [], [new TextEncoder().encode(`{"title":"${TITLE}"}`)])).not.toBeNull()
      for (const p of paths) expect(p).toMatch(/^(info\.json|m\/[a-z0-9]+\.rbm|s\/[a-z2-7]{26}\/[a-z0-9]+-[0-9a-f]{8}-[0-9a-f]{8}\.rbs)$/)
    }
  })

  it('a folder that vanished is "folder not found"; a revoked permission is "allow folder access"; neither throws', async () => {
    const { a } = await pair()
    a.dir.permission = 'denied'
    expect((await a.sync()).status).toBe('allow-folder')
    a.dir.permission = 'granted'
    expect((await a.sync()).status).toBe('synced')
    a.dir.remove()
    expect((await a.sync()).status).toBe('folder-not-found')
  })

  it('refuses to create a vault over one that is there, and says so for a folder that is not a vault', async () => {
    const { a } = await pair()
    expect(await createVault(a.deps(), PASSWORD)).toEqual({ ok: false, error: 'vault-exists' })
    const empty = new Browser('ddddddddddddd')
    expect(await unlockVault(empty.deps(), { password: PASSWORD })).toEqual({ ok: false, error: 'no-vault' })
    empty.dir.drop('info.json', new Uint8Array(0))
    expect(await unlockVault(empty.deps(), { password: PASSWORD })).toEqual({ ok: false, error: 'unreadable' })
  })

  it('a new recovery key replaces the old one: the old stops working once the other device has the new info', async () => {
    const { a, b, recoveryKey } = await pair()
    const fresh = await a.vault!.newRecoveryKey(clock.now + 5)
    expect(fresh.text).not.toBe(recoveryKey.text)
    clock.now += 10
    await a.sync()
    carry(a, b)
    const c = new Browser('ccccccccccccc')
    carry(b, c)
    expect((await unlockVault(c.deps(), { recoveryKey: fresh.text })).ok).toBe(true)
    expect(await unlockVault(c.deps(), { recoveryKey: recoveryKey.text })).toEqual({ ok: false, error: 'wrong-secret' })
  })

  it('disconnect and forget with the files: the vault files go, the folder handle stays out of it, other files stay', async () => {
    const { a } = await pair()
    a.dir.drop('my-notes.txt', new Uint8Array(3))
    await a.vault!.engine.deleteVault()
    expect(a.dir.files()).toEqual(['my-notes.txt'])
  })
})
