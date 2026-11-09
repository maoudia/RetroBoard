<script setup lang="ts">
/**
 * Menu rendered in the browser top layer (Popover API) and positioned against its trigger.
 * Being in the top layer, it is never clipped by a scrolling column or a transformed note.
 * `width` is a minimum; with `fixed` it is the exact width (the list panels share one, change history-panel-phone-layout).
 */
const props = withDefaults(defineProps<{ align?: 'start' | 'end'; width?: string; fixed?: boolean; menu?: boolean; tall?: boolean }>(), { align: 'end', width: '', fixed: false, menu: false, tall: false })
const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const close = () => { open.value = false }
/** The browser may scroll the focused trigger into view right after opening: that must not close the menu. */
let openedAt = 0
const onScroll = (e: Event) => { if (panel.value?.contains(e.target as Node)) return; if (performance.now() - openedAt > 250) close() }
const toggle = () => { open.value = !open.value }

/** Space taken at the bottom of the viewport by fixed bars (presenter bar, turn bar): they mark themselves data-reserve-bottom. */
function reservedBottom(vh: number): number {
  let r = 0
  for (const el of document.querySelectorAll<HTMLElement>('[data-reserve-bottom]')) {
    const b = el.getBoundingClientRect()
    if (b.height > 0 && b.top < vh) r = Math.max(r, vh - b.top)
  }
  return r
}

/** Fit the panel in the visible area (visual viewport, minus the reserved bars): below the trigger, else above, else the larger side, scrolling inside. */
function place() {
  const t = trigger.value?.getBoundingClientRect()
  const p = panel.value
  if (!t || !p) return
  const vv = window.visualViewport
  const vw = vv?.width ?? window.innerWidth
  const vh = vv?.height ?? window.innerHeight
  const gap = 8
  const bottomLimit = vh - Math.max(gap, reservedBottom(vh) + gap)
  p.style.removeProperty('--dd-max')
  const w = p.offsetWidth
  const natural = p.scrollHeight
  const below = bottomLimit - (t.bottom + gap)
  const above = t.top - gap - gap
  const cap = Math.min(natural, 520)
  let top: number
  let room: number
  if (cap <= below) { top = t.bottom + gap; room = below }
  else if (cap <= above) { room = above; top = t.top - gap - Math.min(cap, above) }
  else if (below >= above) { top = t.bottom + gap; room = below }
  else { room = above; top = gap }
  p.style.setProperty('--dd-max', `${Math.max(120, Math.floor(room))}px`)
  const left = props.align === 'start' ? t.left : t.right - w
  p.style.left = `${Math.min(Math.max(gap, left), Math.max(gap, vw - w - gap))}px`
  p.style.top = `${Math.max(gap, top)}px`
  edge()
}

/** The bottom fade says there is more below; it goes when the content is scrolled to the end or fits. */
function edge() {
  const p = panel.value
  if (!p) return
  p.toggleAttribute('data-more', p.scrollHeight - p.scrollTop - p.clientHeight > 2)
  p.tabIndex = p.scrollHeight > p.clientHeight + 1 ? 0 : -1
}

/** A height-only resize (the phone keyboard, the URL bar) re-places the panel; only a width change closes it. */
let openWidth = 0
const onResize = () => {
  if (Math.abs((window.visualViewport?.width ?? window.innerWidth) - openWidth) > 1) close()
  else place()
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
    openWidth = window.visualViewport?.width ?? window.innerWidth
    place()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
  } else {
    if (p.matches(':popover-open')) p.hidePopover()
    cleanup()
  }
})
function cleanup() {
  document.removeEventListener('pointerdown', onDown, true)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
  window.visualViewport?.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll, true)
}
onBeforeUnmount(cleanup)
defineExpose({ close })
</script>

<template>
  <span ref="trigger" class="dd">
    <slot name="trigger" :open="open" :toggle="toggle" />
    <div ref="panel" popover="manual" @scroll.passive="edge" class="dd-panel" :class="{ tall }" :role="menu ? 'menu' : undefined" :style="width ? (fixed ? { width, maxWidth: width } : { minWidth: width }) : undefined">
      <slot v-if="open" :close="close" />
    </div>
  </span>
</template>

<style>
/* Unscoped on purpose: the panel is teleported to the top layer by the browser. */
.dd { display: inline-flex; vertical-align: middle; } /* inline-flex: no line-box gap under the trigger (the ring was 7 px off-centre) */
.dd-panel[popover] {
  position: fixed; inset: auto; margin: 0; z-index: 60; min-width: 220px; max-width: min(92vw, 360px); max-height: min(var(--dd-max, 70dvh), 520px); overflow: auto;
  padding: .5rem; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-card); box-shadow: var(--shadow-2);
  display: none;
}
.dd-panel[popover].tall { max-height: var(--dd-max, calc(100dvh - 110px)); scrollbar-width: thin; } /* everything shows when it fits; a visible scrollbar appears only when it cannot */
.dd-panel[popover][data-more] { -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 1.5rem), transparent); mask-image: linear-gradient(to bottom, #000 calc(100% - 1.5rem), transparent); }
.dd-panel[popover]:popover-open { display: grid; gap: 2px; animation: dd-in .16s ease-out; }
</style>
