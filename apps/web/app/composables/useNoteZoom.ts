/**
 * Open the local note zoom (change note-zoom-on-double-tap). A note in a hidden column, or outside the column whose turn it is, is refused
 * (the same rule as for reading it on the board). `groupId` zooms a cluster: its ideas are the sequence and its title the heading.
 */
export function useNoteZoom() {
  const ui = useUiStore()
  const board = useBoardStore()
  function zoomable(noteId: string): boolean {
    const n = board.snapshot?.notes.find((x) => x.id === noteId)
    if (!n) return false
    if (board.columns.find((c) => c.id === n.columnId)?.hidden) return false
    const turn = board.snapshot?.turn ?? null
    return turn === null || turn === n.columnId
  }
  function openZoom(noteId: string, groupId: string | null = null): boolean {
    if (!zoomable(noteId) || ui.dialog !== null) return false
    ui.zoomGroupId = groupId
    ui.zoomNoteId = noteId
    return true
  }
  return { zoomable, openZoom }
}
