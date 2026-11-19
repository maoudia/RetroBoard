import { describe, expect, it } from 'vitest'
import {
  type Library, type StampedMap, type SyncTargetPort, type UnlockedVault, createVault, disconnectAndForget, libraryCodec, mergeIncoming, mergeIncomingLibrary, recordEdits, saveEntry, stampedCodec, syncVault,
  unlockVault,
} from '@retroboard/application'
import { type BoardEvent, type EngineMemory, type StreamCodec, type VaultLocal, boardCodec, boardStream, isBoardStream, mergeEvents } from '@retroboard/sync'
import { createFakeGraph } from '@retroboard/testkit'
import { createVaultKit } from '../app/adapters/sync/vault-kit'
import { type Connected, REDIRECT, connect } from './onedrive-helpers'

const PASSWORD = 'correct horse battery staple'
const CANARIES = ['CANARY-title-7f3a', 'CANARY-note-91bc', 'CANARY-name-c04e', 'CANARY-team-5d21', 'CANARY-setting-a8f6']
const [TITLE, NOTE, NAME, , SETTING] = CANARIES as [string, string, string, string, string]

/** One browser: its stores and the vault engine over its own sign-in to the same Microsoft account. */
class Browser implements VaultLocal {
  library: Library = {}
  settings: StampedMap = {}
  events = new Map<string, BoardEvent[]>()
  keep: string[] = []
  readonly memory = { current: null as EngineMemory | null, load: async () => (this.memory.current ? structuredClone(this.memory.current) : null), save: async (m: EngineMemory) => { this.memory.current = structuredClone(m) } }
  vault: UnlockedVault | null = null
  n = 0
  constructor(readonly device: string, readonly link: Connected, readonly clock: { now: number }) {}
  get target(): SyncTargetPort { return this.link.target }

  codec(stream: string) { return (isBoardStream(stream) ? boardCodec : stream === 'library' ? libraryCodec : stampedCodec) as unknown as StreamCodec }
  async eager() { return ['library', 'settings', ...this.keep.map(boardStream)] }
  async read(stream: string): Promise<unknown> { return isBoardStream(stream) ? this.events.get(stream.slice(6)) ?? [] : stream === 'library' ? this.library : this.settings }
  async apply(stream: string, delta: unknown) {
    if (isBoardStream(stream)) this.events.set(stream.slice(6), mergeEvents(this.events.get(stream.slice(6)) ?? [], delta as BoardEvent[]))
    else if (stream === 'library') this.library = mergeIncomingLibrary(this.library, delta as Library, this.clock.now)
    else this.settings = mergeIncoming(this.settings, delta as StampedMap, this.clock.now)
  }
  get kit() {
    return createVaultKit({ target: this.target, local: this, memory: this.memory, device: this.device, deviceName: `Browser ${this.device}`, now: () => this.clock.now, random: () => (this.n++).toString(16).padStart(8, '0') })
  }
  deps() { return { target: this.target, crypto: this.kit, clock: { now: () => this.clock.now } } }
  save(id: string, title: string) { this.library = saveEntry(this.library, { boardId: id, title, role: 'facilitator', origin: 'created', fragment: `#c=${id}`, hasPasscode: false }, this.clock.now, this.device) }
  edit(values: Record<string, unknown>) { this.settings = recordEdits(this.settings, values, this.clock.now, this.device) }
  addEvent(boardId: string, id: string, data: string) { this.events.set(boardId, mergeEvents(this.events.get(boardId) ?? [], [{ id, data }])) }
  sync(request?: Parameters<typeof syncVault>[2]) { return syncVault(this.deps(), this.vault!, request) }
}

/** Two browsers signed in to the same OneDrive: no sync client between them, the provider is the shared store. */
async function pair() {
  const clock = { now: 1_700_000_000_000 }
  const fake = createFakeGraph({ redirectUris: [REDIRECT], now: () => clock.now })
  const a = new Browser('aaaaaaaaaaaaa', await connect({ shared: { fake, clock }, graph: { sleep: async () => undefined } }), clock)
  const b = new Browser('bbbbbbbbbbbbb', await connect({ shared: { fake, clock }, graph: { sleep: async () => undefined } }), clock)
  a.keep = ['board-1']
  const created = await createVault(a.deps(), PASSWORD)
  if (!created.ok) throw new Error(`create failed: ${created.error}`)
  a.vault = created.vault
  a.save('board-1', TITLE)
  a.addEvent('board-1', 'e1', `sealed-${NOTE}`.split('').reverse().join(''))
  a.edit({ locale: 'fr', defaultTheme: SETTING, name: NAME })
  expect((await a.sync()).status).toBe('synced')
  return { a, b, fake, clock, recoveryKey: created.recoveryKey }
}

