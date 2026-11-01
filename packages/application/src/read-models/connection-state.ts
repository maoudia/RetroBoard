import type { ConnectionStatus } from '../ports/channel'

/** How a participant is reached from this tab (change presence-status). */
export type ConnectionState = 'direct' | 'relay' | 'reconnecting'

export interface ConnectionInput {
  /** This participant is me. */
  me: boolean
  /** Relay connection id of the participant. */
  conn?: string
  /** Connection ids with an open direct (WebRTC) link from this tab. */
  direct: readonly string[]
  /** Status of my link to the relay. */
  status: ConnectionStatus
  /** My peer-to-peer state as the transport reports it: false when the mesh is off or no direct link is possible yet. */
  p2p: boolean
}

/**
 * Pure read model behind the connection dot. Others: direct when a WebRTC link is open, relay otherwise.
 * Me: reconnecting while my relay link is down; direct while the transport reports peer to peer, relay otherwise.
 * While I am reconnecting, everybody I see is stale, so the whole list reads reconnecting.
 */
export function connectionState(i: ConnectionInput): ConnectionState {
  if (i.status === 'reconnecting' || i.status === 'connecting') return 'reconnecting'
  if (i.me) return i.p2p ? 'direct' : 'relay'
  return i.conn !== undefined && i.direct.includes(i.conn) ? 'direct' : 'relay'
}
