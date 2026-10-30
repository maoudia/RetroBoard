/** Native drag and drop target for a column: dropping a note moves it (and leaves its group); dropping a cluster moves the whole cluster. */
export function useColumnDrop(columnId: Ref<string> | (() => string)) {
  const board = useBoardStore()
  const ui = useUiStore()
  const over = ref(false)
  const id = () => (typeof columnId === 'function' ? columnId() : columnId.value)

  return {
    over,
    bind: {
      onDragover: (e: DragEvent) => { if (ui.dragNoteId || ui.dragGroupId) { e.preventDefault(); over.value = true } },
      onDragleave: (e: DragEvent) => { if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) over.value = false },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        over.value = false
        const gid = ui.dragGroupId
        if (gid) {
          ui.dragGroupId = null
          const g = board.groupById(gid)
          if (g && g.columnId !== id()) board.commands.moveGroup(gid, id())
          return
        }
        const note = ui.dragNoteId && board.noteById(ui.dragNoteId)
        ui.dragNoteId = null
        if (note && note.columnId !== id()) board.commands.moveNote(note.id, id())
        else if (note && note.groupId) board.commands.ungroupNote(note.id)
      },
    },
  }
}
