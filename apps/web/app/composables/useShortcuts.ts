import { resolveShortcut, type KeyContext, type ShortcutId } from '@retroboard/application'

const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
const CONTROLS = new Set(['BUTTON', 'A', 'SUMMARY'])
const CONTROL_ROLES = new Set(['button', 'menuitem', 'radio', 'switch', 'checkbox', 'tab', 'option', 'link'])

/** What owns the keyboard right now: a field, a native control, or a dialog. */
export function keyboardOwner(target: EventTarget | null): Pick<KeyContext, 'typing' | 'onControl'> {
  const el = target instanceof HTMLElement ? target : null
  if (!el) return { typing: false, onControl: false }
  const typing = el.isContentEditable || TYPING.has(el.tagName)
  const role = el.getAttribute('role')
  return { typing, onControl: CONTROLS.has(el.tagName) || (role !== null && CONTROL_ROLES.has(role)) }
}

/**
 * Single-key shortcuts of the board page (change keyboard-shortcuts). The table and the guard are
 * pure (@retroboard/application); this composable only reads the DOM and runs the action.
 */
export function useShortcuts() {
  const ui = useUiStore()
  const board = useBoardStore()
  const drafts = useDraftsStore()
  const settings = useSettingsStore()
  const { publish } = usePublish()

  const columns = () => [...document.querySelectorAll<HTMLElement>('section[data-anchor-kind="column"]')]
  const notesOf = (col: HTMLElement) => [...col.querySelectorAll<HTMLElement>('article.note[data-anchor-kind="note"]')]
  const focusedNote = () => (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('article.note[data-anchor-kind="note"]') ?? null
  const activeColumn = () => {
    const cols = columns()
    const el = document.activeElement as HTMLElement | null
    const own = el?.closest<HTMLElement>('section[data-anchor-kind="column"]')
    return own ? cols.indexOf(own) : cols.findIndex((c) => c.contains(document.activeElement))
  }
  function focusEl(el: HTMLElement | null | undefined) {
    if (!el) return
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'nearest', behavior: settings.s.motion === 'reduced' ? 'auto' : 'smooth' })
  }
  function focusColumn(index: number, noteIndex = 0) {
    const col = columns()[index]
    if (!col) return
    const notes = notesOf(col)
    focusEl(notes[Math.min(noteIndex, notes.length - 1)] ?? col)
  }
  function moveNote(step: 1 | -1) {
    const cols = columns()
    const note = focusedNote()
    const ci = Math.max(0, activeColumn())
    const col = cols[ci]
    if (!col) return
    const notes = notesOf(col)
    const at = note ? notes.indexOf(note) : -1
    focusEl(notes[Math.min(notes.length - 1, Math.max(0, at + step))] ?? col)
  }
  function moveColumn(step: 1 | -1) {
    const ci = activeColumn()
    const note = focusedNote()
    const col = columns()[ci]
    const at = note && col ? notesOf(col).indexOf(note) : 0
    focusColumn(Math.min(columns().length - 1, Math.max(0, (ci < 0 ? 0 : ci) + step)), at)
  }
  const focusedNoteId = () => focusedNote()?.dataset.anchor ?? null

  const actions: Record<ShortcutId, (digit?: number) => void> = {
    'column.focus': (d) => focusColumn((d ?? 1) - 1),
    'note.prev': () => moveNote(-1),
    'note.next': () => moveNote(1),
    'column.prev': () => moveColumn(-1),
    'column.next': () => moveColumn(1),
    'note.edit': () => { const id = focusedNoteId(); if (id) ui.editNoteId = id },
    'focus.clear': () => (document.activeElement as HTMLElement | null)?.blur(),
    'note.new': () => {
      const col = columns()[Math.max(0, activeColumn())]
      const area = col?.querySelector<HTMLTextAreaElement>('textarea:not(:disabled)')
      area?.focus()
      area?.scrollIntoView({ block: 'nearest' })
    },
    'drafts.publish': () => { if (drafts.count) publish(drafts.drafts.map((d) => d.id)) },
    'filter.open': () => { ui.filterOpen = true },
    'vote.add': () => { const id = focusedNoteId(); if (id) board.commands.addVote('note', id) },
    'vote.remove': () => { const id = focusedNoteId(); if (id) board.commands.removeVote('note', id) },
    'note.color': () => { const id = focusedNoteId(); if (id) ui.openPalette(id) },
    'presenter.toggle': () => { ui.presenter = !ui.presenter },
    'share.open': () => ui.open('share'),
    'export.open': () => ui.open('export'),
    'help.open': () => ui.open('help'),
    'timer.toggle': () => {
      const a = board.snapshot?.agenda
      if (a && a.current >= 0 && a.current < a.phases.length) {
        if (a.pausedAt === null) board.commands.pauseAgenda(); else board.commands.startAgenda()
      } else if (a && a.current < 0) board.commands.startAgenda()
      else if (board.timer?.running) board.commands.pauseTimer()
      else board.commands.startTimer()
    },
    'phase.next': () => board.commands.nextPhase(),
    'phase.prev': () => board.commands.previousPhase(),
    'ranking.open': () => ui.open('ranking'),
    'floor.give': () => document.querySelector<HTMLElement>('[data-testid="btn-participants"]')?.click(),
  }

  function onKey(e: KeyboardEvent) {
    const owner = keyboardOwner(e.target)
    const match = resolveShortcut({
      key: e.key, code: e.code, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, shiftKey: e.shiftKey, isComposing: e.isComposing,
      altGraph: e.getModifierState('AltGraph'),
    }, {
      enabled: settings.s.shortcuts,
      ...owner,
      dialogOpen: ui.dialog !== null || !!document.querySelector('dialog[open]'),
      facilitator: board.access.canSteer,
    })
    if (!match) return
    e.preventDefault()
    actions[match.id](match.digit)
  }
  onMounted(() => document.addEventListener('keydown', onKey))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
}
