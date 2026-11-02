import { describe, expect, it } from 'vitest'
import { alice, harness } from '@retroboard/testkit'
import { DEFAULT_TIMER_MS, LIMITS, NOTE_TEXT_MIN, TEMPLATES } from '@retroboard/domain'

type H = ReturnType<typeof harness>
const dirtyOf = (out: ReturnType<H['run']>) => (out.ok ? out.dirty : null)
const note = (h: H, text: string, col = 0) => { const o = h.run({ t: 'note.add', columnId: h.col(col), text }); return o.ok ? o.dirty.notes[0]! : '' }

describe('board.init', () => {
  it('sets the format, theme, title and options once, wipes nothing else and refuses a second init', () => {
    const h = harness()
    const out = h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'noel', title: 'Sprint 12', locale: 'en', openFacilitation: true, announceArrivals: false })
    expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: true })
    expect(h.state.settings).toMatchObject({ initialized: true, templateId: 'start-stop-continue', themeId: 'noel', title: 'Sprint 12', locale: 'en', openFacilitation: true, announceArrivals: false })
    const tpl = TEMPLATES.find((t) => t.id === 'start-stop-continue')!
    expect(h.state.columns).toHaveLength(tpl.columns.length)
    expect(h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'noel' })).toEqual({ ok: false, error: 'not-empty' })
  })

  it('keeps the defaults for what is not given and refuses an unknown format', () => {
    const h = harness()
    const title = h.state.settings.title
    expect(h.run({ t: 'board.init', templateId: 'ghost-format', themeId: 'studio' })).toEqual({ ok: false, error: 'not-found' })
    expect(h.state.settings.initialized).toBe(false)
    h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio' })
    expect(h.state.settings.title).toBe(title)
    expect('locale' in h.state.settings).toBe(false)
    expect(h.state.settings.openFacilitation).toBe(false)
    expect(h.state.settings.announceArrivals).toBeUndefined()
  })
})

describe('template.apply', () => {
  const other = TEMPLATES.find((t) => t.id !== 'start-stop-continue' && t.columns.length === 4) ?? TEMPLATES[1]!

  it('refuses an unknown format, and a board with notes unless a mode is given', () => {
    const h = harness()
    expect(h.run({ t: 'template.apply', templateId: 'ghost-format' })).toEqual({ ok: false, error: 'not-found' })
    note(h, 'keep me')
    expect(h.run({ t: 'template.apply', templateId: other.id })).toEqual({ ok: false, error: 'not-empty' })
    expect(Object.keys(h.state.notes)).toHaveLength(1)
  })

  it('wipe (mode or legacy flag) replaces the columns and empties the board', () => {
    for (const cmd of [{ mode: 'wipe' as const }, { wipe: true }]) {
      const h = harness()
      note(h, 'gone')
      const out = h.run({ t: 'template.apply', templateId: other.id, ...cmd })
      expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: true })
      expect(h.state.notes).toEqual({})
      expect(h.state.groups).toEqual({})
      expect(h.state.columns).toHaveLength(other.columns.length)
      expect(h.state.settings.templateId).toBe(other.id)
    }
  })

  it('an empty board takes a new format without any mode', () => {
    const h = harness()
    const out = h.run({ t: 'template.apply', templateId: other.id })
    expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: true })
    expect(h.state.settings.templateId).toBe(other.id)
  })

  it('migrate keeps the notes: column ids are reused by position and the extra old columns collapse into the last', () => {
    const h = harness()
    const oldIds = h.state.columns.map((c) => c.id)
    const a = note(h, 'in first', 0)
    const last = note(h, 'in last', oldIds.length - 1)
    h.run({ t: 'note.group', id: a, ontoId: note(h, 'in first too', 0) })
    const gid = h.state.notes[a]!.groupId!
    const two = TEMPLATES.find((t) => t.columns.length === 2)
    const out = h.run({ t: 'template.apply', templateId: (two ?? other).id, mode: 'migrate' })
    expect(dirtyOf(out)?.meta).toBe(true)
    expect(dirtyOf(out)?.wipe).toBe(false)
    const cols = h.state.columns.map((c) => c.id)
    expect(cols[0]).toBe(oldIds[0])
    expect(h.state.notes[a]!.columnId).toBe(cols[0])
    expect(h.state.groups[gid]!.columnId).toBe(cols[0])
    expect(cols).toContain(h.state.notes[last]!.columnId)
    if (two) {
      expect(h.state.notes[last]!.columnId).toBe(cols.at(-1))
      expect(dirtyOf(out)?.notes).toContain(last)
    }
    expect(Object.keys(h.state.notes)).toHaveLength(3)
    expect(h.state.settings.templateId).toBe((two ?? other).id)
  })

  it('migrate on an empty board is a plain replacement', () => {
    const h = harness()
    const out = h.run({ t: 'template.apply', templateId: other.id, mode: 'migrate' })
    expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: true })
  })
})

