import { EMPTY_FILTER, type NoteFilter } from '@retroboard/application'
import { safeStorage } from '~/utils/storage'
import { legacySizes } from '~/utils/layout'
export type ColumnSize = 'narrow' | 'normal' | 'wide' | 'full'
export type WriteSize = 'small' | 'normal' | 'large'
export const WRITE_SIZES: readonly WriteSize[] = ['small', 'normal', 'large']
export const COLUMN_SIZES: readonly ColumnSize[] = ['narrow', 'normal', 'wide', 'full']
export type DialogName = 'share' | 'options' | 'name' | 'template' | 'actions' | 'theme' | 'column' | 'profile' | 'ranking' | 'report' | 'export' | 'palette' | 'destroy' | 'help' | 'toClose' | null

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
  /** Personal column widths and writing area, remembered per board and per screen class (change device-layout-prefs). */
  const layout = useLayoutStore()
  const roomId = ref<string | null>(null)
  /** Sizes saved before layouts were per class: used until this class has a choice of its own. */
  const legacy = ref<{ sizes: Record<string, string>, write: string | null }>({ sizes: {}, write: null })
  const columnSizes = computed(() => (roomId.value ? ((layout.current.sizes[roomId.value] ?? legacy.value.sizes) as Record<string, ColumnSize>) : {}))
  const writeSize = computed<WriteSize>(() => (roomId.value ? ((layout.current.write[roomId.value] ?? legacy.value.write ?? 'normal') as WriteSize) : 'normal'))
  const loadColumnSizesAndWrite = (room: string | null) => {
    roomId.value = room
    legacy.value = room ? legacySizes(room, (k, f) => safeStorage.get(k, f)) : { sizes: {}, write: null }
  }
  const setColumnSize = (room: string | null, columnId: string, size: ColumnSize) => {
    if (!room) return
    if (!layout.current.sizes[room]) layout.setSizes(room, legacy.value.sizes)
    layout.setSize(room, columnId, size)
  }
  const setWriteSize = (room: string | null, size: WriteSize) => { if (room) layout.setWrite(room, size) }
  /** Notes grouped by "group by author" per column, kept to offer an undo. */
  const autoGrouped = ref<Record<string, string[]>>({})
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
  /** Presenter column focus (presenter-mode-v2): index of the focused column, null for the whole board. Local to this tab. */
  const focusColumn = ref<number | null>(null)
  /** Presenter focus style, remembered per screen class. */
  const focusStyle = computed({ get: () => layout.current.focusStyle ?? 'centre', set: (v: 'centre' | 'accordion') => layout.setFocusStyle(v) })
  /** Presenter walk-through of the voted ideas (presenter-mode-v2): index in the ranking, null when off. Local to this tab. */
  /** Presenter note spotlight (presenter-mode-v2): id of the enlarged note, null when off. Local to this tab. */
  const spotlightNoteId = ref<string | null>(null)
  const walkIndex = ref<number | null>(null)
  /** My view filter (text, colours, author, has votes). Never shared. */
  const filter = ref<NoteFilter>({ ...EMPTY_FILTER })
  const filterOpen = ref(false)
  const resetFilter = () => { filter.value = { ...EMPTY_FILTER } }

  const open = (name: Exclude<DialogName, null>) => { dialog.value = name }
  const close = () => { dialog.value = null }
  /** Note whose colour is being picked in the palette sheet. */
  const paletteNoteId = ref<string | null>(null)
  /** Note the keyboard asked to edit (Enter on a focused note). */
  const editNoteId = ref<string | null>(null)
  /** Action form to prefill when the actions panel opens (from a note or group menu). */
  const actionFrom = ref<{ sourceId: string; text: string; owner: string } | null>(null)
  function openActionFrom(source: { sourceId: string; text: string; owner: string }) { actionFrom.value = source; dialog.value = 'actions' }
  /** Source note or group whose actions the actions panel highlights. */
  const focusSource = ref<string | null>(null)
  function openActionsFor(sourceId: string) { focusSource.value = sourceId; dialog.value = 'actions' }
  function openPalette(noteId: string) { paletteNoteId.value = noteId; dialog.value = 'palette' }
  function editColumn(id: string | null) { editingColumnId.value = id; dialog.value = 'column' }

  return { dialog, takeoverAsked, reviewDone, presenter, spotlightNoteId, focusColumn, focusStyle, walkIndex, filter, filterOpen, resetFilter, openGroupId, editingColumnId, dragNoteId, open, close, editColumn, paletteNoteId, openPalette, actionFrom, openActionFrom, focusSource, openActionsFor, editNoteId, expandedColumns, toggleExpanded, autoGrouped, columnSizes, loadColumnSizes: loadColumnSizesAndWrite, setColumnSize, writeSize, setWriteSize, dragGroupId }
})
