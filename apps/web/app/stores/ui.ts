export type DialogName = 'share' | 'options' | 'name' | 'template' | 'actions' | 'theme' | 'column' | 'profile' | 'ranking' | null

/** Purely visual state shared by components. */
export const useUiStore = defineStore('ui', () => {
  const dialog = ref<DialogName>(null)
  /** Columns whose clusters show their notes inline (this participant's view only). */
  const expandedColumns = ref(new Set<string>())
  const toggleExpanded = (columnId: string) => {
    const next = new Set(expandedColumns.value)
    if (next.has(columnId)) next.delete(columnId); else next.add(columnId)
    expandedColumns.value = next
  }
  /** Cluster being dragged (drop on another cluster to merge). */
  const dragGroupId = ref<string | null>(null)
  const openGroupId = ref<string | null>(null)
  /** Column being edited in the column dialog; null with dialog='column' means "add". */
  const editingColumnId = ref<string | null>(null)
  const dragNoteId = ref<string | null>(null)

  const open = (name: Exclude<DialogName, null>) => { dialog.value = name }
  const close = () => { dialog.value = null }
  function editColumn(id: string | null) { editingColumnId.value = id; dialog.value = 'column' }

  return { dialog, openGroupId, editingColumnId, dragNoteId, open, close, editColumn, expandedColumns, toggleExpanded, dragGroupId }
})
