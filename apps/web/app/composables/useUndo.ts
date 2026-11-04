/** Undo and redo of my own latest actions, shared by the keyboard (Ctrl+Z) and the toolbar buttons (phones have no keyboard). */
export function useUndo() {
  const { t } = useT()
  const board = useBoardStore()
  const { push } = useToasts()
  return (redo: boolean) => {
    const done = redo ? board.commands.redo() : board.commands.undo()
    if (!done) { push(t(redo ? 'redo.nothing' : 'undo.nothing'), 'info'); return }
    push(t(done.result.ok ? `${redo ? 'redo' : 'undo'}.${done.label}` : 'undo.failed'), done.result.ok ? 'ok' : 'warn')
  }
}
