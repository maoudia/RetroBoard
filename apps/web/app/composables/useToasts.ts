export interface ToastAction { label: string; run: () => void; testid?: string }
export interface Toast { id: number; text: string; tone: 'info' | 'warn' | 'ok'; action?: ToastAction }

const toasts = ref<Toast[]>([])
let seq = 0

export function useToasts() {
  function dismiss(id: number) { toasts.value = toasts.value.filter((t) => t.id !== id) }
  /** `action`: one button (e.g. Undo); the toast goes away when it is used or when it expires. */
  function push(text: string, tone: Toast['tone'] = 'info', ms = 3600, action?: ToastAction) {
    const id = ++seq
    toasts.value = [...toasts.value.slice(-3), { id, text, tone, ...(action ? { action } : {}) }]
    setTimeout(() => dismiss(id), ms)
    return id
  }
  return { toasts, push, dismiss }
}
