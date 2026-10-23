/** Native drag and drop target for a column: dropping a note moves it (and leaves its group). */
export function useColumnDrop(columnId: Ref<string> | (() => string)) {
  const board = useBoardStore()
  const ui = useUiStore()
  const over = ref(false)
  const id = () => (typeof columnId === 'function' ? columnId() : columnId.value)

  return {
    over,
    bind: {
      onDragover: (e: DragEvent) => { if (ui.dragNoteId) { e.preventDefault(); over.value = true } },
      onDragleave: (e: DragEvent) => { if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) over.value = false },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        over.value = false
        const note = ui.dragNoteId && board.noteById(ui.dragNoteId)
        ui.dragNoteId = null
        if (note && note.columnId !== id()) board.send({ t: 'note.move', id: note.id, columnId: id() })
        else if (note && note.groupId) board.send({ t: 'note.ungroup', id: note.id })
      },
    },
  }
}
