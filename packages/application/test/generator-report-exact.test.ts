import type { AgendaState, Snapshot, SnapshotGroup, SnapshotNote } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import { buildReport, classes, DEFAULT_RANDOM, estimateBits, passphrase, passphraseBits, randomBits, randomPasscode, readablePasscode, strengthOf } from '../src'

const zero = () => 0
const last = (max: number) => max - 1
const seeded = (seed: number) => { let a = seed; return (max: number) => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max) } }

describe('random passcodes, exactly', () => {
  it('draws from the extended letters when asked, and one of them at least', () => {
    const ext = 'éèàùçñüöäß€£'
    for (let i = 1; i <= 20; i++) expect([...randomPasscode(seeded(i), { extended: true })].some((c) => ext.includes(c))).toBe(true)
    expect(classes({ ...DEFAULT_RANDOM, lower: false, upper: false, digits: false, extended: true })).toEqual([ext])
    expect([...randomPasscode(seeded(3))].some((c) => ext.includes(c))).toBe(false)
  })

  it('gives nothing, and asks nothing of the generator, without any class', () => {
    let calls = 0
    const rnd = () => (calls++, 0)
    expect(randomPasscode(rnd, { lower: false, upper: false, digits: false, symbols: false, extended: false })).toBe('')
    expect(calls).toBe(0)
  })

  it('puts one of each class first, then fills, then shuffles with a Fisher-Yates walk', () => {
    const ref = (xs: string[], rnd: (m: number) => number) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j]!, a[i]!] } return a.join('') }
    const sets = classes({ ...DEFAULT_RANDOM })
    const all = sets.join('')
    for (const make of [() => zero, () => last, () => seeded(7), () => seeded(8), () => seeded(9)]) {
      const rnd = make()
      const unshuffled = [...sets.map((s) => s[rnd(s.length)]!), ...Array.from({ length: 20 - sets.length }, () => all[rnd(all.length)]!)]
      expect(randomPasscode(make(), { length: 20 })).toBe(ref(unshuffled, rnd))
    }
    expect(randomPasscode(zero, { length: 8, everyClass: false })).toBe('a'.repeat(8))
    expect(randomPasscode(zero, { length: 8, everyClass: true, symbols: false })).toHaveLength(8)
    expect(new Set(randomPasscode(zero, { length: 8, everyClass: true })).size).toBeGreaterThan(1)
  })

  it('shuffles for real', () => {
    const firsts = Array.from({ length: 40 }, (_, i) => randomPasscode(seeded(i + 1), { length: 12 })[0]!)
    expect(firsts.some((c) => !/[a-z]/.test(c))).toBe(true)
    for (let i = 1; i <= 200; i++) expect(randomPasscode(seeded(i), { length: 12 }), String(i)).toHaveLength(12)
  })

  it('estimates bits from the pool: none without classes', () => {
    expect(randomBits({ lower: false, upper: false, digits: false })).toBe(0)
    expect(randomBits({ length: 10, lower: false, upper: false, digits: true, excludeLookalikes: false })).toBe(Math.round(10 * Math.log2(10)))
    expect(randomBits({ length: 10, lower: false, upper: false, digits: true, excludeLookalikes: true })).toBe(Math.round(10 * Math.log2(5)))
    expect(randomBits()).toBe(Math.round(20 * Math.log2(classes(DEFAULT_RANDOM).join('').length)))
  })
})

