import type { Command, CursorFrame, ErrorCode, FocusFrame, Snapshot } from '@retroboard/domain'

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface Identity {
  cid: string
  name: string
  showName: boolean
}

/** A destructive or steering action by someone else, to tell everyone about ("Alice reset the votes"). */
export interface BoardNotice {
  kind: 'reset.board' | 'reset.column' | 'reset.votes' | 'reset.clock' | 'phase.prev' | 'phase.next'
  /** Name the author chose to show, or null. */
  by: string | null
  /** Column title, for reset.column. */
  column?: string
  /** Phase kind entered, for phase.next. */
  phase?: string
}

export interface ChannelHandlers {
  onSnapshot(snapshot: Snapshot): void
  onError(error: ErrorCode): void
  onStatus(status: ConnectionStatus): void
  /** Encrypted rooms: the board exists but nothing decrypts with these keys (wrong passcode). */
  onAccessDenied?(): void
  /** A live (not replayed) reset or phase step made by another participant. */
  onNotice?(notice: BoardNotice): void
  /** Live presence (never stored): a peer's cursor or focus, with the label they chose to show. */
  onCursor?(cursor: CursorFrame, name: string | null): void
  onFocus?(focus: FocusFrame, name: string | null): void
  /** The room is at its participant cap: the channel keeps retrying slowly until a seat frees up. */
  onRoomFull?(full: boolean): void
  /** Peer-to-peer state: direct links (p2p) or relay fallback, and how many peers are linked. */
  onLinks?(state: { p2p: boolean; peers: number }): void
  /** A peer left: drop its cursor and focus. */
  onPeerLeft?(conn: string): void
}

/** What a participant shares live; the channel adds its connection id. */
export type OwnCursor = Omit<CursorFrame, 'conn'>
export type OwnFocus = Omit<FocusFrame, 'conn'>

/** Port to the room: the relay over WebSocket, or a local loopback in solo mode. */
export interface BoardChannel {
  connect(identity: Identity): void
  /** Returns false when the command could not be sent (offline). */
  send(command: Command): boolean
  updateIdentity(identity: Identity): void
  close(): void
  /** Encrypted boards: role changes, signed by the facilitator. Returns false when not possible. */
  sendRole?(change: 'role.delegate' | 'role.revoke' | 'role.handover' | 'role.claim' | 'participant.hide' | 'participant.unhide', key: string): boolean
  /** Encrypted boards: the board file (.retro) content, or null when there is nothing to export. */
  exportBoardFile?(): Promise<string | null>
  /** Encrypted boards: restores events from a board file. Returns how many were new, or null if the file does not belong to this board. */
  importBoardFile?(text: string): Promise<number | null>
  /** Live presence, best effort: dropped when offline. */
  sendCursor?(cursor: OwnCursor): void
  sendFocus?(focus: OwnFocus): void
}

export type ChannelFactory = (roomId: string, handlers: ChannelHandlers) => BoardChannel
