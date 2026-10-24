import { LoopbackTransport } from './loopback'
import type { TransportFactory } from './types'
import { buildWsUrl, WebSocketTransport } from './websocket'

export const LOCAL_ROOM_PREFIX = 'local-'
export const isLocalRoom = (roomId: string) => roomId.startsWith(LOCAL_ROOM_PREFIX)

export function defaultTransportFactory(wsBase: string): TransportFactory {
  return (roomId, handlers) =>
    isLocalRoom(roomId)
      ? new LoopbackTransport(handlers)
      : new WebSocketTransport(buildWsUrl(wsBase, roomId, window.location), handlers)
}

export type { BoardTransport, ConnectionStatus, Identity, TransportFactory, TransportHandlers } from './types'
