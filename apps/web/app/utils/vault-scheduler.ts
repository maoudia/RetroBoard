/**
 * When a sync pass runs (change user-drive-storage, design "Vault engine"): a target has no push, so a pass starts on the
 * app opening, the tab becoming visible or hidden, focus, the network coming back, a local edit (after 5 seconds of quiet),
 * a timer (60 seconds, 30 on an open board) and "Sync now". One tab per vault leads at a time (Web Locks), a failure backs off,
 * and a pass never throws and never makes local editing wait: callers fire a trigger and go on.
 */
import type { SyncOutcome, VaultStatus } from '@retroboard/application'

export type SyncReason = 'open' | 'visible' | 'hidden' | 'focus' | 'online' | 'edit' | 'timer' | 'manual'

export const EDIT_DEBOUNCE_MS = 5_000
export const TIMER_MS = 60_000
export const BOARD_TIMER_MS = 30_000
export const BACKOFF_BASE_MS = 2_000
export const BACKOFF_MAX_MS = 5 * 60_000

/** After these the person has to act (grant access, choose the folder again, type the password): automatic passes stop. */
const NEEDS_PERSON: readonly VaultStatus[] = ['allow-folder', 'folder-not-found', 'locked']
const FAILING: readonly VaultStatus[] = ['offline', 'needs-attention', 'target-full']

export interface LockManagerLike {
  request<T>(name: string, options: { ifAvailable: true }, callback: (lock: object | null) => Promise<T>): Promise<T>
}

export interface SchedulerDeps {
  /** One pass of the engine; it never throws (a failure is a status). */
  run(reason: SyncReason): Promise<SyncOutcome>
  /** `navigator.locks`; without it every tab leads. */
  locks?: LockManagerLike | undefined
  lockName: string
  now(): number
  setTimer(fn: () => void, ms: number): unknown
  clearTimer(handle: unknown): void
  visible(): boolean
  boardOpen(): boolean
  /** The latest outcome, or 'syncing' while a pass runs. */
  onState(state: { status: VaultStatus; outcome?: SyncOutcome; at?: number }): void
}

export interface VaultScheduler {
  start(): void
  stop(): void
  trigger(reason: SyncReason): Promise<void>
  /** The person did what the status asked for: automatic passes may go on. */
  resume(): void
  readonly paused: boolean
}

export function createVaultScheduler(deps: SchedulerDeps): VaultScheduler {
  let running: Promise<void> | null = null
  let queued: SyncReason | null = null
  let started = false
  let paused = false
  let failures = 0
  let notBefore = 0
  let debounce: unknown = null
  let timer: unknown = null

  const clear = (h: unknown) => { if (h !== null) deps.clearTimer(h) }
  const interval = () => (deps.boardOpen() ? BOARD_TIMER_MS : TIMER_MS)

  function schedule() {
    clear(timer)
    timer = started ? deps.setTimer(() => { void trigger('timer') }, interval()) : null
  }

  async function pass(reason: SyncReason): Promise<void> {
    deps.onState({ status: 'syncing' })
    const outcome = await (deps.locks
      ? deps.locks.request(deps.lockName, { ifAvailable: true }, async (lock) => (lock ? deps.run(reason) : null))
      : deps.run(reason))
    // Another tab holds the lock and syncs for everyone: this tab has nothing to report.
    if (!outcome) return
    if (outcome.status === 'synced' || outcome.status === 'waiting-for-file') { failures = 0; notBefore = 0 }
    else if (FAILING.includes(outcome.status)) {
      failures += 1
      notBefore = deps.now() + (outcome.retryAfterMs ?? Math.min(BACKOFF_BASE_MS * 2 ** (failures - 1), BACKOFF_MAX_MS))
    }
    if (NEEDS_PERSON.includes(outcome.status)) paused = true
    deps.onState({ status: outcome.status, outcome, at: deps.now() })
  }

  function trigger(reason: SyncReason): Promise<void> {
    if (!started) return Promise.resolve()
    if (reason === 'edit') {
      clear(debounce)
      debounce = deps.setTimer(() => { debounce = null; void go('edit') }, EDIT_DEBOUNCE_MS)
      return Promise.resolve()
    }
    return go(reason)
  }

  function go(reason: SyncReason): Promise<void> {
    if (!started) return Promise.resolve()
    if (reason === 'manual') { paused = false; notBefore = 0 }
    else if (paused || deps.now() < notBefore || (reason === 'timer' && !deps.visible())) return Promise.resolve()
    if (running) { queued = reason; return running }
    running = (async () => {
      try {
        let next: SyncReason | null = reason
        while (next) { queued = null; await pass(next); next = queued }
      } finally { running = null; schedule() }
    })()
    return running
  }

  return {
    start() { started = true; void trigger('open') },
    stop() { started = false; clear(timer); clear(debounce); timer = debounce = null },
    trigger,
    resume() { paused = false; failures = 0; notBefore = 0 },
    get paused() { return paused },
  }
}
