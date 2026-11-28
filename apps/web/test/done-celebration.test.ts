import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActionItem, ActionStatus, Snapshot } from '@retroboard/domain'
import { celebrationAllowed, doneTransitions, LIVE_WINDOW_MS } from '../app/utils/done-celebration'
import { CELEBRATION_MS, createCelebrationQueue, playCelebration, QUEUE_MAX, STATIC_MS } from '../app/utils/fx'

const NOW = 1_000_000
const action = (id: string, status: ActionStatus, at = NOW - 1000, sourceNote?: string): ActionItem => ({
  id, text: id, owner: '', done: status === 'done', status, history: [{ status: 'todo', at: 1 }, ...(status === 'todo' ? [] : [{ status, at }])], due: null, carriedFrom: null, sourceNote, createdAt: 1,
})
const snap = (actions: ActionItem[], now = NOW) => ({ actions, now }) as unknown as Snapshot

describe('doneTransitions: only live moves to done', () => {
  it('a scripted sequence: live, replayed, joined late, done then reopened', () => {
    // Joined late: the first snapshot already holds done actions.
    expect(doneTransitions(null, snap([action('a', 'done')]))).toEqual([])
    // Live: todo then done a second ago, with its source idea.
    const todo = snap([action('a', 'todo', 0, 'n1')])
    expect(doneTransitions(todo, snap([action('a', 'done', NOW - 1000, 'n1')]))).toEqual([{ actionId: 'a', sourceId: 'n1' }])
    // Replayed or caught up by anti-entropy: the change is old.
    expect(doneTransitions(todo, snap([action('a', 'done', NOW - LIVE_WINDOW_MS - 1, 'n1')]))).toEqual([])
    // Already done before: nothing again on the next snapshot.
    expect(doneTransitions(snap([action('a', 'done')]), snap([action('a', 'done')]))).toEqual([])
    // Done then reopened: no celebration when it leaves done, and again when it comes back.
    const done = snap([action('a', 'done')])
    expect(doneTransitions(done, snap([action('a', 'doing', NOW)]))).toEqual([])
    expect(doneTransitions(snap([action('a', 'doing')]), snap([action('a', 'done', NOW)]))).toEqual([{ actionId: 'a', sourceId: null }])
  })

  it('an action that appears already done (a carry-over or a history load) does not celebrate', () => {
    expect(doneTransitions(snap([]), snap([action('a', 'done')]))).toEqual([])
  })

  it('several ideas done at once are all reported', () => {
    const prev = snap([action('a', 'todo'), action('b', 'doing'), action('c', 'todo')])
    expect(doneTransitions(prev, snap([action('a', 'done'), action('b', 'done'), action('c', 'todo')])).map((m) => m.actionId)).toEqual(['a', 'b'])
  })
})

describe('celebrationAllowed: the personal switch and the presenter', () => {
  it('plays by default, in simple and advanced mode alike', () => {
    expect(celebrationAllowed({ celebrations: true, motion: 'auto' }, false, false)).toBe(true)
  })
  it('off means nothing plays', () => {
    expect(celebrationAllowed({ celebrations: false, motion: 'auto' }, false, false)).toBe(false)
  })
  it('presenting plays only while the animations are on', () => {
    expect(celebrationAllowed({ celebrations: true, motion: 'auto' }, true, false)).toBe(true)
    expect(celebrationAllowed({ celebrations: true, motion: 'reduced' }, true, false)).toBe(false)
    expect(celebrationAllowed({ celebrations: true, motion: 'auto' }, true, true)).toBe(false)
  })
})

describe('createCelebrationQueue: one at a time, three at most, then one combined burst', () => {
  function harness() {
    const log: string[] = []
    const finish: (() => void)[] = []
    const queue = createCelebrationQueue<string>({ run: (job, done) => { log.push(job); finish.push(done) }, combine: (jobs) => `combined:${jobs.length}` })
    return { log, queue, next: () => finish.shift()!() }
  }

  it('starts the first at once and holds the others until it ends', () => {
    const h = harness()
    h.queue.push('a'); h.queue.push('b')
    expect(h.log).toEqual(['a'])
    h.next()
    expect(h.log).toEqual(['a', 'b'])
  })

  it('plays three, then collapses the rest into one combined burst', () => {
    expect(QUEUE_MAX).toBe(3)
    const h = harness()
    for (const j of ['a', 'b', 'c', 'd', 'e', 'f']) h.queue.push(j)
    for (let i = 0; i < 3; i++) h.next()
    expect(h.log).toEqual(['a', 'b', 'c', 'combined:3'])
    expect(h.queue.pending()).toBe(1)
    h.next()
    expect(h.queue.pending()).toBe(0)
  })

  it('a job finished twice does not start two successors, and an idle queue starts again', () => {
    const h = harness()
    h.queue.push('a'); h.queue.push('b'); h.queue.push('c')
    h.next(); h.next(); h.next()
    expect(h.log).toEqual(['a', 'b', 'c'])
    h.queue.push('d')
    expect(h.log).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('reduced motion: a static check mark for 600 ms, no animation', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

  function fakeDom(reduced: boolean) {
    const made: { className: string; children: unknown[]; dataset: Record<string, string>; removed: boolean; textContent: string }[] = []
    vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced }), devicePixelRatio: 1, innerWidth: 800, innerHeight: 600 })
    vi.stubGlobal('document', {
      documentElement: { dataset: {} },
      body: { appendChild: vi.fn() },
      createElement: () => { const e = { className: '', children: [] as unknown[], dataset: {} as Record<string, string>, removed: false, textContent: '', style: { setProperty: vi.fn() }, setAttribute: vi.fn(), appendChild(c: unknown) { e.children.push(c) }, remove() { e.removed = true } }; made.push(e); return e },
    })
    vi.stubGlobal('getComputedStyle', () => ({ position: 'static' }))
    const host = { style: { position: '' }, children: [] as unknown[], appendChild(c: unknown) { host.children.push(c) }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }) }
    return { host: host as unknown as HTMLElement, made }
  }

  it('shows the check mark and removes it after 600 ms', () => {
    vi.useFakeTimers()
    const { host, made } = fakeDom(true)
    playCelebration([host], 'sakura', { colors: ['#000'], label: 'Done' })
    expect(made).toHaveLength(2)
    expect(made[1]!.className).toContain('cele-static')
    expect(made[0]!.textContent).toBe('✓')
    expect(made[1]!.removed).toBe(false)
    expect((host as unknown as { style: { position: string } }).style.position).toBe('relative')
    vi.advanceTimersByTime(STATIC_MS)
    expect(made[1]!.removed).toBe(true)
    expect(host.style.position).toBe('')
    expect(STATIC_MS).toBe(600)
  })

  it('a normal celebration lasts at most 1.5 s', () => {
    vi.useFakeTimers()
    const { host, made } = fakeDom(false)
    playCelebration([host], 'sticky', { colors: ['#000'], label: 'Done' })
    expect(made.some((e) => e.className.includes('cele-sticky'))).toBe(true)
    expect(CELEBRATION_MS).toBeLessThanOrEqual(1500)
  })
})

describe('the engine stays inside apps/web', () => {
  it('imports only the themes ids from a package, no domain, no node, no framework in fx.ts', () => {
    const src = readFileSync(new URL('../app/utils/fx.ts', import.meta.url), 'utf8')
    const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1])
    expect(imports).toEqual(['@retroboard/themes'])
    expect(src).not.toMatch(/\b(eval|innerHTML)\b/)
  })
})
