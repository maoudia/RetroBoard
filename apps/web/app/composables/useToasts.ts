export interface ToastAction { label: string; run: () => void; testid?: string }
export interface Toast { id: number; text: string; tone: 'info' | 'warn' | 'ok'; ms: number; action?: ToastAction }

const toasts = ref<Toast[]>([])
const timers = new Map<number, { left: number; started: number; handle: ReturnType<typeof setTimeout> | null }>()
let seq = 0

export function useToasts() {
  function dismiss(id: number) {
    const tm = timers.get(id)
    if (tm?.handle) clearTimeout(tm.handle)
    timers.delete(id)
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }
  function arm(id: number) {
    const tm = timers.get(id)
    if (!tm) return
    tm.started = Date.now()
    tm.handle = setTimeout(() => dismiss(id), tm.left)
  }
  /** Hovering or focusing a toast stops its clock (WCAG 2.2.1); leaving restarts it with the time that was left. */
  function pause(id: number) {
    const tm = timers.get(id)
    if (!tm?.handle) return
    clearTimeout(tm.handle)
    tm.handle = null
    tm.left = Math.max(1200, tm.left - (Date.now() - tm.started))
  }
  function resume(id: number) { const tm = timers.get(id); if (tm && !tm.handle) arm(id) }
  /** `action`: one button (e.g. Undo); the toast goes away when it is used or when it expires. */
  function push(text: string, tone: Toast['tone'] = 'info', ms = 3600, action?: ToastAction) {
    const id = ++seq
    const kept = toasts.value.slice(-2)
    for (const old of toasts.value) if (!kept.includes(old)) dismiss(old.id)
    toasts.value = [...kept, { id, text, tone, ms, ...(action ? { action } : {}) }]
    timers.set(id, { left: ms, started: 0, handle: null })
    arm(id)
    return id
  }
  return { toasts, push, dismiss, pause, resume }
}
