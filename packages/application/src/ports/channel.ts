import type { Command, ErrorCode, Snapshot } from '@retroboard/domain'

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface Identity {
  cid: string
  name: string
  showName: boolean
}

export interface ChannelHandlers {
  onSnapshot(snapshot: Snapshot): void
  onError(error: ErrorCode): void
  onStatus(status: ConnectionStatus): void
  /** Encrypted rooms: the board exists but nothing decrypts with these keys (wrong passcode). */
  onAccessDenied?(): void
}

/** Port to the room: the relay over WebSocket, or a local loopback in solo mode. */
export interface BoardChannel {
  connect(identity: Identity): void
  /** Returns false when the command could not be sent (offline). */
  send(command: Command): boolean
  updateIdentity(identity: Identity): void
  close(): void
}

export type ChannelFactory = (roomId: string, handlers: ChannelHandlers) => BoardChannel
