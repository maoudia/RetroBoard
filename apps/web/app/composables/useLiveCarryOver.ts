/**
 * Fetch actions from a live board via a share link.
 * Creates a temporary transport connection to the board, extracts actions once synchronized,
 * then closes the connection.
 */
import { inviteFromHash, inviteRoomId } from '~/utils/invite'
import type { ImportedAction, Snapshot } from '@retroboard/domain'

/**
 * Extract room ID and keys from a board URL/hash.
 */
function parseBoardUrl(url: string): { roomId: string; hash: string } | null {
  try {
    // Handle both full URLs and just the hash
    let hash = url
    if (url.includes('#')) {
      hash = url.substring(url.indexOf('#'))
    } else if (url.includes('/board')) {
      // If it's a path without hash, return null
      return null
    }

    // Parse the invite from the hash
    const invite = inviteFromHash(hash)
    if (!invite) return null

    const roomId = inviteRoomId(invite)
    return { roomId, hash }
  } catch {
    return null
  }
}

/**
 * Extract ImportedAction[] from a board snapshot.
 * Returns only open actions (not done or dropped) with their status and owner.
 */
function extractActionsFromSnapshot(snap: Snapshot, boardTitle?: string): ImportedAction[] {
  const CLOSED_STATUSES = ['done', 'dropped']
  return Object.values(snap.actions ?? {})
    .filter((a) => !CLOSED_STATUSES.includes(a.status))
    .map((a) => ({
      text: a.text,
      owner: a.owner,
      status: a.status as ImportedAction['status'],
      ...(a.due ? { due: a.due } : {}),
      from: boardTitle,
    }))
}

/**
 * Composable to load actions from a live board URL.
 * Returns a function that accepts a board URL and returns a promise of ImportedAction[].
 * Returns null if the URL is invalid or the connection fails.
 */
export function useLiveCarryOver() {
  const { $ports } = useNuxtApp()

  /**
   * Fetch actions from a live board.
   * This creates a temporary transport to the board, waits for sync, then extracts actions.
   */
  async function loadFromLiveBoard(boardUrl: string, timeoutMs = 5000): Promise<ImportedAction[] | null> {
    if (!boardUrl.trim() || !$ports) return null

    const parsed = parseBoardUrl(boardUrl)
    if (!parsed) return null

    // For encrypted boards, we need to parse the invite to get the keys
    const invite = inviteFromHash(parsed.hash)
    if (!invite || invite.kind !== 'encrypted') return null

    try {
      // Create a channel factory and transport for this board
      const channelFactory = $ports.encryptedChannelFactory(invite.ring, undefined, { solo: false })
      const { randomId } = await import('~/utils/storage')

      return await new Promise<ImportedAction[] | null>((resolve) => {
        let snapshot: Snapshot | null = null
        let transport: ReturnType<typeof channelFactory> | null = null
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null
        let closed = false

        const handleSnapshot = (snap: Snapshot) => {
          snapshot = snap
          // Once we have actions, close immediately
          if (snap.actions && Object.keys(snap.actions).length > 0 && !closed) {
            closed = true
            if (transport) transport.close()
            if (timeoutHandle) clearTimeout(timeoutHandle)
            const actions = extractActionsFromSnapshot(snap, snap.settings?.title)
            resolve(actions.length > 0 ? actions : null)
          }
        }

        const handleError = () => {
          if (!closed) {
            closed = true
            if (transport) transport.close()
            if (timeoutHandle) clearTimeout(timeoutHandle)
            resolve(null)
          }
        }

        // Set up timeout
        timeoutHandle = setTimeout(() => {
          if (!closed) {
            closed = true
            if (transport) transport.close()
            const actions = snapshot ? extractActionsFromSnapshot(snapshot) : null
            resolve(actions && actions.length > 0 ? actions : null)
          }
        }, timeoutMs)

        // Create the transport
        try {
          // Create identity for the temporary connection
          const identity = {
            cid: randomId(16),
            hue: Math.random() * 360,
            name: 'Import',
            showName: false,
          }

          // Create channel via the factory
          const channel = channelFactory(parsed.roomId, {
            onSnapshot: handleSnapshot,
            onError: handleError,
            onStatus: () => {},
            onAccessDenied: handleError,
            onNotice: () => {},
            onCursor: () => {},
            onFocus: () => {},
            onPeerLeft: () => {},
            onRoomFull: handleError,
            onLinks: () => {},
            onReplica: () => {},
            onLocalCopy: () => {},
          })

          transport = channel
          // Start the connection
          channel.connect(identity)
        } catch {
          if (timeoutHandle) clearTimeout(timeoutHandle)
          resolve(null)
        }
      })
    } catch {
      return null
    }
  }

  return { loadFromLiveBoard }
}
