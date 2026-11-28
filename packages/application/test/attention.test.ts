import type { Snapshot } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import {
  ATTENTION_CATEGORIES, type AttentionCategory, type AttentionEvent, type AttentionPolicy, attentionBetween, attentionCount, attentionFor,
  attentionFromPresence, attentionFromTimer, attentionReduce, defaultAttentionEnabled, digestCounts, faviconLabel, initialAttention,
} from '../src'

const policy = (over: Partial<AttentionPolicy> = {}): AttentionPolicy => ({ enabled: defaultAttentionEnabled(), dnd: false, privacy: 'private', ...over })
const ctx = (over = {}) => ({ focused: false, now: 100_000, notifiedAt: [] as number[], ...over })
const ev = (category: AttentionCategory, over: Partial<AttentionEvent> = {}): AttentionEvent => ({ category, at: 1, ...over })

describe('categories', () => {
  it('has the seven important ones on and the four quiet ones off by default', () => {
    const d = defaultAttentionEnabled()
    expect(ATTENTION_CATEGORIES.filter((c) => c.importance === 'important').map((c) => c.id).sort()).toEqual(['action', 'callback', 'mention', 'phase', 'timer', 'turn', 'voting'])
    for (const c of ATTENTION_CATEGORIES) expect(d[c.id]).toBe(c.importance === 'important')
  })
})

describe('attentionFor', () => {
  it('raises every enabled category when the tab is hidden', () => {
    for (const c of ATTENTION_CATEGORIES.filter((x) => x.default)) {
      const r = attentionFor([ev(c.id)], policy(), ctx())
      expect(r.raised).toHaveLength(1)
      expect(r.notifications[0]?.tag).toBe(`retroboard-${c.id}`)
    }
  })

  it('raises nothing while the tab is focused', () => {
    expect(attentionFor([ev('phase')], policy(), ctx({ focused: true }))).toEqual({ raised: [], kept: [], notifications: [] })
  })

  it('does not raise a new idea by default but keeps it for the digest, and raises it once turned on', () => {
    const r = attentionFor([ev('idea')], policy(), ctx())
    expect(r.raised).toEqual([])
    expect(r.kept).toHaveLength(1)
    expect(attentionFor([ev('idea')], policy({ enabled: { ...defaultAttentionEnabled(), idea: true } }), ctx()).raised).toHaveLength(1)
  })

  it('drops an important category the person turned off', () => {
    const r = attentionFor([ev('phase')], policy({ enabled: { ...defaultAttentionEnabled(), phase: false } }), ctx())
    expect(r).toEqual({ raised: [], kept: [], notifications: [] })
  })

  it('do not disturb keeps everything for the digest and shows nothing', () => {
    const r = attentionFor([ev('voting'), ev('idea')], policy({ dnd: true }), ctx())
    expect(r.raised).toEqual([])
    expect(r.notifications).toEqual([])
    expect(r.kept).toHaveLength(2)
  })

  it('groups a burst of ideas into one notification with a count', () => {
    const r = attentionFor([ev('idea'), ev('idea'), ev('idea')], policy({ enabled: { ...defaultAttentionEnabled(), idea: true } }), ctx())
    expect(r.notifications).toHaveLength(1)
    expect(r.notifications[0]).toMatchObject({ category: 'idea', count: 3 })
  })

  it('rate limits: 5 s apart and 6 per minute, the favicon still counts', () => {
    expect(attentionFor([ev('phase')], policy(), ctx({ notifiedAt: [96_000] }))).toMatchObject({ notifications: [], raised: [{}] })
    expect(attentionFor([ev('phase')], policy(), ctx({ notifiedAt: [94_000] })).notifications).toHaveLength(1)
    const six = [50_000, 60_000, 70_000, 80_000, 90_000, 94_000]
    expect(attentionFor([ev('phase')], policy(), ctx({ notifiedAt: six })).notifications).toEqual([])
    expect(attentionFor([ev('phase')], policy(), ctx({ notifiedAt: [10_000] })).notifications).toHaveLength(1)
  })

  it('default privacy never carries idea text or names; names and full add them step by step', () => {
    const e = ev('idea', { who: 'Alice', text: 'secret idea', column: 'Start' })
    const priv = attentionFor([e], policy({ enabled: { ...defaultAttentionEnabled(), idea: true } }), ctx()).notifications[0]!
    expect(priv.who).toBeUndefined()
    expect(priv.text).toBeUndefined()
    expect(priv.column).toBe('Start')
    const names = attentionFor([e], policy({ privacy: 'names', enabled: { ...defaultAttentionEnabled(), idea: true } }), ctx()).notifications[0]!
    expect(names.who).toBe('Alice')
    expect(names.text).toBeUndefined()
    const full = attentionFor([e], policy({ privacy: 'full', enabled: { ...defaultAttentionEnabled(), idea: true } }), ctx()).notifications[0]!
    expect(full).toMatchObject({ who: 'Alice', text: 'secret idea' })
  })
})

