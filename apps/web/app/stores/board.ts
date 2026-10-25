import { type ActionItem, allowedInPhase, DEFAULT_NOTE_MAX_LENGTH, type CommandType, type ErrorCode, PRIVILEGED_COMMANDS, roomWords, type Snapshot } from '@retroboard/domain'
import type { BoardTransport, ConnectionStatus, Identity, TransportFactory } from '~/transport'
import { type BoardNotice, buildColumnItems, createBoardCommands, phaseAvailability, type OwnCursor, type OwnFocus, type SortMode } from '@retroboard/application'

/**
 * View model of a board: holds the latest snapshot and exposes the board use cases.
 * Rules live in the domain; components never build protocol commands themselves.
 */
export const useBoardStore = defineStore('board', () => {
  const snapshot = shallowRef<Snapshot | null>(null)
  const status = ref<ConnectionStatus>('closed')
  const lastError = ref<{ code: ErrorCode; at: number } | null>(null)
  const roomId = ref<string | null>(null)
  /** Last reset or phase step by another participant (the page turns it into a toast for everyone). */
  const lastNotice = ref<(BoardNotice & { at: number }) | null>(null)
  /** Encrypted board that does not open with the keys we have (wrong passcode). */
  const accessDenied = ref(false)
  /** Writes to the local copy keep failing (storage full or blocked): the board is not saved on this device. */
  const replicaFailing = ref(false)
  /** The board is at its participant cap; the channel retries until a seat frees up. */
  const roomFull = ref(false)
  /** Peer-to-peer state of this tab: direct links, or the relay fallback. */
  const links = ref<{ p2p: boolean; peers: number } | null>(null)
  /** serverNow - clientNow, to show a timer that agrees with the server. */
  const skew = ref(0)
  let transport: BoardTransport | null = null
  const live = useLiveStore()
  const listeners = new Set<(prev: Snapshot | null, next: Snapshot) => void>()

  function connect(room: string, identity: Identity, factory: TransportFactory) {
    disconnect()
    accessDenied.value = false
    replicaFailing.value = false
    roomFull.value = false
    links.value = null
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
      onNotice: (n) => { lastNotice.value = { ...n, at: Date.now() } },
      onCursor: (c, name) => live.setCursor(c, name),
      onFocus: (f, name) => live.setFocus(f, name),
      onPeerLeft: (conn) => live.drop(conn),
      onRoomFull: (full) => { roomFull.value = full },
      onLinks: (s) => { links.value = s },
      onReplica: (state) => { replicaFailing.value = state === 'failing' },
    })
    transport.connect(identity)
  }

  function disconnect() {
    live.reset()
    transport?.close()
    transport = null
    snapshot.value = null
    roomId.value = null
    status.value = 'closed'
  }

  function updateIdentity(identity: Identity) { transport?.updateIdentity(identity) }
  /** Writes the pending local copy now (the page is going away). */
  const flush = () => transport?.flush?.() ?? Promise.resolve()
  /** Nobody holds this board and the facilitator chose to start a new one in this room. */
  const startBoard = () => transport?.startBoard?.()
  /** Encrypted boards: my access. Legacy boards have no roles: everybody may steer. */
  const access = computed(() => snapshot.value?.access ?? { role: 'facilitator' as const, canSteer: true, bypassesPhase: true, canManageRoles: false, isLead: true })
  /** Phase rules: may I do this now? Facilitators always may. */
  // Open boards: steering commands are open to all, content commands still follow the phase.
  /** Phase cue for a command: open, closed (why, and when it opens) or open for me as facilitator. */
  const availability = (command: CommandType) => phaseAvailability(snapshot.value?.agenda ?? null, command, access.value.bypassesPhase)
  const allowed = (command: CommandType) => access.value.bypassesPhase || (access.value.canSteer && PRIVILEGED_COMMANDS.has(command)) || allowedInPhase(snapshot.value?.agenda ?? null, command)
  const sendRole = (change: 'role.delegate' | 'role.revoke' | 'role.handover' | 'role.claim' | 'participant.hide' | 'participant.unhide', key: string) => transport?.sendRole?.(change, key) ?? false
  /** Encrypted boards only: export and restore of the board file (.retro). */
  /** Three words everyone sees for this board (shared boards only), in the board's language. */
  const roomCode = computed(() => (roomId.value && !roomId.value.startsWith('local-') && snapshot.value ? roomWords(roomId.value, snapshot.value.settings.locale ?? 'fr').join(' · ') : null))
  /** My actor id on this board (session key on encrypted boards): who I am in talk turns. */
  const myKey = computed(() => snapshot.value?.peers.find((p) => p.me)?.key ?? null)
  const sendCursor = (c: OwnCursor) => transport?.sendCursor?.(c)
  const sendFocus = (f: OwnFocus) => transport?.sendFocus?.(f)
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
  /** Longest note text on this board (facilitator setting). */
  const noteLimit = computed(() => snapshot.value?.settings.noteMaxLength ?? DEFAULT_NOTE_MAX_LENGTH)
  const locked = computed(() => snapshot.value?.settings.locked ?? false)
  const secretVoting = computed(() => snapshot.value?.settings.secretVoting ?? false)
  const votingClosed = computed(() => snapshot.value?.settings.votingClosed ?? false)
  /** Counts are hidden while secret voting is on and voting is still open. */
  const countsHidden = computed(() => secretVoting.value && !votingClosed.value)
  const noteCount = computed(() => snapshot.value?.notes.length ?? 0)
  /** Actions created from a note or a group, by source id. */
  const actionsBySource = computed(() => {
    const map = new Map<string, ActionItem[]>()
    for (const a of actions.value) if (a.sourceNote) map.set(a.sourceNote, [...(map.get(a.sourceNote) ?? []), a])
    return map
  })
  const openActions = computed(() => actions.value.filter((a) => !a.done).length)

  function itemsFor(columnId: string, sort: SortMode) {
    return snapshot.value ? buildColumnItems(snapshot.value, columnId, sort) : []
  }
  const noteById = (id: string) => snapshot.value?.notes.find((n) => n.id === id)

  return {
    snapshot, status, lastError, lastNotice, roomId, skew, accessDenied, replicaFailing, roomFull, roomCode, links, myKey,
    connect, disconnect, updateIdentity, flush, startBoard, onSnapshot, commands, sendCursor, sendFocus, canUseBoardFile, exportBoardFile, importBoardFile, access, sendRole, allowed, availability,
    settings, noteLimit, columns, peers, actions, timer, votesLeft, ready, locked, secretVoting, votingClosed, countsHidden, noteCount, openActions, actionsBySource,
    itemsFor, noteById,
  }
})
