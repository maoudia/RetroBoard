/**
 * From an action to the idea it came from (change note-to-action): closes the actions panel,
 * opens the cluster when the note sits in one, scrolls to it and flashes it.
 */
export function useJumpToSource() {
  const board = useBoardStore()
  const ui = useUiStore()

  /** Text of the source, or null when it no longer exists. */
  function sourceText(id: string): string | null {
    const s = board.snapshot
    if (!s) return null
    const note = s.notes.find((n) => n.id === id)
    if (note) return note.text
    const group = s.groups.find((g) => g.id === id)
    if (!group) return null
    return group.title ?? s.notes.find((n) => n.groupId === id)?.text ?? ''
  }

  async function jump(id: string) {
    const note = board.snapshot?.notes.find((n) => n.id === id)
    ui.close()
    if (note?.groupId) ui.openGroupId = note.groupId
    await nextTick()
    await new Promise((r) => setTimeout(r, 60))
    const el = document.querySelector<HTMLElement>(`[data-source-id="${CSS.escape(id)}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' })
    el.focus({ preventScroll: true })
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.animate([{ outlineColor: 'var(--accent)', outlineWidth: '4px', outlineStyle: 'solid', outlineOffset: '4px' }, { outlineColor: 'transparent', outlineWidth: '4px', outlineStyle: 'solid', outlineOffset: '4px' }], { duration: 1400 })
    }
  }
  return { sourceText, jump }
}
