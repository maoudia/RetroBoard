import { activityBetween, appendActivity, presenceBetween, type ActivityEntry } from '@retroboard/application'
import type { Peer, Snapshot } from '@retroboard/domain'

/** Local, in-memory log of board events (change board-activity-feed). Nothing is stored or sent. */
export const useActivityStore = defineStore('activity', () => {
  const board = useBoardStore()
  const entries = ref<ActivityEntry[]>([])
  const unread = ref(0)
  let prev: Snapshot | null = null
  let seq = 1
  watch(() => board.snapshot, (next) => {
    if (!next) { prev = null; entries.value = []; unread.value = 0; return }
    const events = activityBetween(prev, next, Date.now())
    prev = next
    if (!events.length) return
    entries.value = appendActivity(entries.value, events, seq)
    seq += events.length
    unread.value += events.length
  })
  // Joins and departures (change presence-status): the first list I get is the baseline, nobody is announced for it.
  let prevPeers: Peer[] | null = null
  watch(() => board.peers, (next) => {
    if (!board.snapshot || !next.some((p) => p.me)) { prevPeers = null; return }
    const events = presenceBetween(prevPeers, next, Date.now())
    prevPeers = [...next]
    if (!events.length) return
    entries.value = appendActivity(entries.value, events, seq)
    seq += events.length
    unread.value += events.length
  })
  const markRead = () => { unread.value = 0 }
  return { entries, unread, markRead }
})
