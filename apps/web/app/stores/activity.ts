import { activityBetween, appendActivity, presenceBetween, type ActivityEntry } from '@retroboard/application'
import type { Peer, Snapshot } from '@retroboard/domain'

/** Local, in-memory log of board events (change board-activity-feed). Nothing is stored or sent. */
export const useActivityStore = defineStore('activity', () => {
  const board = useBoardStore()
  const { push } = useToasts()
  const { t } = useT()
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
    announce(events)
  })
  // Arrival popups (board option, on by default): grouped over 1.5 s so a group arriving together gives one toast.
  const pending: { joined: string[]; left: string[] } = { joined: [], left: [] }
  let timer: ReturnType<typeof setTimeout> | undefined
  function announce(events: { kind: string; name?: string | null }[]) {
    if (board.snapshot?.settings.announceArrivals === false) return
    for (const e of events) {
      if (e.kind === 'participant.joined') pending.joined.push(e.name ?? t('common.anonymous'))
      else if (e.kind === 'participant.left') pending.left.push(e.name ?? t('common.anonymous'))
    }
    if (!pending.joined.length && !pending.left.length) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      for (const kind of ['joined', 'left'] as const) {
        const names = pending[kind].splice(0)
        if (names.length) push(t(`presence.toast.${kind}${names.length > 1 ? '.many' : ''}` as never, { names: names.join(', ') } as never), 'info')
      }
    }, 1500)
  }
  const markRead = () => { unread.value = 0 }
  return { entries, unread, markRead }
})
