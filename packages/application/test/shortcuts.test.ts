import { describe, expect, it } from 'vitest'
import { resolveShortcut, SHORTCUTS, type KeyContext, type KeyInput } from '../src'

const ctx = (over: Partial<KeyContext> = {}): KeyContext => ({ enabled: true, typing: false, onControl: false, dialogOpen: false, facilitator: false, ...over })
const key = (k: string, over: Partial<KeyInput> = {}): KeyInput => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...over })

describe('resolveShortcut', () => {
  it('maps keys to actions, digits to columns', () => {
    expect(resolveShortcut(key('n'), ctx())).toEqual({ id: 'note.new' })
    expect(resolveShortcut(key('2'), ctx())).toEqual({ id: 'column.focus', digit: 2 })
    expect(resolveShortcut(key('P'), ctx())).toEqual({ id: 'presenter.toggle' })
    expect(resolveShortcut(key('p'), ctx())).toEqual({ id: 'drafts.publish' })
    expect(resolveShortcut(key('V'), ctx())).toEqual({ id: 'vote.remove' })
    expect(resolveShortcut(key('?'), ctx())).toEqual({ id: 'help.open' })
  })

  it('does nothing while typing, in a dialog, while composing text or when switched off', () => {
    expect(resolveShortcut(key('p'), ctx({ typing: true }))).toBeNull()
    expect(resolveShortcut(key('p'), ctx({ dialogOpen: true }))).toBeNull()
    expect(resolveShortcut(key('p', { isComposing: true }), ctx())).toBeNull()
    expect(resolveShortcut(key('n'), ctx({ enabled: false }))).toBeNull()
  })

  it('never overrides browser or screen-reader shortcuts', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'altKey'] as const) expect(resolveShortcut(key('p', { [mod]: true }), ctx())).toBeNull()
  })

  it('keeps facilitator keys for facilitators', () => {
    for (const k of [' ', ']', '[', 'r', 't']) {
      expect(resolveShortcut(key(k), ctx())).toBeNull()
      expect(resolveShortcut(key(k), ctx({ facilitator: true }))).not.toBeNull()
    }
  })

  it('leaves Space and Enter to a focused button or link', () => {
    expect(resolveShortcut(key(' '), ctx({ facilitator: true, onControl: true }))).toBeNull()
    expect(resolveShortcut(key('Enter'), ctx({ onControl: true }))).toBeNull()
    expect(resolveShortcut(key('Enter'), ctx())).toEqual({ id: 'note.edit' })
    expect(resolveShortcut(key('n'), ctx({ onControl: true }))).toEqual({ id: 'note.new' })
  })

  it('has one owner per key and a description for each shortcut', () => {
    const keys = SHORTCUTS.flatMap((s) => s.keys)
    expect(new Set(keys).size).toBe(keys.length)
    for (const s of SHORTCUTS) { expect(s.label).toMatch(/^kbd\./); expect(s.display).not.toBe('') }
  })
})

describe('keyboard layouts (change keyboard-shortcuts-v2, own handler kept: event.key for characters, event.code for digits)', () => {
  it('AZERTY: the unshifted top row focuses columns through the physical key', () => {
    expect(resolveShortcut(key('&', { code: 'Digit1' }), ctx())).toEqual({ id: 'column.focus', digit: 1 })
    expect(resolveShortcut(key('\u00e9', { code: 'Digit2' }), ctx())).toEqual({ id: 'column.focus', digit: 2 })
    expect(resolveShortcut(key('3', { code: 'Digit3', shiftKey: true }), ctx())).toEqual({ id: 'column.focus', digit: 3 })
    expect(resolveShortcut(key('&', { code: 'Digit1', shiftKey: true }), ctx())).toBeNull()
  })

  it('AZERTY: AltGr types "[" and "]" (reported as Ctrl+Alt on Windows) and still triggers the phase keys', () => {
    expect(resolveShortcut(key(']', { code: 'Minus', ctrlKey: true, altKey: true, altGraph: true }), ctx({ facilitator: true }))).toEqual({ id: 'phase.next' })
    expect(resolveShortcut(key('[', { code: 'Digit5', ctrlKey: true, altKey: true, altGraph: true }), ctx({ facilitator: true }))).toEqual({ id: 'phase.prev' })
    expect(resolveShortcut(key('ArrowRight', { ctrlKey: true, altKey: true, altGraph: true }), ctx())).toBeNull()
  })

  it('QWERTY keeps working and Ctrl/Alt alone still belong to the browser', () => {
    expect(resolveShortcut(key('1', { code: 'Digit1' }), ctx())).toEqual({ id: 'column.focus', digit: 1 })
    expect(resolveShortcut(key(']', { code: 'BracketRight' }), ctx({ facilitator: true }))).toEqual({ id: 'phase.next' })
    expect(resolveShortcut(key('1', { code: 'Digit1', ctrlKey: true }), ctx())).toBeNull()
    expect(resolveShortcut(key(']', { code: 'BracketRight', ctrlKey: true, altKey: true }), ctx({ facilitator: true }))).toBeNull()
  })
})
