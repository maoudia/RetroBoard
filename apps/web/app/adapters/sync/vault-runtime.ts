import { watch } from 'vue'
import type { Ref } from 'vue'
import {
  type AttentionReason, type DirectoryHandleLike, type Library, type RecoveryKeyView, type StampedMap, type SyncOutcome, type SyncTargetPort, type UnlockSecret, type UnlockedVault, type VaultDevice, type VaultStatus,
  type ReplicaStorePort, type WorkspaceDoc, createVault, disconnectAndForget, libraryCodec, stampedCodec, syncVault, unlockVault, workspaceCodec,
} from '@retroboard/application'
import { type BoardEvent, type EngineMemory, type StreamCodec, type VaultLocal, boardCodec, boardStream, isBoardStream, mergeEvents } from '@retroboard/sync'
import { type FolderAccess, folderAccess, openVaultFolder, pickFolder, requestFolderAccess } from '~/adapters/sync/folder-handle'
import { createFolderTarget } from '~/adapters/sync/folder-target'
import { createKdfWorker, installKdfWorker } from '~/adapters/sync/kdf-client'
import { createLocalSealer } from '~/adapters/device-key'
import { ONEDRIVE_FOLDER } from '~/adapters/sync/onedrive-config'
import type { OnedriveConfig } from '~/adapters/sync/onedrive-protocol'
import { type OnedriveSession, type SignInOutcome, createOnedriveSession } from '~/adapters/sync/onedrive-session'
import { type Connection, type SyncStateStore, createSyncStateStore } from '~/adapters/sync/sync-state'
import { createVaultKit } from '~/adapters/sync/vault-kit'
import { type SyncReason, createVaultScheduler, type VaultScheduler } from '~/utils/vault-scheduler'
import { keptOffline, useSyncedSettings } from '~/composables/syncedSettings'
import { deviceId } from '~/utils/device-id'
import { SYNC_FLAG } from '~/utils/sync-status'
import { safeStorage } from '~/utils/storage'

export type SetupStep = 'idle' | 'create' | 'unlock' | 'recovery' | 'ready'
/** The i18n key of what went wrong in the last action, or null. */
export type SetupError = 'sync.error.signin' | 'sync.error.wrong' | 'sync.error.key' | 'sync.error.wrongKey' | 'sync.error.exists' | 'sync.error.otherVault' | 'sync.error.none' | 'sync.error.unreadable' | 'sync.error.newer' | 'sync.error.target' | null

const deviceName = (): string => {
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? ''
  return platform.slice(0, 40) || 'Browser'
}

/** What the thin store (`stores/vault.ts`) keeps for the interface; this module moves it. */
export interface VaultState {
  connection: Ref<Connection | null>
  status: Ref<VaultStatus>
  reason: Ref<AttentionReason | null>
  lastSyncAt: Ref<number | null>
  devices: Ref<readonly VaultDevice[]>
  step: Ref<SetupStep>
  recoveryKey: Ref<RecoveryKeyView | null>
  /** 'first' after creating a vault (the first sync waits for the acknowledgements), 'again' for a replacement key. */
  recoveryMode: Ref<'first' | 'again'>
  error: Ref<SetupError>
  busy: Ref<boolean>
  pendingFolder: Ref<string>
  unlocked: Ref<boolean>
  /** What this deployment offers for OneDrive, once `/providers.json` has been read; null when nothing is configured. */
  onedrive: Ref<OnedriveConfig | null>
  /** The provider a setup in progress is for (a connection carries its own). */
  pendingKind: Ref<'folder' | 'onedrive' | null>
}

export interface VaultRuntimeContext {
  readonly state: VaultState
  /** Can this browser sync at all? Asked each time: OneDrive's availability is read after the store is made. */
  readonly supported: () => boolean
  readonly library: ReturnType<typeof useLibraryStore>
  readonly settings: ReturnType<typeof useSettingsStore>
  readonly identity: ReturnType<typeof useIdentityStore>
  readonly team: ReturnType<typeof useTeamStore>
  readonly boardOpen: () => boolean
  readonly replica: () => ReplicaStorePort | null
}

/**
 * Sync with a folder (change user-drive-storage, group 2): the connection, the vault session and the scheduler. The master
 * key lives in memory only; after a reload the vault is locked until the password or the recovery key is typed again. Local
 * editing never waits on any of it: a failure here is a status the person reads, not an exception.
 */