describe('passphrases and readable codes, exactly', () => {
  it('capitalises the first letter of each word, three syllables each, 2 to 10 words', () => {
    expect(passphrase(zero, { words: 3, capitalize: true })).toBe('Babababa-Babababa-Babababa'.replace(/babababa/gi, (m) => m) ? 'Babababa-Babababa-Babababa'.replaceAll('Babababa', 'Bababa') : '')
    expect(passphrase(zero, { words: 2, separator: '.' })).toBe('bababa.bababa')
    expect(passphrase(zero, { words: 0 }).split('-')).toHaveLength(2)
    expect(passphrase(zero, { words: 99 }).split('-')).toHaveLength(10)
    expect(passphraseBits({ words: 4 })).toBe(Math.round(4 * 3 * Math.log2(16 * 5)))
    expect(passphraseBits()).toBe(Math.round(4 * 3 * Math.log2(80)))
  })
  it('places the digit and the capital at two different places', () => {
    for (let i = 1; i <= 60; i++) {
      const p = readablePasscode(seeded(i)).replaceAll('-', '')
      expect(p.match(/[0-9]/g)).toHaveLength(1)
      expect(p.match(/[A-Z]/g)).toHaveLength(1)
      expect(p).toHaveLength(18)
    }
  })
})

describe('strength, exactly', () => {
  it('weighs the character classes, and repeated characters for a third', () => {
    expect(estimateBits('')).toBe(0)
    expect(estimateBits('abc')).toBe(Math.round(Math.log2(26) * 3))
    expect(estimateBits('ABC')).toBe(Math.round(Math.log2(26) * 3))
    expect(estimateBits('123')).toBe(Math.round(Math.log2(10) * 3))
    expect(estimateBits('!?-')).toBe(Math.round(Math.log2(28) * 3))
    expect(estimateBits('aA')).toBe(Math.round(Math.log2(52) * 2))
    expect(estimateBits('a1')).toBe(Math.round(Math.log2(36) * 2))
    expect(estimateBits('a!')).toBe(Math.round(Math.log2(54) * 2))
    expect(estimateBits('aA1!')).toBe(Math.round(Math.log2(90) * 4))
    expect(estimateBits('aaaa')).toBe(Math.round(Math.log2(26) * (1 + 3 * 0.3)))
    expect(estimateBits('é')).toBe(Math.round(Math.log2(28)))
  })
  it('names the strength at the exact limits', () => {
    expect([39, 40, 59, 60, 79, 80].map(strengthOf)).toEqual(['weak', 'fair', 'fair', 'good', 'good', 'strong'])
  })
})

