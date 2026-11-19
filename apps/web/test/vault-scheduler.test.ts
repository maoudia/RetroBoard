import { describe, expect, it } from 'vitest'
import type { SyncOutcome } from '@retroboard/application'
import { BACKOFF_BASE_MS, BACKOFF_MAX_MS, BOARD_TIMER_MS, EDIT_DEBOUNCE_MS, type LockManagerLike, type SchedulerDeps, type SyncReason, TIMER_MS, createVaultScheduler } from '../app/utils/vault-scheduler'

const flush = () => new Promise<void>((resolve) => { setTimeout(resolve, 0) })

/** Fake timers and a fake lock manager: time only moves when a test says so. */
function rig(over: Partial<SchedulerDeps> = {}) {
  let now = 1_000_000
  const timers = new Map<number, { at: number; fn: () => void }>()
  let next = 1
  const runs: SyncReason[] = []
  const states: { status: string; at?: number }[] = []
  const results: SyncOutcome[] = []
  let pending: ((o: SyncOutcome) => void) | null = null
  const deps: SchedulerDeps = {
    run: async (reason) => { runs.push(reason); return results.shift() ?? { status: 'synced' } },
    lockName: 'retroboard-vault-x',
    now: () => now,
    setTimer: (fn, ms) => { const id = next++; timers.set(id, { at: now + ms, fn }); return id },
    clearTimer: (h) => { timers.delete(h as number) },
    visible: () => true,
    boardOpen: () => false,
    onState: (s) => states.push(s),
    ...over,
  }
  const advance = async (ms: number) => {
    const end = now + ms
    for (;;) {
      const due = [...timers].filter(([, t]) => t.at <= end).sort(([, a], [, b]) => a.at - b.at)[0]
      if (!due) break
      now = due[1].at
      timers.delete(due[0])
      due[1].fn()
      await flush()
    }
    now = end
    await flush()
  }
  const hold = () => { deps.run = async (reason) => { runs.push(reason); return new Promise<SyncOutcome>((r) => { pending = r }) } }
  return { deps, runs, states, results, advance, timers, hold, release: (o: SyncOutcome = { status: 'synced' }) => pending!(o), set: (t: number) => { now = t } }
}

describe('vault scheduler triggers', () => {
  it('runs a pass on start and does nothing before it', async () => {
    const r = rig()
    const s = createVaultScheduler(r.deps)
    await s.trigger('focus')
    expect(r.runs).toEqual([])
    s.start()
    await flush()
    expect(r.runs).toEqual(['open'])
  })

  it('runs on every trigger a person or the browser can fire', async () => {
    const r = rig()
    const s = createVaultScheduler(r.deps)
    s.start()
    await flush()
    for (const reason of ['visible', 'hidden', 'focus', 'online', 'manual'] as const) await s.trigger(reason)
    expect(r.runs).toEqual(['open', 'visible', 'hidden', 'focus', 'online', 'manual'])
  })

  it('waits for 5 seconds of quiet after an edit, however many edits come', async () => {
    const r = rig()
    const s = createVaultScheduler(r.deps)
    s.start()
    await flush()
    r.runs.length = 0
    void s.trigger('edit')
    await r.advance(EDIT_DEBOUNCE_MS - 1)
    void s.trigger('edit')
    await r.advance(EDIT_DEBOUNCE_MS - 1)
    expect(r.runs).toEqual([])
    await r.advance(1)
    expect(r.runs).toEqual(['edit'])
  })

  it('syncs after an edit even when the tab is hidden', async () => {
    const r = rig({ visible: () => false })
    const s = createVaultScheduler(r.deps)
    s.start()
    await flush()
    r.runs.length = 0
    void s.trigger('edit')
    await r.advance(EDIT_DEBOUNCE_MS)
    expect(r.runs).toEqual(['edit'])
  })

  it('pulls on a timer: every 60 seconds while visible, 30 on an open board, not while hidden', async () => {
    let board = false
    let visible = true
    const r = rig({ boardOpen: () => board, visible: () => visible })
    const s = createVaultScheduler(r.deps)
    s.start()
    await r.advance(0)
    r.runs.length = 0
    await r.advance(TIMER_MS)
    expect(r.runs).toEqual(['timer'])
    board = true
    await r.advance(TIMER_MS) // the 60 s timer already armed fires, then the next is 30 s
    r.runs.length = 0
    await r.advance(BOARD_TIMER_MS)
    expect(r.runs).toEqual(['timer'])
    visible = false
    r.runs.length = 0
    await r.advance(BOARD_TIMER_MS * 3)
    expect(r.runs).toEqual([])
    s.stop()
    expect(r.timers.size).toBe(0)
  })

  it('does not start a second pass while one runs: it asks for one more after it', async () => {
    const r = rig()
    r.hold()
    const s = createVaultScheduler(r.deps)
    s.start()
    const first = s.trigger('focus')
    const second = s.trigger('online')
    expect(r.runs).toEqual(['open'])
    r.release()
    await flush()
    expect(r.runs).toEqual(['open', 'online'])
    r.release()
    await Promise.all([first, second])
    expect(r.runs).toHaveLength(2)
  })

  it('reports syncing, then the outcome with the time', async () => {
    const r = rig()
    const s = createVaultScheduler(r.deps)
    s.start()
    await s.trigger('manual')
    expect(r.states.map((x) => x.status)).toEqual(['syncing', 'synced', 'syncing', 'synced'])
    expect(r.states[1]!.at).toBe(1_000_000)
  })
})