export function createVaultRuntime(ctx: VaultRuntimeContext) {
  const { library, settings, identity, team } = ctx
  const { connection, status, reason, lastSyncAt, devices, step, recoveryKey, recoveryMode, error, busy, pendingFolder, unlocked, onedrive, pendingKind } = ctx.state

  let state: SyncStateStore | null = null
  let handle: DirectoryHandleLike | null = null
  let pending: DirectoryHandleLike | null = null
  let vault: UnlockedVault | null = null
  let scheduler: VaultScheduler | null = null
  let removeListeners: (() => void) | null = null
  let stopWatch: (() => void) | null = null
  let stopKdf: (() => void) | null = null
  let session: OnedriveSession | null = null
  let synced: ReturnType<typeof useSyncedSettings> | null = null
  const openQueue: string[] = []
  const device = import.meta.client ? deviceId() : ''

  // ---- the local side of the engine ----

  const replica = ctx.replica
  const local: VaultLocal = {
    codec: (stream) => (isBoardStream(stream) ? boardCodec : stream === 'library' ? libraryCodec : stream === 'workspace' ? workspaceCodec : stampedCodec) as unknown as StreamCodec,
    async eager() { return ['library', 'settings', 'identity', 'workspace', ...keptOffline(await library.read()).map(boardStream)] },
    async read(stream) {
      synced ??= useSyncedSettings(ensureState()!)
      if (isBoardStream(stream)) return (await replica()?.load(stream.slice(6))) ?? []
      if (stream === 'library') return library.read()
      if (stream === 'settings') return synced.readSettings()
      if (stream === 'identity') return synced.readIdentity()
      return synced.readWorkspace()
    },
    async apply(stream, delta) {
      synced ??= useSyncedSettings(ensureState()!)
      if (isBoardStream(stream)) {
        const id = stream.slice(6)
        const records = delta as BoardEvent[]
        await replica()?.append(id, mergeEvents([], records))
      } else if (stream === 'library') await library.mergeRemote(delta as Library)
      else if (stream === 'settings') await synced.applySettings(delta as StampedMap)
      else if (stream === 'identity') await synced.applyIdentity(delta as StampedMap)
      else await synced.applyWorkspace(delta as WorkspaceDoc)
    },
  }

  const memory = () => ({
    load: async () => (await ensureState()?.get<EngineMemory>('engine')) ?? null,
    save: async (m: EngineMemory) => { await ensureState()?.set('engine', m) },
  })

  /** The provider of the connection, or of the setup in progress. */
  const providerNow = (): 'folder' | 'onedrive' | null => connection.value?.kind ?? pendingKind.value

  /** The OneDrive connection of this browser, made once its configuration is known. */
  function ensureSession(): OnedriveSession | null {
    if (session) return session
    const config = onedrive.value
    const store = ensureState()
    if (!config || !store) return null
    return (session = createOnedriveSession({ config, state: store, sealer: createLocalSealer(), storage: sessionStorage, navigate: (url) => window.location.assign(url) }))
  }

  async function targetFor(root: DirectoryHandleLike | null, create: boolean): Promise<SyncTargetPort | null> {
    if (providerNow() === 'onedrive') return ensureSession()?.target ?? null
    return root ? createFolderTarget(await openVaultFolder(root, create)) : null
  }

  async function kitFor(root: DirectoryHandleLike | null, create: boolean) {
    const target = await targetFor(root, create)
    if (!target) throw new Error('no target')
    return { target, crypto: createVaultKit({ target, local, memory: memory(), device, deviceName: deviceName(), now: Date.now }), clock: { now: Date.now } }
  }

  // ---- connection ----

  /** The small database of this connection, opened only once someone connects (or has connected before). */
  function ensureState(): SyncStateStore | null {
    if (!state) { try { state = createSyncStateStore() } catch { state = null } }
    return state
  }

  async function init() {
    if (!import.meta.client || connection.value || !safeStorage.get(SYNC_FLAG, false)) return
    const store = ensureState()
    try {
      connection.value = (await store?.get<Connection>('connection')) ?? null
      handle = (await store?.get<DirectoryHandleLike>('handle')) ?? null
    } catch { return }
    if (connection.value?.kind === 'onedrive') { await initOnedrive(); return }
    if (!connection.value || !handle) { status.value = ctx.supported() ? 'off' : 'unsupported'; return }
    await refreshAccess()
  }

  /** A browser that connected OneDrive before: its sign-in is back in the worker, or it must be done again (24 hours at most). */
  async function initOnedrive() {
    const current = ensureSession()
    if (!current) { status.value = 'off'; return }
    step.value = 'unlock'
    const back = await current.restore().catch(() => 'sign-in-again' as const)
    status.value = back === 'ready' ? 'locked' : 'sign-in-again'
  }

  async function remember() {
    safeStorage.set(SYNC_FLAG, true)
    if (connection.value?.kind !== 'onedrive') await ensureState()?.set('handle', handle)
    await ensureState()?.set('connection', { ...connection.value })
  }

  async function refreshAccess(): Promise<FolderAccess> {
    const access = handle ? await folderAccess(handle) : 'missing'
    if (access === 'granted') { if (!unlocked.value) { status.value = 'locked'; step.value = 'unlock' } }
    else status.value = access === 'prompt' ? 'allow-folder' : 'folder-not-found'
    return access
  }

  async function chooseFolder() {
    error.value = null
    const picked = await pickFolder()
    if (!picked) return
    busy.value = true
    try {
      let hasVault = false
      let vaultDir: DirectoryHandleLike | null = null
      try { vaultDir = await openVaultFolder(picked, false) } catch { /* no RetroBoard folder yet */ }
      const probe = vaultDir ? createFolderTarget(vaultDir) : null
      const info = probe ? await probe.get('info.json') : null
      hasVault = info !== null
      if (connection.value) {
        // The same vault, wherever the folder is now: the vault id decides.
        const parsed = info ? createVaultKit({ target: probe!, local, memory: memory(), device, deviceName: deviceName() }).parseInfo(info.bytes) : null
        if (!parsed || parsed.vaultId !== connection.value.vaultId) { error.value = 'sync.error.otherVault'; return }
        handle = picked
        connection.value = { ...connection.value, folderName: picked.name }
        await remember()
        scheduler?.resume()
        status.value = unlocked.value ? 'syncing' : 'locked'
        if (unlocked.value) void scheduler?.trigger('manual'); else step.value = 'unlock'
        return
      }
      pending = picked
      pendingFolder.value = picked.name
      pendingKind.value = 'folder'
      step.value = hasVault ? 'unlock' : 'create'
    } catch { error.value = 'sync.error.target' } finally { busy.value = false }
  }

  async function requestAccess() {
    if (!handle) return
    const access = await requestFolderAccess(handle)
    if (access === 'granted') {
      scheduler?.resume()
      if (unlocked.value) void scheduler?.trigger('manual'); else { status.value = 'locked'; step.value = 'unlock' }
    } else status.value = access === 'prompt' ? 'allow-folder' : 'folder-not-found'
  }

  async function create(password: string) {
    const kind = providerNow()
    if (!kind || (kind === 'folder' && !pending)) return
    error.value = null
    busy.value = true
    try {
      installWorker()
      const deps = await kitFor(pending, true)
      const result = await createVault(deps, password)
      if (!result.ok) { error.value = result.error === 'vault-exists' ? 'sync.error.exists' : 'sync.error.target'; return }
      vault = result.vault
      unlocked.value = true
      recoveryKey.value = result.recoveryKey
      recoveryMode.value = 'first'
      if (kind === 'folder') handle = pending
      connection.value = { kind, vaultId: vault.info.vaultId, folderName: kind === 'onedrive' ? ONEDRIVE_FOLDER : pending!.name, acknowledged: false, connectedAt: Date.now() }
      await remember()
      step.value = 'recovery'
    } catch { error.value = 'sync.error.target' } finally { busy.value = false }
  }

  const unlockError = (e: string): SetupError => (e === 'wrong-secret' ? 'sync.error.wrong' : e === 'malformed-key' ? 'sync.error.key' : e === 'no-vault' ? 'sync.error.none' : e === 'unreadable' ? 'sync.error.unreadable' : e === 'newer-reader' ? 'sync.error.newer' : 'sync.error.target')

  /** Opens the vault with the password or the recovery key. Used by the unlock form and by the actions that ask for the password again. */
  async function open(secret: UnlockSecret): Promise<UnlockedVault | null> {
    const root = pending ?? handle
    if (!root && providerNow() !== 'onedrive') return null
    installWorker()
    const result = await unlockVault(await kitFor(root, false), secret)
    if (!result.ok) {
      error.value = result.error === 'wrong-secret' && 'recoveryKey' in secret ? 'sync.error.wrongKey' : unlockError(result.error)
      return null
    }
    return result.vault
  }

  async function unlock(secret: UnlockSecret) {
    error.value = null
    busy.value = true
    try {
      const opened = await open(secret)
      if (!opened) return
      if (connection.value && opened.info.vaultId !== connection.value.vaultId) { error.value = 'sync.error.otherVault'; return }
      vault = opened
      unlocked.value = true
      if (!connection.value) {
        const kind = providerNow() ?? 'folder'
        if (kind === 'folder') handle = pending
        connection.value = { kind, vaultId: opened.info.vaultId, folderName: kind === 'onedrive' ? ONEDRIVE_FOLDER : (pending?.name ?? ''), acknowledged: true, connectedAt: Date.now() }
        await remember()
        activate()
      } else if (!connection.value.acknowledged) {
        // The vault was made here but the person never confirmed the recovery key: show a new one, the old was never seen.
        recoveryKey.value = await opened.newRecoveryKey(Date.now())
        recoveryMode.value = 'first'
        step.value = 'recovery'
      } else activate()
    } catch { error.value = 'sync.error.target' } finally { busy.value = false }
  }

  /** Both acknowledgement boxes are ticked: the first sync may run. */
  async function acknowledge() {
    recoveryKey.value = null
    if (recoveryMode.value === 'again') { step.value = 'ready'; void scheduler?.trigger('manual'); return }
    if (connection.value) { connection.value = { ...connection.value, acknowledged: true }; await remember() }
    activate()
  }

  /** The person typed their password again and wants another recovery key (the old one stops working). */
  async function reissueRecoveryKey(password: string) {
    error.value = null
    busy.value = true
    try {
      const opened = await open({ password })
      if (!opened) return
      recoveryKey.value = await opened.newRecoveryKey(Date.now())
      recoveryMode.value = 'again'
      step.value = 'recovery'
      void scheduler?.trigger('manual')
    } catch { error.value = 'sync.error.target' } finally { busy.value = false }
  }

  // ---- sync ----

  function installWorker() {
    if (stopKdf || typeof Worker === 'undefined') return
    try { stopKdf = installKdfWorker(createKdfWorker) } catch { /* no worker: the derivation runs in the page */ }
  }

  async function run(): Promise<SyncOutcome> {
    if (!vault) return { status: 'locked' }
    const request = openQueue.length > 0 ? { open: openQueue.splice(0) } : undefined
    const out = await syncVault({ clock: { now: Date.now } }, vault, request)
    if (out.report) {
      devices.value = out.report.devices
      // A document merged from another device (a new recovery wrap) is the vault's now.
    }
    return out
  }

  function activate() {
    step.value = 'ready'
    if (scheduler) return
    const lockName = `retroboard-vault-${connection.value?.vaultId ?? 'x'}`
    scheduler = createVaultScheduler({
      run,
      locks: typeof navigator !== 'undefined' ? (navigator.locks as unknown as Parameters<typeof createVaultScheduler>[0]['locks']) : undefined,
      lockName,
      now: Date.now,
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (h) => window.clearTimeout(h as number),
      visible: () => document.visibilityState === 'visible',
      boardOpen: ctx.boardOpen,
      onState: (s) => {
        status.value = s.status
        reason.value = s.outcome?.reason ?? null
        if (s.at !== undefined && (s.status === 'synced' || s.status === 'waiting-for-file')) lastSyncAt.value = s.at
        if (s.status === 'allow-folder' || s.status === 'folder-not-found') void refreshAccess()
      },
    })
    const trigger = (r: SyncReason) => () => { void scheduler?.trigger(r) }
    const onVisibility = () => { void scheduler?.trigger(document.visibilityState === 'visible' ? 'visible' : 'hidden') }
    const onFocus = trigger('focus')
    const onOnline = trigger('online')
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    removeListeners = () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', onFocus); window.removeEventListener('online', onOnline) }
    // Local edits, debounced by the scheduler: preferences, identity, workspace and the library.
    stopWatch = watch([() => settings.s, () => identity.name, () => identity.showName, () => identity.named, () => team.ws, () => library.records], () => { void scheduler?.trigger('edit') }, { deep: true })
    scheduler.start()
  }

  const syncNow = () => scheduler?.trigger('manual') ?? Promise.resolve()

  /** `openLibraryBoard` restoring a board's events from the target into the replica before the live path continues. */
  async function fetchBoard(boardId: string): Promise<void> {
    if (!vault || !scheduler) return
    openQueue.push(boardStream(boardId))
    await scheduler.trigger('manual')
  }

  /** "Forget" with the board's copies deleted: its stream goes from the target too. */
  async function forgetBoardStream(boardId: string): Promise<void> {
    try { await vault?.engine.deleteStream(boardStream(boardId)) } catch { /* the next pass tells the status */ }
  }

  async function clearLocal() {
    stopWatch?.(); removeListeners?.(); scheduler?.stop(); stopKdf?.()
    stopWatch = removeListeners = scheduler = stopKdf = null
    vault = null; handle = null; pending = null; synced = null
    safeStorage.remove(SYNC_FLAG)
    // The tokens and the worker that holds the access token go first: nothing here can act on the account any more.
    try { await session?.forget() } catch { /* the worker is already gone */ }
    session = null
    try { await state?.clear() } catch { /* the browser refused: nothing more to forget */ }
    connection.value = null
    unlocked.value = false
    status.value = ctx.supported() ? 'off' : 'unsupported'
    reason.value = null; lastSyncAt.value = null; devices.value = []; step.value = 'idle'; recoveryKey.value = null; pendingFolder.value = ''; pendingKind.value = null
  }

  /** Stops sync and forgets the connection; with `deleteFiles`, the vault files go first (the password is asked again). */
  async function disconnect(opts: { deleteFiles: boolean; password?: string }): Promise<boolean> {
    error.value = null
    busy.value = true
    try {
      let opened = vault
      if (opts.deleteFiles && opts.password !== undefined) opened = await open({ password: opts.password })
      if (opts.deleteFiles && !opened) return false
      const result = await disconnectAndForget(opened, { deleteFiles: opts.deleteFiles, clearLocal })
      if (!result.ok) { error.value = 'sync.error.target'; return false }
      return true
    } finally { busy.value = false }
  }

  /** "Erase my local data": the connection goes with the rest, the folder and its files are left alone. */
  const forgetConnection = () => clearLocal()

  /** Back to the start of the setup, for the person who closed the dialog half way. */
  function cancelSetup() {
    if (connection.value) return
    if (pendingKind.value === 'onedrive') { void session?.forget().catch(() => undefined); session = null }
    pending = null; pendingFolder.value = ''; pendingKind.value = null; error.value = null; step.value = 'idle'
  }

  // ---- OneDrive ----

  /** "Sign in with Microsoft": the window goes to Microsoft and comes back to `/storage/callback`. */
  async function connectOnedrive(returnTo: string) {
    error.value = null
    const current = ensureSession()
    if (!current) { error.value = 'sync.error.target'; return }
    busy.value = true
    try { await current.start(returnTo, 'connect', 'select_account') } catch { error.value = 'sync.error.signin'; busy.value = false }
  }

  /** The daily renewal: a silent attempt first, and the person's own sign-in when Microsoft has no session to reuse. */
  async function signInAgain(returnTo: string) {
    error.value = null
    const current = ensureSession()
    if (!current) return
    busy.value = true
    try { await current.start(returnTo, 'renew', 'none') } catch { error.value = 'sync.error.signin'; busy.value = false }
  }

  /** The page of `/storage/callback` hands over what Microsoft brought back; the setup or the renewal goes on from here. */
  async function completeSignIn(search: string): Promise<SignInOutcome> {
    await init()
    const current = ensureSession()
    if (!current) return { kind: 'failed', returnTo: '/boards' }
    const outcome = await current.complete(search)
    if (outcome.kind === 'failed') error.value = 'sync.error.signin'
    if (outcome.kind !== 'signed-in') return outcome
    busy.value = true
    try {
      if (outcome.intent === 'renew' && connection.value?.kind === 'onedrive') {
        // A page reload ended the unlocked session: the vault asks for its password again, then sync goes on.
        step.value = unlocked.value ? 'ready' : 'unlock'
        status.value = unlocked.value ? 'syncing' : 'locked'
        scheduler?.resume()
        if (unlocked.value) void scheduler?.trigger('manual')
      } else {
        pendingKind.value = 'onedrive'
        pendingFolder.value = ONEDRIVE_FOLDER
        step.value = (await current.target.get('info.json')) ? 'unlock' : 'create'
      }
    } catch { error.value = 'sync.error.target'; step.value = 'idle'; pendingKind.value = null } finally { busy.value = false }
    return outcome
  }

  return {
    init, chooseFolder, requestAccess, create, unlock, acknowledge, reissueRecoveryKey, syncNow, fetchBoard, forgetBoardStream, disconnect, forgetConnection, cancelSetup,
    connectOnedrive, signInAgain, completeSignIn,
  }
}

export type VaultRuntime = ReturnType<typeof createVaultRuntime>
