import { unpublishNeedsConfirm } from '@retroboard/application'

/** The idea waiting for the confirmation of "Back to my drafts" (shared by the menu and the drop on the draft stack). */
const asking = ref<string | null>(null)

/** Sends an idea back to its author's draft stack (change note-edit-and-unpublish): checks, asks when it costs something, flies, tells. */
export function useUnpublish() {
  const board = useBoardStore()
  const flights = useFlights()
  const rights = useNoteRights()
  const announcer = useLiveAnnouncer()
  const undo = useUndo()
  const { push } = useToasts()
  const { t } = useT()

  /** Shows the draft stack of the column, or the writing field, or the handle that brings the folded zone back. */
  const stackOf = (columnId: string): Element | null => {
    const col = document.querySelector(`[data-testid="column-${columnId}"]`)
    return col?.querySelector('[data-testid="drafts-tray"]') ?? col?.querySelector(`[data-testid="draft-${columnId}"]`) ?? col?.querySelector(`[data-testid="write-handle-${columnId}"]`) ?? null
  }

  function run(id: string) {
    const n = board.noteById(id)
    if (!n) { push(t('note.unpublish.gone'), 'warn'); return }
    const el = document.querySelector<HTMLElement>(`[data-testid="note-${id}"]`)
    const target = stackOf(n.columnId)
    const sent = board.commands.unpublishNote(id)
    if (!sent.ok) { push(sent.error === 'locked' ? t('error.locked') : t('note.unpublish.refused'), 'warn'); return }
    flights.flyOut(el, target)
    announcer.polite(t(n.mine ? 'note.unpublish.done' : 'note.unpublish.sentBack'))
    // An idea of someone else goes to its author's stack: nothing to undo or recover here, and no promise made on their behalf.
    if (n.mine) push(t('note.unpublish.done'), 'ok', 6000, { label: t('note.unpublish.undo'), testid: 'undo-unpublish', run: () => undo(false) })
  }

  /** Asks first when it costs votes, drops a pin or touches someone else's idea; refuses with the reason otherwise. */
  function request(id: string) {
    const n = board.noteById(id)
    if (!n) { push(t('note.unpublish.gone'), 'warn'); return }
    const r = rights.unpublish(n)
    if (!r.shown) return
    if (r.reason) { push(rights.reasonText(r.reason)!, 'warn'); return }
    if (unpublishNeedsConfirm(n, rights.votes(n).removed)) asking.value = id
    else run(id)
  }
  return { asking, request, run }
}
