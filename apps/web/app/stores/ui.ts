import { EMPTY_FILTER, type NoteFilter } from '@retroboard/application'
export type DialogName = 'share' | 'options' | 'name' | 'template' | 'actions' | 'theme' | 'column' | 'profile' | 'ranking' | 'report' | 'export' | 'palette' | null

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
  /** The carried-over actions review was closed (the invite panel waits for it on new boards). */
  const reviewDone = ref(false)
  /** This tab already answered (or caused) the "take over facilitation?" question. */
  const takeoverAsked = ref(false)
  /** Presenter mode (screen sharing, room screen): larger type, no drafts, no pointers, QR to join. */
  const presenter = ref(false)
  /** My view filter (text, colours, author, has votes). Never shared. */
  const filter = ref<NoteFilter>({ ...EMPTY_FILTER })
  const filterOpen = ref(false)
  const resetFilter = () => { filter.value = { ...EMPTY_FILTER } }

  const open = (name: Exclude<DialogName, null>) => { dialog.value = name }
  const close = () => { dialog.value = null }
  /** Note whose colour is being picked in the palette sheet. */
  const paletteNoteId = ref<string | null>(null)
  function openPalette(noteId: string) { paletteNoteId.value = noteId; dialog.value = 'palette' }
  function editColumn(id: string | null) { editingColumnId.value = id; dialog.value = 'column' }

  return { dialog, takeoverAsked, reviewDone, presenter, filter, filterOpen, resetFilter, openGroupId, editingColumnId, dragNoteId, open, close, editColumn, paletteNoteId, openPalette, expandedColumns, toggleExpanded, dragGroupId }
})
