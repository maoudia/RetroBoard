import { describe, expect, it } from 'vitest'
import { type KeyContext, type KeyInput, resolveShortcut, SHORTCUTS } from '../src'

const K = (key: string, over: Partial<KeyInput> = {}): KeyInput => ({ key, ctrlKey: false, metaKey: false, altKey: false, ...over })
const ctx = (over: Partial<KeyContext> = {}): KeyContext => ({ enabled: true, typing: false, onControl: false, dialogOpen: false, facilitator: false, ...over })

describe('the shortcut table, exactly', () => {
  const row = (id: string, keys: string[], group: string, label: string, display: string, extra: object = {}) => ({ id, keys, group, label, display, ...extra })
  it('lists every shortcut with its keys, group, label and display', () => {
    expect(SHORTCUTS.map((s) => ({ ...s }))).toStrictEqual([
      row('column.focus', ['1', '2', '3', '4', '5', '6', '7', '8'], 'navigate', 'kbd.column.focus', '1 - 8'),
      row('note.prev', ['ArrowUp'], 'navigate', 'kbd.note.prev', 'Up'),
      row('note.next', ['ArrowDown'], 'navigate', 'kbd.note.next', 'Down'),
      row('column.prev', ['ArrowLeft'], 'navigate', 'kbd.column.prev', 'Left'),
      row('column.next', ['ArrowRight'], 'navigate', 'kbd.column.next', 'Right'),
      row('note.edit', ['Enter'], 'navigate', 'kbd.note.edit', 'Enter', { nativeKey: true }),
      row('focus.clear', ['Escape'], 'navigate', 'kbd.focus.clear', 'Esc'),
      row('note.new', ['n'], 'write', 'kbd.note.new', 'n'),
      row('drafts.publish', ['p'], 'write', 'kbd.drafts.publish', 'p'),
      row('vote.add', ['v'], 'write', 'kbd.vote.add', 'v'),
      row('vote.remove', ['V'], 'write', 'kbd.vote.remove', 'Shift+v'),
      row('note.color', ['c'], 'write', 'kbd.note.color', 'c'),
      row('filter.open', ['/'], 'board', 'kbd.filter.open', '/'),
      row('presenter.toggle', ['P'], 'board', 'kbd.presenter.toggle', 'Shift+p'),
      row('writing.toggle', ['w'], 'board', 'kbd.writing.toggle', 'w'),
      row('zoom.in', ['+', '='], 'board', 'kbd.zoom.in', '+'),
      row('zoom.out', ['-'], 'board', 'kbd.zoom.out', '-'),
      row('zoom.reset', ['0'], 'board', 'kbd.zoom.reset', '0'),
      row('density.cycle', ['d'], 'board', 'kbd.density.cycle', 'd'),
      row('share.open', ['s'], 'board', 'kbd.share.open', 's'),
      row('export.open', ['e'], 'board', 'kbd.export.open', 'e'),
      row('help.open', ['?'], 'board', 'kbd.help.open', '?'),
      row('timer.toggle', [' '], 'facilitate', 'kbd.timer.toggle', 'Space', { facilitator: true, nativeKey: true }),
      row('phase.next', [']'], 'facilitate', 'kbd.phase.next', ']', { facilitator: true }),
      row('phase.prev', ['['], 'facilitate', 'kbd.phase.prev', '[', { facilitator: true }),
      row('ranking.open', ['r'], 'facilitate', 'kbd.ranking.open', 'r', { facilitator: true }),
      row('floor.give', ['t'], 'facilitate', 'kbd.floor.give', 't', { facilitator: true }),
    ])
  })
})

describe('the physical digit keys, exactly', () => {
  it('reads Digit1..8 and Numpad1..8 when the key itself is not a digit', () => {
    for (const code of ['Digit1', 'Digit8', 'Numpad1', 'Numpad8']) expect(resolveShortcut(K('&', { code }), ctx()), code).toEqual({ id: 'column.focus', digit: Number(code.slice(-1)) })
    for (const code of ['Digit0', 'Digit9', 'xDigit3', 'Digit3x', 'Digit', 'KeyA', '', undefined]) expect(resolveShortcut(K('&', { code }), ctx()), String(code)).toBeNull()
  })
  it('does not read it with Shift or AltGr held', () => {
    expect(resolveShortcut(K('&', { code: 'Digit1', shiftKey: true }), ctx())).toBeNull()
    expect(resolveShortcut(K('&', { code: 'Digit1', altGraph: true, ctrlKey: true, altKey: true }), ctx())).toBeNull()
  })
  it('takes the typed digit first', () => {
    expect(resolveShortcut(K('3', { code: 'Digit5' }), ctx())).toEqual({ id: 'column.focus', digit: 3 })
  })
})
