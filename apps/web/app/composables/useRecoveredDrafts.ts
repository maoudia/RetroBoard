import type { RecoveredDraft } from '@retroboard/application'

/**
 * Gives back to my draft stack the ideas an unpublish took off the board (change note-edit-and-unpublish): read from the signed log on
 * this device, once per event. A facilitator who sent my idea back is named in a notice; my own unpublish says nothing more than its toast.
 */
export function useRecoveredDrafts() {
  const board = useBoardStore()
  const drafts = useDraftsStore()
  const announcer = useLiveAnnouncer()
  const { push } = useToasts()
  const { t } = useT()
  let running = false
  let again = false

  async function sync() {
    // One pass at a time; a snapshot that lands meanwhile asks for one more pass.
    if (running) { again = true; return }
    running = true
    try {
      do {
        again = false
        const fresh = await drafts.recover(board.recovered())
        for (const d of fresh) tell(d)
      } while (again)
    } finally { running = false }
  }
  function tell(d: RecoveredDraft) {
    if (d.byMe) return
    const text = d.by ? t('note.unpublish.notice', { name: d.by }) : t('note.unpublish.notice.anon')
    push(text, 'info', 6000)
    announcer.polite(text)
  }
  watch(() => board.snapshot, () => { void sync() }, { immediate: true })
}