describe('attention state', () => {
  const raised = [ev('phase')]
  it('walks visible, hidden, items, digest, visible', () => {
    let s = initialAttention()
    s = attentionReduce(s, { type: 'hidden' })
    expect(s.phase).toBe('hiddenIdle')
    s = attentionReduce(s, { type: 'event', raised, kept: [] })
    expect(s.phase).toBe('hiddenWithItems')
    s = attentionReduce(s, { type: 'event', raised, kept: [] })
    expect(attentionCount(s)).toBe(2)
    s = attentionReduce(s, { type: 'visible' })
    expect(s.phase).toBe('visibleWithDigest')
    expect(digestCounts(s)).toEqual([{ category: 'phase', count: 2 }])
    s = attentionReduce(s, { type: 'dismiss' })
    expect(s).toMatchObject({ phase: 'visible', items: [], kept: [] })
  })

  it('shows no digest when nothing happened, and ignores events while visible', () => {
    let s = attentionReduce(attentionReduce(initialAttention(), { type: 'hidden' }), { type: 'visible' })
    expect(s.phase).toBe('visible')
    s = attentionReduce(s, { type: 'event', raised, kept: [] })
    expect(s.items).toEqual([])
  })

  it('a digest can hold only kept items (do not disturb)', () => {
    const s = [{ type: 'hidden' }, { type: 'event', raised: [], kept: [ev('voting')] }, { type: 'visible' }].reduce((a, sig) => attentionReduce(a, sig as never), initialAttention())
    expect(s.phase).toBe('visibleWithDigest')
    expect(attentionCount(s)).toBe(0)
  })

  it('dismiss while hidden clears the count; dnd is a flag; the favicon caps at 9+', () => {
    let s = attentionReduce(attentionReduce(initialAttention(false), { type: 'event', raised, kept: [] }), { type: 'dismiss' })
    expect(s).toMatchObject({ phase: 'hiddenIdle', items: [] })
    s = attentionReduce(s, { type: 'dnd', on: true })
    expect(s.dnd).toBe(true)
    expect([faviconLabel(3), faviconLabel(9), faviconLabel(11)]).toEqual(['3', '9', '9+'])
  })
})

describe('attentionBetween', () => {
  const snap = (over: Record<string, unknown> = {}) => ({
    settings: { votingClosed: false }, agenda: null, reveal: null, talk: { active: null, totals: {} }, actions: [], chat: [], notes: [], columns: [{ id: 'c1', title: 'Start' }], presenting: null,
    ...over,
  }) as unknown as Snapshot
  const me = { cid: 'me', name: 'Alice', columnIds: ['c1'] }
  const cats = (a: Snapshot, b: Snapshot) => attentionBetween(a, b, 5, me).map((e) => e.category)

  it('says nothing on the baseline or when nothing changed', () => {
    expect(attentionBetween(null, snap(), 1, me)).toEqual([])
    expect(cats(snap(), snap())).toEqual([])
  })

  it('maps a phase change, voting opening, a reveal and the end of the agenda', () => {
    const ag = (current: number) => ({ phases: [{ id: 'p0', kind: 'write', plannedMs: 1 }, { id: 'p1', kind: 'vote', plannedMs: 1 }], current, startedAt: 0, pausedAt: null, rules: true, autoPublish: false })
    expect(cats(snap({ agenda: ag(0) }), snap({ agenda: ag(1) }))).toEqual(['phase'])
    expect(cats(snap({ settings: { votingClosed: true } }), snap())).toEqual(['voting'])
    expect(cats(snap(), snap({ reveal: { endsAt: 9 } }))).toEqual(['callback'])
  })

  it('maps my turn to talk but not another speaker', () => {
    const turn = (speaker: string) => snap({ talk: { active: { speaker, label: null, startedAt: 1, budgetMs: 1 }, totals: {} } })
    expect(cats(snap(), turn('me'))).toEqual(['turn'])
    expect(cats(snap(), turn('bob'))).toEqual([])
    expect(cats(turn('me'), turn('me'))).toEqual([])
  })

  it('maps an action assigned to me, not to somebody else', () => {
    const act = (owner: string) => snap({ actions: [{ id: 'a1', text: 'Fix', owner }] })
    expect(cats(snap(), act('Alice'))).toEqual(['action'])
    expect(cats(snap(), act('Bob'))).toEqual([])
  })

  it('maps a chat reply mentioning me as important and any other message as quiet; my own are ignored', () => {
    const msg = (text: string, mine = false) => snap({ chat: [{ id: 'm1', name: 'Bob', mine, at: 1, text }] })
    expect(cats(snap(), msg('thanks @alice'))).toEqual(['mention'])
    expect(cats(snap(), msg('hello'))).toEqual(['chat'])
    expect(cats(snap(), msg('hello', true))).toEqual([])
  })

  it('maps a new idea in my column, not mine and not elsewhere', () => {
    const note = (over = {}) => snap({ notes: [{ id: 'n1', columnId: 'c1', text: 'x', author: 'Bob', mine: false, ...over }] })
    expect(attentionBetween(snap(), note(), 5, me)[0]).toMatchObject({ category: 'idea', column: 'Start', who: 'Bob' })
    expect(cats(snap(), note({ mine: true }))).toEqual([])
    expect(cats(snap(), note({ columnId: 'c2' }))).toEqual([])
  })

  it('maps a presenter that started, presence and timer events', () => {
    expect(cats(snap(), snap({ presenting: { name: 'Bob', mine: false, at: 3 } }))).toEqual(['presenter'])
    expect(cats(snap(), snap({ presenting: { name: 'Me', mine: true, at: 3 } }))).toEqual([])
    expect(attentionFromPresence([], [{ name: 'Bob', me: false, key: 'b' }], 2)).toEqual([{ category: 'presence', at: 2, who: 'Bob' }])
    expect(attentionFromTimer(['warning', 'ended'], 3).map((e) => e.category)).toEqual(['timer', 'timer'])
  })
})
