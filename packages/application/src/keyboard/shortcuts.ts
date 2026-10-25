/**
 * Single-key shortcuts (change keyboard-shortcuts). Pure: the web layer feeds it key events plus
 * a small context and runs the action it names. The same table drives the help overlay.
 */
export type ShortcutId =
  | 'column.focus' | 'note.new' | 'note.prev' | 'note.next' | 'column.prev' | 'column.next' | 'note.edit' | 'focus.clear'
  | 'drafts.publish' | 'filter.open' | 'vote.add' | 'vote.remove' | 'note.color'
  | 'presenter.toggle' | 'share.open' | 'export.open' | 'help.open'
  | 'timer.toggle' | 'phase.next' | 'phase.prev' | 'ranking.open' | 'floor.give'

export type ShortcutGroup = 'navigate' | 'write' | 'board' | 'facilitate'

export interface ShortcutDef {
  id: ShortcutId
  /** Exact `KeyboardEvent.key` values that trigger it (case matters: "P" is Shift+p). */
  keys: readonly string[]
  group: ShortcutGroup
  /** Only facilitators (they steer the board). */
  facilitator?: boolean
  /** Ignored while a button, link or field has focus, because the key activates it natively (Space, Enter). */
  nativeKey?: boolean
  /** i18n key of the description in the help overlay. */
  label: string
  /** Text shown for the key in the overlay. */
  display: string
}

export const SHORTCUTS: readonly ShortcutDef[] = [
  { id: 'column.focus', keys: ['1', '2', '3', '4', '5', '6', '7', '8'], group: 'navigate', label: 'kbd.column.focus', display: '1 - 8' },
  { id: 'note.prev', keys: ['ArrowUp'], group: 'navigate', label: 'kbd.note.prev', display: 'Up' },
  { id: 'note.next', keys: ['ArrowDown'], group: 'navigate', label: 'kbd.note.next', display: 'Down' },
  { id: 'column.prev', keys: ['ArrowLeft'], group: 'navigate', label: 'kbd.column.prev', display: 'Left' },
  { id: 'column.next', keys: ['ArrowRight'], group: 'navigate', label: 'kbd.column.next', display: 'Right' },
  { id: 'note.edit', keys: ['Enter'], group: 'navigate', nativeKey: true, label: 'kbd.note.edit', display: 'Enter' },
  { id: 'focus.clear', keys: ['Escape'], group: 'navigate', label: 'kbd.focus.clear', display: 'Esc' },
  { id: 'note.new', keys: ['n'], group: 'write', label: 'kbd.note.new', display: 'n' },
  { id: 'drafts.publish', keys: ['p'], group: 'write', label: 'kbd.drafts.publish', display: 'p' },
  { id: 'vote.add', keys: ['v'], group: 'write', label: 'kbd.vote.add', display: 'v' },
  { id: 'vote.remove', keys: ['V'], group: 'write', label: 'kbd.vote.remove', display: 'Shift+v' },
  { id: 'note.color', keys: ['c'], group: 'write', label: 'kbd.note.color', display: 'c' },
  { id: 'filter.open', keys: ['/'], group: 'board', label: 'kbd.filter.open', display: '/' },
  { id: 'presenter.toggle', keys: ['P'], group: 'board', label: 'kbd.presenter.toggle', display: 'Shift+p' },
  { id: 'share.open', keys: ['s'], group: 'board', label: 'kbd.share.open', display: 's' },
  { id: 'export.open', keys: ['e'], group: 'board', label: 'kbd.export.open', display: 'e' },
  { id: 'help.open', keys: ['?'], group: 'board', label: 'kbd.help.open', display: '?' },
  { id: 'timer.toggle', keys: [' '], group: 'facilitate', facilitator: true, nativeKey: true, label: 'kbd.timer.toggle', display: 'Space' },
  { id: 'phase.next', keys: [']'], group: 'facilitate', facilitator: true, label: 'kbd.phase.next', display: ']' },
  { id: 'phase.prev', keys: ['['], group: 'facilitate', facilitator: true, label: 'kbd.phase.prev', display: '[' },
  { id: 'ranking.open', keys: ['r'], group: 'facilitate', facilitator: true, label: 'kbd.ranking.open', display: 'r' },
  { id: 'floor.give', keys: ['t'], group: 'facilitate', facilitator: true, label: 'kbd.floor.give', display: 't' },
]

export interface KeyInput {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  isComposing?: boolean
}

export interface KeyContext {
  /** The profile switch. */
  enabled: boolean
  /** A field, textarea or editable region has focus. */
  typing: boolean
  /** A button, link, select or similar has focus (it owns Space and Enter). */
  onControl: boolean
  /** A dialog or the filter field owns the keyboard. */
  dialogOpen: boolean
  facilitator: boolean
}

export interface ShortcutMatch { id: ShortcutId; /** 1..8 for column.focus. */ digit?: number }

const BY_KEY = new Map<string, ShortcutDef>(SHORTCUTS.flatMap((d) => d.keys.map((k) => [k, d] as const)))

/**
 * The shortcut a key press triggers, or null. Never matches while typing, in dialogs, with
 * Ctrl, Cmd or Alt held (browser and screen-reader shortcuts stay theirs), or when switched off.
 */
export function resolveShortcut(input: KeyInput, ctx: KeyContext): ShortcutMatch | null {
  if (!ctx.enabled || ctx.typing || ctx.dialogOpen || input.isComposing) return null
  if (input.ctrlKey || input.metaKey || input.altKey) return null
  const def = BY_KEY.get(input.key)
  if (!def) return null
  if (def.facilitator && !ctx.facilitator) return null
  if (def.nativeKey && ctx.onControl) return null
  return def.id === 'column.focus' ? { id: def.id, digit: Number(input.key) } : { id: def.id }
}
