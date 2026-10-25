<script setup lang="ts">
/**
 * Menu rendered in the browser top layer (Popover API) and positioned against its trigger.
 * Being in the top layer, it is never clipped by a scrolling column or a transformed note.
 */
const props = withDefaults(defineProps<{ align?: 'start' | 'end'; width?: string; menu?: boolean }>(), { align: 'end', width: '', menu: false })
const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const close = () => { open.value = false }
/** The browser may scroll the focused trigger into view right after opening: that must not close the menu. */
let openedAt = 0
const onScroll = () => { if (performance.now() - openedAt > 250) close() }
const toggle = () => { open.value = !open.value }

function place() {
  const t = trigger.value?.getBoundingClientRect()
  const p = panel.value
  if (!t || !p) return
  const w = p.offsetWidth
  const h = p.offsetHeight
  const left = props.align === 'start' ? t.left : t.right - w
  let top = t.bottom + 8
  if (top + h > window.innerHeight - 8) top = Math.max(8, t.top - h - 8)
  p.style.left = `${Math.min(Math.max(8, left), Math.max(8, window.innerWidth - w - 8))}px`
  p.style.top = `${top}px`
}

const onDown = (e: Event) => {
  const n = e.target as Node
  if (!panel.value?.contains(n) && !trigger.value?.contains(n)) close()
}
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }

watch(open, async (v) => {
  await nextTick()
  const p = panel.value
  if (!p) return
  if (v) {
    if (!p.matches(':popover-open')) p.showPopover()
    openedAt = performance.now()
    place()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', onScroll, true)
  } else {
    if (p.matches(':popover-open')) p.hidePopover()
    cleanup()
  }
})
function cleanup() {
  document.removeEventListener('pointerdown', onDown, true)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', onScroll, true)
}
onBeforeUnmount(cleanup)
defineExpose({ close })
</script>

<template>
  <span ref="trigger" class="dd">
    <slot name="trigger" :open="open" :toggle="toggle" />
    <div ref="panel" popover="manual" class="dd-panel" :role="menu ? 'menu' : undefined" :style="width ? { minWidth: width } : undefined">
      <slot v-if="open" :close="close" />
    </div>
  </span>
</template>

<style>
/* Unscoped on purpose: the panel is teleported to the top layer by the browser. */
.dd { display: inline-block; }
.dd-panel[popover] {
  position: fixed; inset: auto; margin: 0; z-index: 60; min-width: 220px; max-width: min(92vw, 360px); max-height: min(70dvh, 520px); overflow: auto;
  padding: .5rem; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-card); box-shadow: var(--shadow-2);
  display: none;
}
.dd-panel[popover]:popover-open { display: grid; gap: 2px; animation: dd-in .16s ease-out; }
</style>