describe('two browsers signed in to the same OneDrive', () => {
  it('a new device unlocks with the password, sees the library, and reads a board when it opens it', async () => {
    const { b } = await pair()
    const unlocked = await unlockVault(b.deps(), { password: PASSWORD })
    if (!unlocked.ok) throw new Error(unlocked.error)
    b.vault = unlocked.vault
    expect((await b.sync()).status).toBe('synced')
    expect(Object.keys(b.library)).toEqual(['board-1'])
    expect(b.settings.locale?.value).toBe('fr')
    expect(b.events.get('board-1')).toBeUndefined()
    await b.sync({ open: [boardStream('board-1')] })
    expect(b.events.get('board-1')?.map((e) => e.id)).toEqual(['e1'])
  })

  it('unlocks with the recovery key, and refuses a wrong password', async () => {
    const { b, recoveryKey } = await pair()
    expect(await unlockVault(b.deps(), { password: 'not the password at all' })).toEqual({ ok: false, error: 'wrong-secret' })
    expect((await unlockVault(b.deps(), { recoveryKey: recoveryKey.text })).ok).toBe(true)
  })

  it('edits from both sides merge through the provider, and a lost race on info.json is merged, not lost', async () => {
    const { a, b, clock } = await pair()
    const unlocked = await unlockVault(b.deps(), { password: PASSWORD })
    if (!unlocked.ok) throw new Error(unlocked.error)
    b.vault = unlocked.vault
    await b.sync()
    clock.now += 1000
    a.save('board-2', 'Retro A'); a.edit({ locale: 'en' })
    b.save('board-3', 'Retro B'); b.edit({ defaultTheme: 'night', sound: false })
    await Promise.all([a.sync(), b.sync()])
    for (let round = 0; round < 3; round++) { clock.now += 60_000; await a.sync(); await b.sync() }
    expect(Object.keys(a.library).sort()).toEqual(['board-1', 'board-2', 'board-3'])
    expect(a.library).toEqual(b.library)
    expect(a.settings).toEqual(b.settings)
    expect(a.settings.locale?.value).toBe('en')
    expect(b.settings.sound?.value).toBe(false)
  })

  it('never sends a title, a note, a name or a setting to Microsoft, in a path, a URL or a body, whatever the route', async () => {
    const { a, b, fake } = await pair()
    const unlocked = await unlockVault(b.deps(), { password: PASSWORD })
    if (!unlocked.ok) throw new Error(unlocked.error)
    b.vault = unlocked.vault
    await b.sync({ open: [boardStream('board-1')] })
    b.save('board-2', `${TITLE}-again`)
    await b.sync()
    await a.sync()
    expect(fake.requests.length).toBeGreaterThan(20)
    expect(() => fake.assertNoPlaintext(CANARIES)).not.toThrow()
    // What the provider stores is only what the engine names: a hash for every stream, a device id for every manifest.
    for (const path of fake.objects().keys()) expect(path).toMatch(/^(info\.json|m\/[a-z0-9]+\.rbm|s\/[a-z2-7]{26}\/[a-z0-9]+-[0-9a-f]{8}-[0-9a-f]{8}\.rbs)$/)
    // The guard sees what it should: a title in a body, or in a URL, is caught.
    await a.target.put('s/aaaaaaaaaaaaaaaaaaaaaaaaaa/leak.rbs', new TextEncoder().encode(`{"title":"${TITLE}"}`))
    expect(() => fake.assertNoPlaintext(CANARIES)).toThrow(/plaintext reached the target/)
  })

  it('a sign-in that ended is "sign in again" for the engine, a throttled provider is "offline" with its wait, and neither throws', async () => {
    const { a, fake, clock } = await pair()
    fake.expireAccessTokens()
    fake.revokeRefreshTokens()
    expect((await a.sync()).status).toBe('sign-in-again')
    const other = await pair()
    other.fake.throttle(1, 600)
    clock.now += 0
    expect(await other.a.sync()).toMatchObject({ status: 'offline', retryAfterMs: 600_000 })
    expect((await other.a.sync()).status).toBe('synced')
  })

  it('disconnect and forget with the files: the vault files go, nothing else in the app folder', async () => {
    const { a, fake } = await pair()
    fake.seed('my-notes.txt', new Uint8Array(3))
    const done = await disconnectAndForget(a.vault, { deleteFiles: true, clearLocal: async () => undefined })
    expect(done).toEqual({ ok: true })
    expect([...fake.objects().keys()]).toEqual(['my-notes.txt'])
  })
})
