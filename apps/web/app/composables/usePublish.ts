import { LIMITS } from '@retroboard/domain'
import { t } from '~/i18n'

/** Publishes private drafts to the shared board, with the flight animation. */
export function usePublish() {
  const board = useBoardStore()
  const drafts = useDraftsStore()
  const flights = useFlights()
  const { push } = useToasts()

  function publish(ids?: string[]) {
    const list = ids ? drafts.drafts.filter((d) => ids.includes(d.id)) : drafts.drafts
    if (!list.length) return
    if (board.locked) return push(t('publish.locked'), 'warn')
    // Server batch limit: send in slices, keep order.
    for (let i = 0; i < list.length; i += LIMITS.maxBatch) {
      const slice = list.slice(i, i + LIMITS.maxBatch)
      for (const d of slice) flights.record(d.columnId, d.text, document.querySelector(`[data-draft-id="${d.id}"]`))
      const sent = board.commands.publish(slice.map((d) => ({ columnId: d.columnId, text: d.text, color: d.color })))
      if (!sent.ok) return push(t(sent.error === 'locked' ? 'publish.locked' : 'publish.offline'), 'warn')
      drafts.removeMany(slice.map((d) => d.id))
    }
  }
  return { publish }
}