describe('the report, exactly', () => {
  const note = (id: string, over: Partial<SnapshotNote> = {}): SnapshotNote => ({
    id, columnId: 'c1', text: id, color: 0, author: null, groupId: null, votes: 0, voted: false, myVotes: 0, votable: true, mine: false, createdAt: 0, ...over,
  })
  const group = (id: string, over: Partial<SnapshotGroup> = {}): SnapshotGroup => ({ id, columnId: 'c1', title: null, votes: 0, myVotes: 0, votable: true, ...over })
  const snap = (over: Record<string, unknown> = {}): Snapshot => ({
    settings: { title: 'T', voteLimit: 5, secretVoting: false, votingClosed: false },
    columns: [{ id: 'c1', title: 'C1' }, { id: 'c2', title: 'C2', hidden: true }],
    notes: [], groups: [], actions: [], peers: [], agenda: null, talk: { active: null, totals: {} }, roti: undefined, now: 0,
    ...over,
  }) as unknown as Snapshot
  const report = (over: Record<string, unknown> = {}) => buildReport(snap(over), new Date('2026-03-04T05:06:07Z'))

  it('adds the votes of clusters beyond those of their notes, never below zero', () => {
    const notes = [note('a', { votes: 2 }), note('b', { votes: 1, groupId: 'g' }), note('c', { votes: 2, groupId: 'g' }), note('d', { votes: 4, groupId: 'h' })]
    const groups = [group('g', { votes: 5 }), group('h', { votes: 1 })]
    expect(report({ notes, groups }).metrics.votes).toBe(2 + 1 + 2 + 4 + (5 - 3) + 0)
        expect(report({ notes: [], groups: [group('g', { votes: 3 })] }).metrics.votes).toBe(3)
  })

  it('orders authors by ideas, then by name, anonymous last, whatever the order they wrote in', () => {
    const w = (author: string | null, n: number, p: string) => Array.from({ length: n }, (_, i) => note(`${p}${i}`, { author }))
    for (const order of [[w('Zoe', 2, 'z'), w(null, 2, 'n'), w('Ann', 2, 'a'), w('Bob', 3, 'b')], [w('Bob', 3, 'b'), w('Ann', 2, 'a'), w(null, 2, 'n'), w('Zoe', 2, 'z')], [w(null, 2, 'n'), w('Zoe', 2, 'z'), w('Bob', 3, 'b'), w('Ann', 2, 'a')]]) {
      expect(report({ notes: order.flat() }).ideasPerAuthor).toEqual([{ author: 'Bob', ideas: 3 }, { author: 'Ann', ideas: 2 }, { author: 'Zoe', ideas: 2 }, { author: null, ideas: 2 }])
    }
    expect(report({ notes: [note('1', { author: null }), note('2', { author: 'Ann' })] }).ideasPerAuthor.map((a) => a.author)).toEqual(['Ann', null])
  })

  it('counts people by peers, named authors or one, and clusters that hold a note', () => {
    expect(report().metrics.participants).toBe(1)
    expect(report({ peers: [{}, {}, {}] }).metrics.participants).toBe(3)
    expect(report({ notes: [note('1', { author: 'A' }), note('2', { author: 'B' }), note('3', { author: 'A' }), note('4')] }).metrics.participants).toBe(2)
    expect(report({ peers: [{}], notes: [note('1', { author: 'A' }), note('2', { author: 'B' })] }).metrics.participants).toBe(2)
    const notes = [note('1', { groupId: 'g' }), note('2', { groupId: 'g' }), note('3', { groupId: 'x' })]
    expect(report({ notes, groups: [group('g'), group('empty')] }).metrics.clusters).toBe(1)
  })

  it('judges the turnout of the votes by the people seen', () => {
    const notes = [note('1', { votes: 3 })]
    const ids = (r: ReturnType<typeof report>) => r.insights.map((i) => i.id)
    expect(ids(report({ notes, peers: [{}, {}] }))).toContain('lowParticipation')
    expect(ids(report({ notes }))).not.toContain('lowParticipation')
    expect(ids(report({ notes: [note('1', { votes: 3, author: 'A' }), note('2', { author: 'B' }), note('3', { author: 'C' })] }))).toContain('lowParticipation')
    expect(ids(report({ notes: [note('1', { votes: 3, author: 'A' })], peers: [] }))).not.toContain('lowParticipation')
  })

  it('reports the rating only when somebody rated', () => {
    const roti = { counts: [0, 0, 1, 1, 0], total: 2, average: 3.5, mine: null }
    expect(report({ roti }).roti).toEqual({ counts: [0, 0, 1, 1, 0], total: 2, average: 3.5 })
    expect(report({ roti: { ...roti, total: 0 } }).roti).toBeNull()
    expect(report({ roti: { ...roti, average: null } }).roti).toBeNull()
    expect(report({ roti: undefined }).roti).toBeNull()
    expect(report({ roti: { counts: [1], total: 1, average: 0, mine: null } }).roti).toEqual({ counts: [1], total: 1, average: 0 })
  })

  it('lists the phases, the date, the hidden column flag and the carried actions by status', () => {
    const agenda: AgendaState = { phases: [{ id: 'a', kind: 'write', plannedMs: 60_000, actualMs: 5 }, { id: 'b', kind: 'vote', plannedMs: 1 }], current: 2, startedAt: 0, pausedAt: null, rules: true, autoPublish: true }
    const r = report({ agenda, actions: [{ status: 'done', carriedFrom: 'x' }, { status: 'done', carriedFrom: 'x' }, { status: 'todo', carriedFrom: null }, { status: 'blocked', carriedFrom: 'y' }] })
    expect(r.agenda).toEqual([{ kind: 'write', plannedMs: 60_000, actualMs: 5 }, { kind: 'vote', plannedMs: 1, actualMs: null }])
    expect(r.date).toBe('2026-03-04')
    expect(r.columns.map((c) => c.hidden)).toEqual([undefined, true])
    expect(r.carried).toEqual({ total: 3, byStatus: { done: 2, blocked: 1 } })
  })
})
