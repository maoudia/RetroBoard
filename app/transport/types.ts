import type { Command } from '@retroboard/protocol'
import type { ErrorCode, Snapshot } from '@retroboard/domain'

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface Identity {
  cid: string
  name: string
  showName: boolean
}

export interface TransportHandlers {
  onSnapshot(snapshot: Snapshot): void
  onError(error: ErrorCode): void
  onStatus(status: ConnectionStatus): void
}

/** Port between the board store and the outside world. Swap the adapter, keep the store. */
export interface BoardTransport {
  connect(identity: Identity): void
  /** Returns false when the command could not be sent (offline). */
  send(command: Command): boolean
  updateIdentity(identity: Identity): void
  close(): void
}

export type TransportFactory = (roomId: string, handlers: TransportHandlers) => BoardTransport
