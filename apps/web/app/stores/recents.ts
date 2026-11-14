import { inviteFromHash } from '~/utils/invite'
import { isSolo } from '~/utils/solo'

/** A recent board as shown. `hash` is the full link fragment (keys included). */
export interface RecentBoard { id: string; title: string; themeId: string; at: number; hash: string }
const MAX = 12

/**
 * The boards this browser opened recently: a view of the board library (change user-drive-storage), whose entries are
 * sealed with the device key and, once a target is connected, kept there too. The server never lists boards.
 * Boards the person created enter the library on their own; one only joined by link stays out until "Save to my library".
 */
export const useRecentsStore = defineStore('recents', () => {
  const library = useLibraryStore()
  const items = computed<RecentBoard[]>(() => library.entries.slice(0, MAX).map((e) => ({ id: e.boardId, title: e.title, themeId: e.themeId ?? '', at: e.lastActivityAt, hash: e.fragment })))

  /** The board was opened or renamed: a created board is listed, a listed one refreshed, a joined one left alone. */
  async function touch(id: string, title: string, themeId: string, hash: string) {
    const invite = inviteFromHash(hash)
    const created = invite?.kind === 'legacy' || !!invite?.ring.facilitatorSecret
    const known = library.get(id)
    if (!created && !known) return
    const teamId = useTeamStore().ws.boards[id]?.teamId
    await library.save({
      boardId: id, title, themeId, fragment: hash, role: created ? 'facilitator' : 'participant', origin: known?.origin ?? (created ? 'created' : 'joined'),
      hasPasscode: !!(invite?.kind === 'encrypted' && invite.ring.passcode), solo: isSolo(id), ...(teamId ? { teamId } : known?.teamId ? { teamId: known.teamId } : {}), lastActivityAt: Date.now(),
    })
  }
  async function remove(id: string) { await library.forget(id) }
  async function clear() { for (const e of [...library.entries, ...library.archived]) await library.forget(e.boardId) }
  return { items, touch, remove, clear }
})
