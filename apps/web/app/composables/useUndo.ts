/** Undo and redo of my own latest actions, shared by the keyboard (Ctrl+Z) and the toolbar buttons (phones have no keyboard). */
export function useUndo() {
  const { t } = useT()
  const board = useBoardStore()
  const drafts = useDraftsStore()
  const { push } = useToasts()
  return (redo: boolean) => {
    const step = redo ? null : board.commands.nextUndo()
    const done = redo ? board.commands.redo() : board.commands.undo()
    // Putting an unpublished idea back on the board takes the draft it gave back off my stack.
    if (done?.result.ok && step?.label === 'unpublish') for (const c of step.commands) if (c.t === 'note.add') drafts.discard(c.columnId, c.text)
    if (!done) { push(t(redo ? 'redo.nothing' : 'undo.nothing'), 'info'); return }
    push(t(done.result.ok ? `${redo ? 'redo' : 'undo'}.${done.label}` : 'undo.failed'), done.result.ok ? 'ok' : 'warn')
  }
}
