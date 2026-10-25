import { newIds } from '@retroboard/application'

/** Feeds the announcer from the board: notes of others, vote reveal. (Phase and timer have their own sources.) */
export function useBoardAnnouncements() {
  const board = useBoardStore()
  const announcer = useLiveAnnouncer()
  let seen: Set<string> | null = null

  watch(() => board.snapshot?.notes, (notes) => {
    if (!notes) { seen = null; return }
    for (const id of newIds(seen, notes.map((n) => n.id))) {
      const n = notes.find((x) => x.id === id)
      if (!n || n.mine) continue
      announcer.collect({ kind: 'note', column: board.columns.find((c) => c.id === n.columnId)?.title ?? '' })
    }
    seen = new Set(notes.map((n) => n.id))
  }, { immediate: true })

  watch(() => board.votingClosed, (closed, was) => {
    if (closed && !was && board.snapshot?.settings.secretVoting) announcer.collect({ kind: 'revealed' })
  })
}
