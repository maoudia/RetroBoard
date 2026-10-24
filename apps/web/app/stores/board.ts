import type { ErrorCode, Snapshot } from '@retroboard/domain'
import type { BoardTransport, ConnectionStatus, Identity, TransportFactory } from '~/transport'
import { buildColumnItems, createBoardCommands, type SortMode } from '@retroboard/application'

/**
 * View model of a board: holds the latest snapshot and exposes the board use cases.
 * Rules live in the domain; components never build protocol commands themselves.
 */
export const useBoardStore = defineStore('board', () => {
  const snapshot = shallowRef<Snapshot | null>(null)
  const status = ref<ConnectionStatus>('closed')
  const lastError = ref<{ code: ErrorCode; at: number } | null>(null)
  const roomId = ref<string | null>(null)
  /** Encrypted board that does not open with the keys we have (wrong passcode). */
  const accessDenied = ref(false)
  /** serverNow - clientNow, to show a timer that agrees with the server. */
  const skew = ref(0)
  let transport: BoardTransport | null = null
  const listeners = new Set<(prev: Snapshot | null, next: Snapshot) => void>()

  function connect(room: string, identity: Identity, factory: TransportFactory) {
    disconnect()
    accessDenied.value = false
    roomId.value = room
    transport = factory(room, {
      onSnapshot(next) {
        skew.value = next.now - Date.now()
        const prev = snapshot.value
        snapshot.value = next
        for (const l of listeners) l(prev, next)
      },
      onError: (code) => { lastError.value = { code, at: Date.now() } },
      onStatus: (s) => { status.value = s },
      onAccessDenied: () => { accessDenied.value = true },
    })
    transport.connect(identity)
  }

  function disconnect() {
    transport?.close()
    transport = null
    snapshot.value = null
    roomId.value = null
    status.value = 'closed'
  }

  function updateIdentity(identity: Identity) { transport?.updateIdentity(identity) }
  /** Encrypted boards: my access. Legacy boards have no roles: everybody may steer. */
  const access = computed(() => snapshot.value?.access ?? { role: 'facilitator' as const, canSteer: true, canManageRoles: false })
  const sendRole = (change: 'role.delegate' | 'role.revoke' | 'role.handover' | 'participant.hide' | 'participant.unhide', key: string) => transport?.sendRole?.(change, key) ?? false
  /** Encrypted boards only: export and restore of the board file (.retro). */
  const canUseBoardFile = () => typeof transport?.exportBoardFile === 'function'
  const exportBoardFile = () => transport?.exportBoardFile?.() ?? Promise.resolve(null)
  const importBoardFile = (text: string) => transport?.importBoardFile?.(text) ?? Promise.resolve(null)
  const commands = createBoardCommands({ channel: () => transport, view: () => snapshot.value })
  /** Subscribe to snapshot transitions (animations need the previous one). */
  function onSnapshot(fn: (prev: Snapshot | null, next: Snapshot) => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  const settings = computed(() => snapshot.value?.settings ?? null)
  const columns = computed(() => snapshot.value?.columns ?? [])
  const peers = computed(() => snapshot.value?.peers ?? [])
  const actions = computed(() => snapshot.value?.actions ?? [])
  const timer = computed(() => snapshot.value?.timer ?? null)
  const votesLeft = computed(() => snapshot.value?.votesLeft ?? 0)
  const ready = computed(() => snapshot.value !== null)
  const locked = computed(() => snapshot.value?.settings.locked ?? false)
  const secretVoting = computed(() => snapshot.value?.settings.secretVoting ?? false)
  const votingClosed = computed(() => snapshot.value?.settings.votingClosed ?? false)
  /** Counts are hidden while secret voting is on and voting is still open. */
  const countsHidden = computed(() => secretVoting.value && !votingClosed.value)
  const noteCount = computed(() => snapshot.value?.notes.length ?? 0)
  const openActions = computed(() => actions.value.filter((a) => !a.done).length)

  function itemsFor(columnId: string, sort: SortMode) {
    return snapshot.value ? buildColumnItems(snapshot.value, columnId, sort) : []
  }
  const noteById = (id: string) => snapshot.value?.notes.find((n) => n.id === id)

  return {
    snapshot, status, lastError, roomId, skew, accessDenied,
    connect, disconnect, updateIdentity, onSnapshot, commands, canUseBoardFile, exportBoardFile, importBoardFile, access, sendRole,
    settings, columns, peers, actions, timer, votesLeft, ready, locked, secretVoting, votingClosed, countsHidden, noteCount, openActions,
    itemsFor, noteById,
  }
})