describe('settings.update', () => {
  it('changes only the given fields and caps the per-item votes at the vote limit', () => {
    const h = harness()
    const before = h.state.settings
    h.run({ t: 'settings.update', title: 'New title' })
    expect(h.state.settings).toEqual({ ...before, title: 'New title' })
    h.run({ t: 'settings.update', voteLimit: 6, maxVotesPerItem: 4 })
    expect(h.state.settings).toMatchObject({ voteLimit: 6, maxVotesPerItem: 4 })
    h.run({ t: 'settings.update', maxVotesPerItem: 9 })
    expect(h.state.settings.maxVotesPerItem).toBe(6)
    h.run({ t: 'settings.update', voteLimit: 2 })
    expect(h.state.settings).toMatchObject({ voteLimit: 2, maxVotesPerItem: 2 })
  })

  it('sets each option independently and reports meta only', () => {
    const h = harness()
    const out = h.run({ t: 'settings.update', votable: 'clusters', secretVoting: true, locked: true, browserAgentsAllowed: false, openFacilitation: true, actionMode: 'workflow', themeId: 'halloween', talkMode: 'ring', talkBudgetSec: 90, talkSelfStart: true, announceArrivals: false })
    expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: false, notes: [], groups: [] })
    expect(h.state.settings).toMatchObject({
      votable: 'clusters', secretVoting: true, locked: true, browserAgentsAllowed: false, openFacilitation: true, actionMode: 'workflow',
      themeId: 'halloween', talkMode: 'ring', talkBudgetMs: 90_000, talkSelfStart: true, announceArrivals: false,
    })
    h.run({ t: 'settings.update', title: 'Only title' })
    expect(h.state.settings).toMatchObject({ votable: 'clusters', secretVoting: true, locked: true, talkMode: 'ring', talkBudgetMs: 90_000 })
  })

  it('validates the note length: bounds are inclusive and a bad value changes nothing', () => {
    const h = harness()
    expect(h.run({ t: 'settings.update', noteMaxLength: NOTE_TEXT_MIN }).ok).toBe(true)
    expect(h.state.settings.noteMaxLength).toBe(NOTE_TEXT_MIN)
    expect(h.run({ t: 'settings.update', noteMaxLength: LIMITS.noteText }).ok).toBe(true)
    expect(h.state.settings.noteMaxLength).toBe(LIMITS.noteText)
    expect(h.run({ t: 'settings.update', noteMaxLength: 100.5 })).toEqual({ ok: false, error: 'invalid' })
  })
})

describe('shared timer', () => {
  it('start runs the remaining time (or the full length when it ran out) and is idempotent', () => {
    const h = harness()
    const out = h.run({ t: 'timer.start' })
    expect(dirtyOf(out)?.meta).toBe(true)
    expect(h.state.timer).toEqual({ running: true, length: DEFAULT_TIMER_MS, remaining: DEFAULT_TIMER_MS, endsAt: h.now + DEFAULT_TIMER_MS })
    h.tick(1000)
    const again = h.run({ t: 'timer.start' })
    expect(dirtyOf(again)?.meta).toBe(false)
    expect(h.state.timer.endsAt).toBe(h.now - 1000 + DEFAULT_TIMER_MS)
  })

  it('pause keeps the time left, never negative, and is a no-op when not running', () => {
    const h = harness()
    expect(dirtyOf(h.run({ t: 'timer.pause' }))?.meta).toBe(false)
    h.run({ t: 'timer.start' })
    h.tick(60_000)
    const out = h.run({ t: 'timer.pause' })
    expect(dirtyOf(out)?.meta).toBe(true)
    expect(h.state.timer).toMatchObject({ running: false, remaining: DEFAULT_TIMER_MS - 60_000, endsAt: 0 })
    h.run({ t: 'timer.start' })
    expect(h.state.timer.endsAt).toBe(h.now + DEFAULT_TIMER_MS - 60_000)
    h.tick(DEFAULT_TIMER_MS * 2)
    h.run({ t: 'timer.pause' })
    expect(h.state.timer.remaining).toBe(0)
    h.run({ t: 'timer.start' })
    expect(h.state.timer.remaining).toBe(DEFAULT_TIMER_MS)
  })

  it('reset stops the clock at the given minutes, or at the current length', () => {
    const h = harness()
    h.run({ t: 'timer.start' })
    h.run({ t: 'timer.reset', minutes: 10 })
    expect(h.state.timer).toEqual({ running: false, endsAt: 0, remaining: 600_000, length: 600_000 })
    h.run({ t: 'timer.start' })
    h.run({ t: 'timer.reset' })
    expect(h.state.timer).toEqual({ running: false, endsAt: 0, remaining: 600_000, length: 600_000 })
  })
})

