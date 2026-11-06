import { alice, bob, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { CHAT_MAX_MESSAGES, createBoard, DEFAULT_COLUMN_ICON, DEFAULT_THEME_ID, DISPLAY_SCALES, type Outcome } from '../src'
import { clean } from '../src/shared/outcome'

const CLEAN = { meta: false, notes: [], groups: [], actions: [], wipe: false }
const ok = (o: Outcome) => { if (!o.ok) throw new Error(o.error); return o }

describe('what a command reports as changed, exactly', () => {
  it('a clean outcome starts with nothing changed, and every list is its own', () => {
    expect(clean()).toEqual(CLEAN)
    expect(clean().notes).not.toBe(clean().notes)
  })

  describe('presenting', () => {
    it('says who started it, under their name only when they show it, and marks the room as changed', () => {
      const h = harness()
      const named = ok(h.run({ t: 'presenter.set', on: true }, alice))
      expect(named.dirty).toEqual({ ...CLEAN, meta: true })
      expect(named.state.presenting).toEqual({ cid: alice.cid, name: 'Alice', at: h.now })
      const anonymous = ok(harness().run({ t: 'presenter.set', on: true }, bob))
      expect(anonymous.state.presenting).toMatchObject({ cid: bob.cid, name: null })
    })

    it('is switched off by the one who started it, and by nobody else', () => {
      const h = harness()
      h.run({ t: 'presenter.set', on: true }, alice)
      const late = ok(h.run({ t: 'presenter.set', on: false }, bob))
      expect(late.dirty).toEqual(CLEAN)
      expect(late.state.presenting).toMatchObject({ cid: alice.cid })
      const off = ok(h.run({ t: 'presenter.set', on: false }, alice))
      expect(off.dirty).toEqual({ ...CLEAN, meta: true })
      expect(off.state.presenting).toBeNull()
      expect(ok(h.run({ t: 'presenter.set', on: false }, alice)).dirty).toEqual(CLEAN)
    })
  })

  describe('column turns', () => {
    it('open one column, which marks the room as changed, and say nothing when it is already the open one', () => {
      const h = harness()
      const first = ok(h.run({ t: 'turn.set', columnId: h.col(0) }))
      expect(first.dirty).toEqual({ ...CLEAN, meta: true })
      expect(first.state.turn).toBe(h.col(0))
      const again = ok(h.run({ t: 'turn.set', columnId: h.col(0) }))
      expect(again.dirty).toEqual(CLEAN)
      const closed = ok(h.run({ t: 'turn.set', columnId: null }))
      expect(closed.dirty).toEqual({ ...CLEAN, meta: true })
      expect(closed.state.turn).toBeNull()
      expect(ok(h.run({ t: 'turn.set', columnId: null })).dirty).toEqual(CLEAN)
    })

    it('refuse a column that does not exist or is hidden', () => {
      const h = harness()
      expect(h.run({ t: 'turn.set', columnId: 'nopeNope' })).toEqual({ ok: false, error: 'not-found' })
      h.run({ t: 'column.hide', id: h.col(1) })
      expect(h.run({ t: 'turn.set', columnId: h.col(1) })).toEqual({ ok: false, error: 'not-found' })
      expect(h.run({ t: 'turn.set', columnId: h.col(0) }).ok).toBe(true)
    })
  })

  describe('chat', () => {
    it('adds a line and marks the room as changed, keeping the last lines only', () => {
      const h = harness()
      const first = ok(h.run({ t: 'chat.post', text: ' hello ' }, alice))
      expect(first.dirty).toEqual({ ...CLEAN, meta: true })
      expect(first.state.chat).toEqual([{ id: expect.any(String), cid: alice.cid, name: 'Alice', at: h.now, text: 'hello' }])
      for (let i = 0; i < CHAT_MAX_MESSAGES + 5; i++) h.run({ t: 'chat.post', text: `line ${i}` }, bob)
      expect(h.state.chat).toHaveLength(CHAT_MAX_MESSAGES)
      expect(h.state.chat!.at(-1)!.text).toBe(`line ${CHAT_MAX_MESSAGES + 4}`)
      expect(h.state.chat![0]!.name).toBeNull()
    })

    it('is cleared, which marks the room as changed, and clearing nothing changes nothing', () => {
      const h = harness()
      const before = h.state
      const none = ok(h.run({ t: 'chat.clear' }))
      expect(none.dirty).toEqual(CLEAN)
      expect(none.state).toBe(before)
      h.run({ t: 'chat.post', text: 'x' })
      const cleared = ok(h.run({ t: 'chat.clear' }))
      expect(cleared.dirty).toEqual({ ...CLEAN, meta: true })
      expect(cleared.state.chat).toEqual([])
      expect(ok(h.run({ t: 'chat.clear' })).dirty).toEqual(CLEAN)
    })
  })

  describe('pins', () => {
    function withNotes() {
      const h = harness()
      h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
      h.run({ t: 'note.add', columnId: h.col(0), text: 'b' }, alice)
      h.run({ t: 'note.add', columnId: h.col(0), text: 'c' }, alice)
      const [a, b, c] = Object.keys(h.state.notes) as [string, string, string]
      return { h, a, b, c }
    }

    it('pin a note at the time of the pin, and unpin it, each time naming the note', () => {
      const { h, a } = withNotes()
      h.tick(5)
      const pinned = ok(h.run({ t: 'note.pin', id: a }))
      expect(pinned.dirty).toEqual({ ...CLEAN, notes: [a] })
      expect(pinned.state.notes[a]!.pinned).toBe(h.now)
      const pinnedAt = h.now
      h.tick(5)
      const again = ok(h.run({ t: 'note.pin', id: a }))
      expect(again.dirty).toEqual(CLEAN)
      expect(again.state.notes[a]!.pinned).toBe(pinnedAt)
      const unpinned = ok(h.run({ t: 'note.unpin', id: a }))
      expect(unpinned.dirty).toEqual({ ...CLEAN, notes: [a] })
      expect(unpinned.state.notes[a]!.pinned).toBeUndefined()
      expect(ok(h.run({ t: 'note.unpin', id: a })).dirty).toEqual(CLEAN)
    })

    it('pin a cluster, naming the cluster, and refuse a note inside one or one that does not exist', () => {
      const { h, a, b } = withNotes()
      h.run({ t: 'note.group', id: a, ontoId: b })
      const g = h.state.notes[a]!.groupId!
      const pinned = ok(h.run({ t: 'note.pin', id: g }))
      expect(pinned.dirty).toEqual({ ...CLEAN, groups: [g] })
      expect(pinned.state.groups[g]!.pinned).toBe(h.now)
      expect(ok(h.run({ t: 'note.pin', id: g })).dirty).toEqual(CLEAN)
      const unpinned = ok(h.run({ t: 'note.unpin', id: g }))
      expect(unpinned.dirty).toEqual({ ...CLEAN, groups: [g] })
      expect(h.run({ t: 'note.pin', id: a })).toEqual({ ok: false, error: 'invalid' })
      expect(h.run({ t: 'note.pin', id: 'nopeNope' })).toEqual({ ok: false, error: 'not-found' })
    })
  })

  describe('actions that lose their source', () => {
    it('lose the link when the note is deleted, each named once as changed', () => {
      const h = harness()
      h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
      const note = Object.keys(h.state.notes)[0]!
      h.run({ t: 'action.add', text: 'one', owner: '', sourceNote: note })
      h.run({ t: 'action.add', text: 'two', owner: '', sourceNote: note })
      h.run({ t: 'action.add', text: 'free', owner: '' })
      const [one, two, free] = Object.keys(h.state.actions) as [string, string, string]
      const out = ok(h.run({ t: 'note.delete', id: note }, alice))
      expect(out.dirty.actions).toEqual([one, two])
      expect(out.dirty.notes).toEqual([note])
      expect('sourceNote' in out.state.actions[one]!).toBe(false)
      expect('sourceNote' in out.state.actions[two]!).toBe(false)
      expect(out.state.actions[one]!.text).toBe('one')
      expect(out.state.actions[free]).toBe(h.state.actions[free])
    })

    it('lose the link when the cluster they came from is dissolved', () => {
      const h = harness()
      h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
      h.run({ t: 'note.add', columnId: h.col(0), text: 'b' }, alice)
      const [a, b] = Object.keys(h.state.notes) as [string, string]
      h.run({ t: 'note.group', id: a, ontoId: b })
      const g = h.state.notes[a]!.groupId!
      h.run({ t: 'action.add', text: 'x', owner: '', sourceNote: g })
      const id = Object.keys(h.state.actions)[0]!
      const out = ok(h.run({ t: 'group.dissolve', id: g }))
      expect(out.dirty.actions).toEqual([id])
      expect('sourceNote' in out.state.actions[id]!).toBe(false)
    })

    it('are left alone when their source is still there', () => {
      const h = harness()
      h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
      const note = Object.keys(h.state.notes)[0]!
      h.run({ t: 'action.add', text: 'x', owner: '', sourceNote: note })
      const out = ok(h.run({ t: 'note.color', id: note, color: 2 }, alice))
      expect(out.dirty.actions).toEqual([])
    })
  })

  describe('defaults', () => {
    it('a new board is a Rétrospective on the studio theme with sparkles for a column without an icon', () => {
      expect(createBoard({ newId: () => 'x' }).settings.title).toBe('Rétrospective')
      expect(DEFAULT_THEME_ID).toBe('studio')
      expect(DEFAULT_COLUMN_ICON).toBe('sparkles')
      expect(DISPLAY_SCALES).toEqual(['small', 'normal', 'large'])
    })
  })
})
