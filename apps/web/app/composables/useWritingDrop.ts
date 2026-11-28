/**
 * Drop targets of a column's writing zone (change note-edit-and-unpublish): dropping a published idea on the zone opens it in the
 * composer ("Edit here"), dropping it on the draft stack sends it back to its author's drafts ("Back to my drafts").
 * Both have menu items too (WCAG 2.5.7). The zone swallows idea drags, so a drop that does not apply does nothing, not a move.
 */
export function useWritingDrop(columnId: () => string) {
  const board = useBoardStore()
  const ui = useUiStore()
  const rights = useNoteRights()
  const unpublish = useUnpublish()
  const { push } = useToasts()
  const overZone = ref(false)
  const overStack = ref(false)
  /** The idea being dragged (clusters keep their own drop on the column). */
  const dragged = computed(() => (ui.dragNoteId ? board.noteById(ui.dragNoteId) : undefined))
  const canEdit = computed(() => !!dragged.value && rights.edit(dragged.value).shown)
  const canUnpublish = computed(() => !!dragged.value && rights.unpublish(dragged.value).shown)

  function openEdit(id: string) {
    const n = board.noteById(id)
    if (!n) return
    const r = rights.edit(n)
    if (!r.shown) return
    if (r.reason) { push(rights.reasonText(r.reason)!, 'warn'); return }
    ui.editInComposer(id, columnId())
  }
  const target = (over: Ref<boolean>, can: ComputedRef<boolean>, act: (id: string) => void) => ({
    onDragover: (e: DragEvent) => {
      if (!ui.dragNoteId) return
      e.stopPropagation()
      if (can.value) { e.preventDefault(); over.value = true }
    },
    onDragleave: (e: DragEvent) => { if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) over.value = false },
    onDrop: (e: DragEvent) => {
      const id = ui.dragNoteId
      if (!id) return
      e.stopPropagation()
      e.preventDefault()
      over.value = false
      const accepted = can.value
      ui.dragNoteId = null
      if (accepted) act(id)
    },
  })
  return {
    overZone, overStack, dragged, canEdit, canUnpublish, openEdit,
    zone: target(overZone, canEdit, openEdit),
    stack: target(overStack, canUnpublish, (id) => unpublish.request(id)),
  }
}
