import { EMPTY_FILTER, type NoteFilter } from '@retroboard/application'
import { safeStorage } from '~/utils/storage'
import { legacySizes } from '~/utils/layout'
import { closeIn, type OpenGroups, openIn, reconcile } from '~/utils/open-groups'
export type ColumnSize = 'narrow' | 'normal' | 'wide' | 'full'
export type WriteSize = 'small' | 'normal' | 'large'
export const WRITE_SIZES: readonly WriteSize[] = ['small', 'normal', 'large']
export const COLUMN_SIZES: readonly ColumnSize[] = ['narrow', 'normal', 'wide', 'full']
export type DialogName = 'share' | 'options' | 'name' | 'template' | 'actions' | 'theme' | 'column' | 'profile' | 'ranking' | 'report' | 'export' | 'palette' | 'destroy' | 'help' | 'toClose' | 'sync' | null

/** Purely visual state shared by components. */
export const useUiStore = defineStore('ui', () => {
  const dialog = ref<DialogName>(null)
  /** Columns whose clusters show their notes inline (this participant's view only). */
  const expandedColumns = ref(new Set<string>())
  const appSettings = useSettingsStore()
  /** Toggles one column; while the all-columns link is on, every column that has groups follows the clicked one (change column-defaults-and-collapse). */
  const toggleExpanded = (columnId: string) => {
    const next = new Set(expandedColumns.value)
    const on = !next.has(columnId)
    const targets = appSettings.s.linkColumns ? new Set([columnId, ...(useBoardStore().snapshot?.groups ?? []).map((g) => g.columnId)]) : new Set([columnId])
    for (const id of targets) { if (on) next.add(id); else next.delete(id) }
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
  const columnWidths = computed<Record<string, number>>(() => (roomId.value ? (layout.current.widths?.[roomId.value] ?? {}) : {}))
  const writeHeight = computed<number | null>(() => (roomId.value ? (layout.current.writeH?.[roomId.value] ?? null) : null))
  /** Writing size and dragged height of one column: its own, else the room's (change toast-notifications-v2). */
  const writeSizeOf = (columnId: string): WriteSize => (roomId.value ? ((layout.current.writeCol?.[roomId.value]?.[columnId] as WriteSize | undefined) ?? writeSize.value) : 'normal')
  const writeHeightOf = (columnId: string): number | null => (roomId.value ? (layout.current.writeHCol?.[roomId.value]?.[columnId] ?? writeHeight.value) : null)
  const setColumnWriteSize = (room: string | null, columnId: string, size: WriteSize) => { if (room) layout.setColumnWrite(room, columnId, size === writeSize.value ? null : size) }
  const setColumnWriteHeight = (room: string | null, columnId: string, px: number | null) => { if (room) layout.setColumnWriteHeight(room, columnId, px) }
  const setAllWriteSize = (room: string | null, size: WriteSize) => { if (room) layout.setAllWrite(room, size) }
  const setWriteHeight = (room: string | null, px: number | null) => { if (room) layout.setWriteHeight(room, px) }
  const setColumnWidth = (room: string | null, columnId: string, px: number | null) => { if (room) layout.setWidth(room, columnId, px) }
  const setColumnSize = (room: string | null, columnId: string, size: ColumnSize) => {
    if (!room) return
    // A preset replaces a width set by dragging.
    if (layout.current.widths?.[room]?.[columnId] !== undefined) layout.setWidth(room, columnId, null)
    if (!layout.current.sizes[room]) layout.setSizes(room, legacy.value.sizes)
    if (!appSettings.s.linkColumns) { layout.setSize(room, columnId, size); return }
    // Linked: the preset goes to every column; a dragged width stays (a free width is deliberate).
    for (const c of useBoardStore().columns) layout.setSize(room, c.id, size)
  }
  const setWriteSize = (room: string | null, size: WriteSize) => { if (room) layout.setWrite(room, size) }
  /** Notes grouped by "group by author" per column, kept to offer an undo. */
  const autoGrouped = ref<Record<string, string[]>>({})
  /** Cluster being dragged (drop on another cluster to merge). */
  const dragGroupId = ref<string | null>(null)
  /** One open group per column (change group-colors-menu-and-scope): column id to group id, this participant's view only. */
  const openGroupIds = ref<OpenGroups>({})
  /** Column of the group opened last: Escape closes it when no panel has focus. */
  const lastGroupColumn = ref<string | null>(null)
  /** Group whose panel opens with the title focused (Rename in the group menu). */
  const renameGroupId = ref<string | null>(null)
  function openGroup(columnId: string, groupId: string, opts: { rename?: boolean } = {}) {
    openGroupIds.value = openIn(openGroupIds.value, columnId, groupId)
    lastGroupColumn.value = columnId
    renameGroupId.value = opts.rename ? groupId : null
  }
  function closeGroup(columnId: string) {
    openGroupIds.value = closeIn(openGroupIds.value, columnId)
    if (lastGroupColumn.value === columnId) lastGroupColumn.value = Object.keys(openGroupIds.value).at(-1) ?? null
  }
  /** A group dissolved, merged away or reset closes; a moved one follows to its new column. */
  function reconcileGroups(groups: readonly { id: string; columnId: string }[]) {
    openGroupIds.value = reconcile(openGroupIds.value, groups)
    if (lastGroupColumn.value && !(lastGroupColumn.value in openGroupIds.value)) lastGroupColumn.value = Object.keys(openGroupIds.value).at(-1) ?? null
  }
  /** Column being edited in the column dialog; null with dialog='column' means "add". */
  const editingColumnId = ref<string | null>(null)
  const dragNoteId = ref<string | null>(null)
  /** The carried-over actions review was closed (the invite panel waits for it on new boards). */
  const reviewDone = ref(false)
  /** This tab already answered (or caused) the "take over facilitation?" question. */
  const takeoverAsked = ref(false)
  /** The facilitator is moving the team to a fresh link: closing the old room is not news in this tab, the next page is. */
  const moving = ref(false)
  /** Presenter mode (screen sharing, room screen): larger type, no drafts, no pointers, QR to join. */
  const presenter = ref(false)
  // Entering or leaving presentation mode starts from the default view: the toggle means "expand" outside, "collapse" inside.
  watch(presenter, () => { expandedColumns.value = new Set() })
  /** Presenter column focus (presenter-mode-v2): index of the focused column, null for the whole board. Local to this tab. */
  const focusColumn = ref<number | null>(null)
  /** Presenter focus style, remembered per screen class. */
  const focusStyle = computed({ get: () => layout.current.focusStyle ?? 'centre', set: (v: 'centre' | 'accordion') => layout.setFocusStyle(v) })
  /** Presenter walk-through of the voted ideas (presenter-mode-v2): index in the ranking, null when off. Local to this tab. */
  /** Presenter note spotlight (presenter-mode-v2): id of the enlarged note, null when off. Local to this tab. */
  const spotlightNoteId = ref<string | null>(null)
  const walkIndex = ref<number | null>(null)
  /** Note zoom (note-zoom-on-double-tap): id of the enlarged note and, for a cluster, the cluster it steps through. Local to this tab, never persisted or sent. */
  const zoomNoteId = ref<string | null>(null)
  const zoomGroupId = ref<string | null>(null)
  /** My view filter (text, colours, author, has votes). Never shared. */
  const filter = ref<NoteFilter>({ ...EMPTY_FILTER })
  /** Presenter laser pointer: my pointer is shown to everybody while on (change presenter-mode-v2). */
  const laser = ref(false)
  watch(presenter, (on) => { if (!on) laser.value = false })
  const filterOpen = computed({ get: () => layout.filterOpen, set: (v: boolean) => layout.setFilterOpen(v) })
  const resetFilter = () => { filter.value = { ...EMPTY_FILTER } }

  const open = (name: Exclude<DialogName, null>) => { dialog.value = name }
  const close = () => { dialog.value = null }
  /** Note or cluster whose colour is being picked in the palette sheet. */
  const paletteTarget = ref<{ kind: 'note' | 'group'; id: string } | null>(null)
  /** Note the keyboard asked to edit (Enter on a focused note). */
  const editNoteId = ref<string | null>(null)
  /**
   * A published idea open in the writing zone of a column (change note-edit-and-unpublish): the composer shows it in edit mode, the idea
   * stays on the board until "Save". Local to this tab; the others only see a light "being edited" mark.
   */
  const composerEdit = ref<{ noteId: string; columnId: string } | null>(null)
  function editInComposer(noteId: string, columnId: string) {
    composerEdit.value = { noteId, columnId }
    composeColumn.value = columnId
  }
  const stopComposerEdit = () => { composerEdit.value = null }
  /** Phones: toolbar, phase bar and voting bar folded away while reading the board (change mobile-board-space). */
  const chromeHidden = ref(false)
  /** A scroll the app makes itself (a new note brought into view) must not fold the phone menus until this time (change writing-zone-at-column-bottom). */
  const quietScrollUntil = ref(0)
  /** Action form to prefill when the actions panel opens (from a note or group menu). */
  const actionFrom = ref<{ sourceId: string; text: string; owner: string } | null>(null)
  function openActionFrom(source: { sourceId: string; text: string; owner: string }) { actionFrom.value = source; dialog.value = 'actions' }
  /** Source note or group whose actions the actions panel highlights. */
  const focusSource = ref<string | null>(null)
  function openActionsFor(sourceId: string) { focusSource.value = sourceId; dialog.value = 'actions' }
  function openPalette(noteId: string, kind: 'note' | 'group' = 'note') { paletteTarget.value = { kind, id: noteId }; dialog.value = 'palette' }
  function editColumn(id: string | null) { editingColumnId.value = id; dialog.value = 'column' }
  /** Phones: the column whose composer sheet is open, null when closed (change publishing-ux-redesign). Local to this tab. */
  const composeColumn = ref<string | null>(null)
  const openCompose = (columnId: string) => { composeColumn.value = columnId }
  const closeCompose = () => { composeColumn.value = null }

  return { composerEdit, editInComposer, stopComposerEdit, composeColumn, openCompose, closeCompose, chromeHidden, quietScrollUntil, dialog, takeoverAsked, moving, reviewDone, presenter, spotlightNoteId, zoomNoteId, zoomGroupId, focusColumn, focusStyle, laser, walkIndex, filter, filterOpen, resetFilter, openGroupIds, lastGroupColumn, renameGroupId, openGroup, closeGroup, reconcileGroups, editingColumnId, dragNoteId, open, close, editColumn, paletteTarget, openPalette, actionFrom, openActionFrom, focusSource, openActionsFor, editNoteId, expandedColumns, toggleExpanded, autoGrouped, columnSizes, columnWidths, setColumnWidth, loadColumnSizes: loadColumnSizesAndWrite, setColumnSize, writeSize, setWriteSize, writeHeight, setWriteHeight, writeSizeOf, writeHeightOf, setColumnWriteSize, setColumnWriteHeight, setAllWriteSize, dragGroupId }
})
