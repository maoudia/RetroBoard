import { safeStorage } from '~/utils/storage'
import {
  type ClassLayout, type Density, LAYOUT_KEY, type LayoutBook, type ScreenClass, classOf, copyClass, layoutOf, resetClass,
  setSize, setWidth, setWrite, setWriteHeight, withLayout,
} from '~/utils/layout'

/** Layout remembered per screen class on this device (change device-layout-prefs). Local only. */
export const useLayoutStore = defineStore('layout', () => {
  const book = ref<LayoutBook>(safeStorage.get<LayoutBook>(LAYOUT_KEY, {}))
  const cls = ref<ScreenClass>(import.meta.client ? classOf(window.innerWidth) : 'desktop')
  if (import.meta.client) {
    window.addEventListener('resize', () => { const next = classOf(window.innerWidth); if (next !== cls.value) cls.value = next })
  }
  const commit = (next: LayoutBook) => { book.value = next; safeStorage.set(LAYOUT_KEY, next) }
  const current = computed<ClassLayout>(() => layoutOf(book.value, cls.value))
  return {
    book, cls, current,
    density: computed<Density | null>(() => current.value.density ?? null),
    setDensity: (d: Density) => commit(withLayout(book.value, cls.value, { density: d })),
    writingHidden: computed(() => current.value.writingHidden === true),
    setWritingHidden: (v: boolean) => commit(withLayout(book.value, cls.value, { writingHidden: v })),
    setFocusStyle: (s: 'centre' | 'accordion') => commit(withLayout(book.value, cls.value, { focusStyle: s })),
    setSizes: (room: string, sizes: Record<string, string>) => commit(withLayout(book.value, cls.value, { sizes: { ...current.value.sizes, [room]: sizes } })),
    setSize: (room: string, columnId: string, size: string) => commit(setSize(book.value, cls.value, room, columnId, size)),
    setWidth: (room: string, columnId: string, px: number | null) => commit(setWidth(book.value, cls.value, room, columnId, px)),
    setWriteHeight: (room: string, px: number | null) => commit(setWriteHeight(book.value, cls.value, room, px)),
    setWrite: (room: string, size: string) => commit(setWrite(book.value, cls.value, room, size)),
    reset: () => commit(resetClass(book.value, cls.value)),
    copyFrom: (from: ScreenClass) => commit(copyClass(book.value, from, cls.value)),
    /** Classes other than this one that have something to copy. */
    copyable: computed(() => (Object.keys(book.value) as ScreenClass[]).filter((k) => k !== cls.value)),
  }
})
