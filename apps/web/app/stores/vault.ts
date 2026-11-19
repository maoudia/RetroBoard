import type { AttentionReason, RecoveryKeyView, VaultDevice, VaultStatus } from '@retroboard/application'
import type { Connection } from '~/adapters/sync/sync-state'
import { onedriveConfig } from '~/adapters/sync/onedrive-config'
import type { OnedriveConfig } from '~/adapters/sync/onedrive-protocol'
import type { SetupError, SetupStep, VaultRuntime } from '~/adapters/sync/vault-runtime'
import { folderPickerSupported } from '~/adapters/sync/folder-handle'
import { SYNC_FLAG } from '~/utils/sync-status'
import { safeStorage } from '~/utils/storage'

/**
 * Sync with a folder or with OneDrive (change user-drive-storage, groups 2 and 3), as the interface sees it: the connection, the status, the setup
 * step and the actions. The engine, the crypto, the folder adapter and the scheduler are loaded by the first action (or at
 * start, for a browser that has connected before), so a browser that never syncs never downloads them.
 */
export const useVaultStore = defineStore('vault', () => {
  const nuxt = useNuxtApp()
  const router = useRouter()
  const folderSupported = import.meta.client && folderPickerSupported()
  /** What the deployment offers for OneDrive, read from `/providers.json` when the Sync section opens (or at start, for a browser that has connected). */
  const onedrive = ref<OnedriveConfig | null>(null)
  const pendingKind = ref<'folder' | 'onedrive' | null>(null)
  const supported = computed(() => folderSupported || onedrive.value !== null)
  const connection = ref<Connection | null>(null)
  const status = ref<VaultStatus>(folderSupported ? 'off' : 'unsupported')
  const reason = ref<AttentionReason | null>(null)
  const lastSyncAt = ref<number | null>(null)
  const devices = ref<readonly VaultDevice[]>([])
  const step = ref<SetupStep>('idle')
  const recoveryKey = ref<RecoveryKeyView | null>(null)
  const recoveryMode = ref<'first' | 'again'>('first')
  const error = ref<SetupError>(null)
  const busy = ref(false)
  const pendingFolder = ref('')
  const unlocked = ref(false)
  const connected = computed(() => connection.value !== null)
  const folderName = computed(() => connection.value?.folderName ?? pendingFolder.value)
  /** The provider of the connection, or of the setup in progress; null before a choice. */
  const provider = computed(() => connection.value?.kind ?? pendingKind.value)

  let runtime: Promise<VaultRuntime> | null = null
  const load = (): Promise<VaultRuntime> => (runtime ??= import('~/adapters/sync/vault-runtime').then((m) => m.createVaultRuntime({
    state: { connection, status, reason, lastSyncAt, devices, step, recoveryKey, recoveryMode, error, busy, pendingFolder, unlocked, onedrive, pendingKind },
    supported: () => supported.value,
    library: useLibraryStore(),
    settings: useSettingsStore(),
    identity: useIdentityStore(),
    team: useTeamStore(),
    boardOpen: () => router.currentRoute.value.path.startsWith('/board'),
    replica: () => nuxt.$ports.replica,
  })))

  let providers: Promise<void> | null = null
  /** Reads what this deployment offers (once). A failure leaves OneDrive out: the folder keeps working. */
  function loadProviders(): Promise<void> {
    if (!import.meta.client) return Promise.resolve()
    return (providers ??= fetch('/providers.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null), () => null)
      .then((json: unknown) => {
        onedrive.value = onedriveConfig(json, String(useRuntimeConfig().public.onedriveClientId ?? ''), window.location.origin)
        if (!connection.value && status.value === 'unsupported' && supported.value) status.value = 'off'
      }))
  }

  async function init() {
    if (!import.meta.client || !safeStorage.get(SYNC_FLAG, false)) return
    // A connection to OneDrive needs its configuration before it can look at its sign-in.
    await loadProviders()
    await (await load()).init()
  }

  return {
    supported, folderSupported, onedrive, provider, loadProviders, connection, connected, status, reason, lastSyncAt, devices, step, recoveryKey, recoveryMode, error, busy, folderName, unlocked,
    init,
    chooseFolder: async () => (await load()).chooseFolder(),
    requestAccess: async () => (await load()).requestAccess(),
    create: async (password: string) => (await load()).create(password),
    unlock: async (secret: Parameters<VaultRuntime['unlock']>[0]) => (await load()).unlock(secret),
    acknowledge: async () => (await load()).acknowledge(),
    reissueRecoveryKey: async (password: string) => (await load()).reissueRecoveryKey(password),
    syncNow: async () => { if (runtime) await (await runtime).syncNow() },
    /** Only a browser that is connected has a runtime: nothing is loaded for one that is not. */
    fetchBoard: async (boardId: string) => { if (runtime) await (await runtime).fetchBoard(boardId) },
    forgetBoardStream: async (boardId: string) => { if (runtime) await (await runtime).forgetBoardStream(boardId) },
    disconnect: async (opts: Parameters<VaultRuntime['disconnect']>[0]) => (await load()).disconnect(opts),
    forgetConnection: async () => { if (runtime || safeStorage.get(SYNC_FLAG, false)) await (await load()).forgetConnection() },
    cancelSetup: () => { if (runtime) void runtime.then((r) => r.cancelSetup()) },
    connectOnedrive: async (returnTo: string) => (await load()).connectOnedrive(returnTo),
    signInAgain: async (returnTo: string) => (await load()).signInAgain(returnTo),
    completeSignIn: async (search: string) => { await loadProviders(); return (await load()).completeSignIn(search) },
  }
})