describe('resets and destroy', () => {
  function filled() {
    const h = harness()
    const a = note(h, 'a', 0)
    const b = note(h, 'b', 0)
    const c = note(h, 'c', 1)
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'action.add', text: 'act', owner: '' })
    h.run({ t: 'vote.add', kind: 'note', id: c })
    h.run({ t: 'vote.add', kind: 'cluster', id: h.state.notes[a]!.groupId! })
    h.run({ t: 'timer.start' })
    return { h, a, b, c }
  }

  it('board.reset empties notes, clusters and actions and stops the clock, keeping the columns', () => {
    const { h } = filled()
    const cols = h.state.columns
    const out = h.run({ t: 'board.reset' })
    expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: true })
    expect(h.state.notes).toEqual({})
    expect(h.state.groups).toEqual({})
    expect(h.state.actions).toEqual({})
    expect(h.state.columns).toEqual(cols)
    expect(h.state.timer).toEqual({ running: false, endsAt: 0, remaining: DEFAULT_TIMER_MS, length: DEFAULT_TIMER_MS })
    expect(h.state.reveal).toBeNull()
    expect(h.state.roti).toEqual({})
  })

  it('column.reset empties one column only and refuses unknown ones', () => {
    const { h, a, b, c } = filled()
    expect(h.run({ t: 'column.reset', id: 'ghost-col' })).toEqual({ ok: false, error: 'not-found' })
    const out = h.run({ t: 'column.reset', id: h.col(0) })
    expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: true })
    expect(h.state.notes[a]).toBeUndefined()
    expect(h.state.notes[b]).toBeUndefined()
    expect(h.state.notes[c]).toBeDefined()
    expect(h.state.groups).toEqual({})
    expect(Object.keys(h.state.actions)).toHaveLength(1)
  })

  it('vote.reset clears every vote and reopens voting, notes stay', () => {
    const { h, a, c } = filled()
    h.run({ t: 'vote.close' })
    expect(h.state.settings.votingClosed).toBe(true)
    const out = h.run({ t: 'vote.reset' })
    expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: true })
    expect(h.state.settings.votingClosed).toBe(false)
    expect(h.state.notes[c]!.voters).toEqual([])
    expect(Object.values(h.state.groups).every((g) => g.voters.length === 0)).toBe(true)
    expect(h.state.notes[a]).toBeDefined()
  })

  it('board.destroy wipes the content, locks and marks the board destroyed', () => {
    const { h } = filled()
    const out = h.run({ t: 'board.destroy' })
    expect(dirtyOf(out)).toMatchObject({ meta: true, wipe: true })
    expect(h.state.notes).toEqual({})
    expect(h.state.actions).toEqual({})
    expect(h.state.agenda).toBeNull()
    expect(h.state.settings).toMatchObject({ locked: true, destroyed: true })
    expect(h.state.timer.running).toBe(false)
    expect(h.run({ t: 'note.add', columnId: h.col(0), text: 'late' }, alice).ok).toBe(false)
  })
})

describe('drafts.reveal', () => {
  it('sets the end of the countdown clamped between 3 and 30 seconds', () => {
    const h = harness()
    h.run({ t: 'drafts.reveal', seconds: 10 })
    expect(h.state.reveal).toEqual({ endsAt: h.now + 10_000 })
    h.run({ t: 'drafts.reveal' })
    expect(h.state.reveal).toEqual({ endsAt: h.now + 5_000 })
    h.run({ t: 'drafts.reveal', seconds: 3 })
    expect(h.state.reveal).toEqual({ endsAt: h.now + 3_000 })
    h.run({ t: 'drafts.reveal', seconds: 30 })
    expect(h.state.reveal).toEqual({ endsAt: h.now + 30_000 })
  })
})