describe('vault scheduler failures and leadership', () => {
  it('backs off after a failure, doubling up to five minutes, and "Sync now" ignores it', async () => {
    const r = rig()
    const s = createVaultScheduler(r.deps)
    r.results.push({ status: 'offline' })
    s.start()
    await r.advance(0)
    r.runs.length = 0
    await s.trigger('online')
    expect(r.runs).toEqual([])
    await r.advance(BACKOFF_BASE_MS)
    r.results.push({ status: 'offline' })
    await s.trigger('online')
    expect(r.runs).toEqual(['online'])
    r.runs.length = 0
    await r.advance(BACKOFF_BASE_MS * 2 - 1)
    await s.trigger('focus')
    expect(r.runs).toEqual([])
    await s.trigger('manual')
    expect(r.runs).toEqual(['manual'])
    for (let i = 0; i < 12; i++) { r.results.push({ status: 'needs-attention', reason: 'refused' }); await s.trigger('manual') }
    r.runs.length = 0
    await r.advance(BACKOFF_MAX_MS - 1)
    await s.trigger('focus')
    expect(r.runs).toEqual([])
    await r.advance(1)
    await s.trigger('focus')
    expect(r.runs).toEqual(['focus'])
  })

  it('obeys the time a throttling target asked for', async () => {
    const r = rig()
    const s = createVaultScheduler(r.deps)
    r.results.push({ status: 'offline', retryAfterMs: 90_000 })
    s.start()
    await r.advance(0)
    r.runs.length = 0
    await r.advance(89_000)
    await s.trigger('focus')
    expect(r.runs).toEqual([])
    await r.advance(1_000)
    await s.trigger('focus')
    expect(r.runs).toEqual(['focus'])
  })

  it('stops by itself when the person has to act, and goes on after "Sync now" or resume', async () => {
    for (const status of ['allow-folder', 'folder-not-found', 'locked', 'sign-in-again'] as const) {
      const r = rig()
      const s = createVaultScheduler(r.deps)
      r.results.push({ status })
      s.start()
      await r.advance(0)
      r.runs.length = 0
      expect(s.paused).toBe(true)
      await s.trigger('focus')
      await r.advance(TIMER_MS * 2)
      expect(r.runs).toEqual([])
      s.resume()
      expect(s.paused).toBe(false)
      await s.trigger('focus')
      expect(r.runs).toEqual(['focus'])
      r.results.push({ status })
      await s.trigger('manual')
      expect(s.paused).toBe(true)
      await s.trigger('manual')
      expect(r.runs.at(-1)).toBe('manual')
    }
  })

  it('a pass that finds the file late is still synced, and clears the failures', async () => {
    const r = rig()
    const s = createVaultScheduler(r.deps)
    r.results.push({ status: 'offline' }, { status: 'waiting-for-file' })
    s.start()
    await r.advance(0)
    await s.trigger('manual')
    r.runs.length = 0
    await s.trigger('focus')
    expect(r.runs).toEqual(['focus'])
  })

  it('one tab leads: a tab that cannot take the lock does not run and reports nothing', async () => {
    const held = new Set<string>()
    const requests: string[] = []
    const locks: LockManagerLike = {
      request: async (name, _o, cb) => { requests.push(name); if (held.has(name)) return cb(null); held.add(name); try { return await cb({}) } finally { held.delete(name) } },
    }
    const r = rig({ locks })
    const s = createVaultScheduler(r.deps)
    s.start()
    await r.advance(0)
    expect(r.runs).toEqual(['open'])
    r.runs.length = 0
    r.states.length = 0
    held.add('retroboard-vault-x')
    await s.trigger('manual')
    expect(r.runs).toEqual([])
    expect(r.states.map((x) => x.status)).toEqual(['syncing'])
    expect(requests.every((n) => n === 'retroboard-vault-x')).toBe(true)
  })

  it('stop cancels the timers and later triggers do nothing', async () => {
    const r = rig()
    const s = createVaultScheduler(r.deps)
    s.start()
    await r.advance(0)
    void s.trigger('edit')
    s.stop()
    r.runs.length = 0
    await r.advance(TIMER_MS * 3)
    await s.trigger('manual')
    expect(r.runs).toEqual([])
  })
})
