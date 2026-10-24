import { LoopbackTransport } from './loopback'
import type { TransportFactory } from './types'

export const LOCAL_ROOM_PREFIX = 'local-'
export const isLocalRoom = (roomId: string) => roomId.startsWith(LOCAL_ROOM_PREFIX)

/** Solo boards stay in this tab. Shared boards always use the encrypted relay (protocol v2). */
export const localTransportFactory: TransportFactory = (_roomId, handlers) => new LoopbackTransport(handlers)

export type { BoardTransport, ConnectionStatus, Identity, TransportFactory, TransportHandlers } from './types'
