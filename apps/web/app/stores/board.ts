import type { Command } from '@retroboard/protocol'
import type { ErrorCode, Snapshot } from '@retroboard/domain'
import type { BoardTransport, ConnectionStatus, Identity, TransportFactory } from '~/transport'
import { buildColumnItems, type SortMode } from '~/utils/layout'

/**
 * Client side view of a board. All rules live in the shared domain on the server:
 * the store sends commands and renders the snapshots it receives.
 */
export const useBoardStore = defineStore('board', () => {
  const snapshot = shallowRef<Snapshot | null>(null)
  const status = ref<ConnectionStatus>('closed')
  const lastError = ref<{ code: ErrorCode; at: number } | null>(null)
  const roomId = ref<string | null>(null)
  /** serverNow - clientNow, to show a timer that agrees with the server. */
  const skew = ref(0)
  let transport: BoardTransport | null = null
  const listeners = new Set<(prev: Snapshot | null, next: Snapshot) => void>()

  function connect(room: string, identity: Identity, factory: TransportFactory) {
    disconnect()
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
  function send(cmd: Command): boolean { return transport?.send(cmd) ?? false }
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
  const noteCount = computed(() => snapshot.value?.notes.length ?? 0)
  const openActions = computed(() => actions.value.filter((a) => !a.done).length)

  function itemsFor(columnId: string, sort: SortMode) {
    return snapshot.value ? buildColumnItems(snapshot.value, columnId, sort) : []
  }
  const noteById = (id: string) => snapshot.value?.notes.find((n) => n.id === id)

  return {
    snapshot, status, lastError, roomId, skew,
    connect, disconnect, updateIdentity, send, onSnapshot,
    settings, columns, peers, actions, timer, votesLeft, ready, locked, secretVoting, noteCount, openActions,
    itemsFor, noteById,
  }
})
