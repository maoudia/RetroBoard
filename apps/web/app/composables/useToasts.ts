export interface Toast { id: number; text: string; tone: 'info' | 'warn' | 'ok' }

const toasts = ref<Toast[]>([])
let seq = 0

export function useToasts() {
  function push(text: string, tone: Toast['tone'] = 'info', ms = 3600) {
    const id = ++seq
    toasts.value = [...toasts.value.slice(-3), { id, text, tone }]
    setTimeout(() => { toasts.value = toasts.value.filter((t) => t.id !== id) }, ms)
  }
  return { toasts, push }
}
