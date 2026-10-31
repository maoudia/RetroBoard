<script setup lang="ts">
import { lerp, placePoint } from '@retroboard/domain'
import type { LiveCursor } from '~/stores/live'
const { t } = useT()

/**
 * Remote pointers, placed on the column or note they point at in this participant's own layout.
 * Not drawn on touch screens (markers on notes and columns instead) or when turned off.
 */
const live = useLiveStore()
const settings = useSettingsStore()
const coarse = ref(false)
const els = new Map<string, HTMLElement>()
const pos = new Map<string, { left: number; top: number }>()
let raf = 0
let tick: ReturnType<typeof setInterval> | undefined

const ui = useUiStore()
const { isLeadConn } = useLead()
const enabled = computed(() => settings.s.showCursors && !coarse.value && !ui.presenter)
const cursors = computed(() => (enabled.value ? live.visible : []))

function bindEl(conn: string, el: unknown) {
  if (el instanceof HTMLElement) els.set(conn, el); else { els.delete(conn); pos.delete(conn) }
}

function frame() {
  raf = requestAnimationFrame(frame)
  for (const c of cursors.value) {
    const el = els.get(c.conn)
    if (!el || !c.anchor) continue
    const anchor = document.querySelector(`[data-anchor="${c.anchor}"]`)
    const box = anchor?.getBoundingClientRect()
    if (!box || box.width === 0 || box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) {
      el.hidden = true
      continue
    }
    const target = placePoint(box, c.x, c.y)
    const prev = pos.get(c.conn)
    // Ease towards the latest frame: 4 updates per second look continuous.
    const next = prev ? { left: lerp(prev.left, target.left, 0.25), top: lerp(prev.top, target.top, 0.25) } : target
    pos.set(c.conn, next)
    el.hidden = false
    el.style.transform = `translate3d(${next.left}px, ${next.top}px, 0)`
  }
}

onMounted(() => {
  const mq = matchMedia('(pointer: coarse)')
  coarse.value = mq.matches
  mq.addEventListener('change', (e) => { coarse.value = e.matches })
  raf = requestAnimationFrame(frame)
  tick = setInterval(() => { live.now = Date.now() }, 2_000)
})
onBeforeUnmount(() => { cancelAnimationFrame(raf); clearInterval(tick) })

const label = (c: LiveCursor) => c.name || t('common.anonymous')
</script>

<template>
  <!-- On body: page-level stacking rules (position: relative on page children) must not apply. -->
  <Teleport to="body">
    <div class="cursors" aria-hidden="true">
      <div v-for="c in cursors" :key="c.conn" :ref="(el) => bindEl(c.conn, el)" class="cursor" :class="`c-${c.color}`" :data-testid="`cursor-${c.conn}`" hidden>
        <svg viewBox="0 0 16 16" width="18" height="18"><path d="M1 1l5.5 14 2-6 6-2z" /></svg>
        <span class="label"><Icon v-if="isLeadConn(c.conn)" class="crown" name="lucide:crown" :data-testid="`crown-${c.conn}`" /><span v-if="isLeadConn(c.conn)" class="sr-only">{{ t('roles.facilitator') }}: </span>{{ label(c) }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cursors { position: fixed; inset: 0; z-index: 40; pointer-events: none; overflow: hidden; }
.cursor { position: absolute; top: 0; left: 0; will-change: transform; }
.cursor svg { display: block; fill: var(--c); stroke: var(--ink); stroke-width: 1; filter: drop-shadow(0 1px 2px rgb(0 0 0 / .3)); }
.label { position: absolute; left: 14px; top: 14px; padding: .1rem .4rem; font-size: var(--fs-xs); font-weight: 600; white-space: nowrap; border-radius: var(--r-xs); background: var(--c); color: var(--ink); }
.crown { position: absolute; left: 0; top: -15px; width: 14px; height: 14px; color: var(--ink); filter: drop-shadow(0 0 1px var(--c)); }
.c-0 { --c: var(--note-0); } .c-1 { --c: var(--note-1); } .c-2 { --c: var(--note-2); } .c-3 { --c: var(--note-3); }
.c-4 { --c: var(--note-4); } .c-5 { --c: var(--note-5); } .c-6 { --c: var(--note-6); } .c-7 { --c: var(--note-7); }
</style>
