import { type BoardResult, type PublishedItem, publishedNotes, UNDO_WINDOW_MS } from '@retroboard/application'
import { LIMITS } from '@retroboard/domain'
import { t } from '~/i18n'

/** Publishes private drafts to the shared board, with the flight animation. */
export function usePublish() {
  const board = useBoardStore()
  const drafts = useDraftsStore()
  const flights = useFlights()
  const { push } = useToasts()

  function publish(ids?: string[]): BoardResult {
    const list = ids ? drafts.drafts.filter((d) => ids.includes(d.id)) : drafts.drafts
    if (!list.length) return { ok: true }
    if (!board.allowed('note.addMany')) {
      push(t('error.phase'), 'warn')
      return { ok: false, error: 'phase' }
    }
    const since = Date.now() - 1
    const items: PublishedItem[] = []
    // Send in protocol-sized slices so each published slice leaves the drafts at once.
    for (let i = 0; i < list.length; i += LIMITS.maxBatch) {
      const slice = list.slice(i, i + LIMITS.maxBatch)
      for (const d of slice) flights.record(d.columnId, d.text, document.querySelector(`[data-draft-id="${d.id}"]`))
      const sent = board.commands.publish(slice.map((d) => ({ columnId: d.columnId, text: d.text, color: d.color })))
      if (!sent.ok) {
        push(t(sent.error === 'locked' ? 'publish.locked' : 'publish.offline'), 'warn')
        return sent
      }
      drafts.removeMany(slice.map((d) => d.id))
      items.push(...slice.map((d) => ({ columnId: d.columnId, text: d.text, color: d.color })))
    }
    push(t('publish.done', { n: items.length }), 'ok', UNDO_WINDOW_MS, { label: t('publish.undo'), testid: 'undo-publish', run: () => undo(items, since) })
    return { ok: true }
  }

  /** Takes a publication back: the notes leave the board for everyone and return to my drafts. */
  function undo(items: PublishedItem[], since: number) {
    const notes = publishedNotes(board.snapshot?.notes ?? [], items, since)
    for (const n of notes) board.commands.deleteNote(n.id)
    drafts.restore(notes.map((n) => ({ columnId: n.columnId, text: n.text, color: n.color })))
  }
  return { publish }
}
