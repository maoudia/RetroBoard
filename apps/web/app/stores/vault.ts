import type { AttentionReason, RecoveryKeyView, VaultDevice, VaultStatus } from '@retroboard/application'
import type { Connection } from '~/adapters/sync/sync-state'
import type { SetupError, SetupStep, VaultRuntime } from '~/adapters/sync/vault-runtime'
import { folderPickerSupported } from '~/adapters/sync/folder-handle'
import { SYNC_FLAG } from '~/utils/sync-status'
import { safeStorage } from '~/utils/storage'

/**
 * Sync with a folder (change user-drive-storage, group 2), as the interface sees it: the connection, the status, the setup
 * step and the actions. The engine, the crypto, the folder adapter and the scheduler are loaded by the first action (or at
 * start, for a browser that has connected before), so a browser that never syncs never downloads them.
 */
export const useVaultStore = defineStore('vault', () => {
  const nuxt = useNuxtApp()
  const router = useRouter()
  const supported = import.meta.client && folderPickerSupported()
  const connection = ref<Connection | null>(null)
  const status = ref<VaultStatus>(supported ? 'off' : 'unsupported')
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

  let runtime: Promise<VaultRuntime> | null = null
  const load = (): Promise<VaultRuntime> => (runtime ??= import('~/adapters/sync/vault-runtime').then((m) => m.createVaultRuntime({
    state: { connection, status, reason, lastSyncAt, devices, step, recoveryKey, recoveryMode, error, busy, pendingFolder, unlocked },
    supported,
    library: useLibraryStore(),
    settings: useSettingsStore(),
    identity: useIdentityStore(),
    team: useTeamStore(),
    boardOpen: () => router.currentRoute.value.path.startsWith('/board'),
    replica: () => nuxt.$ports.replica,
  })))

  async function init() {
    if (!import.meta.client || !safeStorage.get(SYNC_FLAG, false)) return
    await (await load()).init()
  }

  return {
    supported, connection, connected, status, reason, lastSyncAt, devices, step, recoveryKey, recoveryMode, error, busy, folderName, unlocked,
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
  }
})
