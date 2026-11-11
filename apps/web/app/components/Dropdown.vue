<script setup lang="ts">
/**
 * Menu rendered in the browser top layer (Popover API) and positioned against its trigger.
 * Being in the top layer, it is never clipped by a scrolling column or a transformed note.
 * `width` is a minimum; with `fixed` it is the exact width (the list panels share one, change history-panel-phone-layout).
 * On a phone (`data-screen="phone"`) it is a bottom sheet instead: full width at the foot of the screen, in the thumb zone,
 * rows 48 px high, a tap on the dimmed backdrop closes it (change responsive-and-i18n-hardening).
 */
const props = withDefaults(defineProps<{ align?: 'start' | 'end'; width?: string; fixed?: boolean; menu?: boolean; tall?: boolean }>(), { align: 'end', width: '', fixed: false, menu: false, tall: false })
const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const close = () => { open.value = false }
/** The browser may scroll the focused trigger into view right after opening: that must not close the menu. */
let openedAt = 0
/** Where the trigger was when the panel was placed: a scroll that leaves it there (the browser revealing a button inside the panel) keeps the menu open. */
let placedAt = { top: 0, left: 0 }
/** A phone shows every menu as a bottom sheet (the class is written on <html> by the screen plugin). */
const isSheet = () => document.documentElement.dataset.screen === 'phone'
const onScroll = (e: Event) => {
  // A sheet dims the page behind it: the page moving under it (the browser revealing a focused control) does not close it.
  if (panel.value?.contains(e.target as Node) || performance.now() - openedAt <= 250 || panel.value?.dataset.sheet !== undefined) return
  const t = trigger.value?.getBoundingClientRect()
  if (!t || Math.abs(t.top - placedAt.top) > 1 || Math.abs(t.left - placedAt.left) > 1) close()
}
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

/** Fit the panel in the visible area (visual viewport, minus the reserved bars): below the trigger, else above, else over the trigger using the whole height, scrolling inside only when even that is too short. */
function place() {
  const t = trigger.value?.getBoundingClientRect()
  const p = panel.value
  if (!t || !p) return
  placedAt = { top: t.top, left: t.left }
  if (isSheet()) {
    // The stylesheet pins the sheet to the bottom edge; only the height depends on the visible area (the phone keyboard).
    p.dataset.sheet = ''
    p.style.removeProperty('left')
    p.style.removeProperty('top')
    const vh = window.visualViewport?.height ?? window.innerHeight
    p.style.setProperty('--dd-max', `${Math.floor(vh * 0.75)}px`)
    edge()
    return
  }
  delete p.dataset.sheet
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
  else { room = Math.max(120, bottomLimit - gap); top = gap }
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
/** A menu that grows (a submenu opens) is placed again so that it keeps fitting. */
let grow: MutationObserver | null = null
const onResize = () => {
  if (Math.abs((window.visualViewport?.width ?? window.innerWidth) - openWidth) > 1) close()
  else place()
}

const onDown = (e: Event) => {
  const n = e.target as Node
  // The backdrop of a sheet reports the panel itself as the target: a press outside the panel's box is a press on the backdrop.
  if (n === panel.value && panel.value.dataset.sheet !== undefined && e instanceof PointerEvent) {
    const r = panel.value.getBoundingClientRect()
    if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) close()
    return
  }
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
    grow = new MutationObserver(() => place())
    grow.observe(p, { childList: true, subtree: true })
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
  grow?.disconnect()
  grow = null
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
.dd-panel[popover]:popover-open { display: grid; grid-auto-rows: max-content; gap: 2px; animation: dd-in .16s ease-out; }
/* Phone: a bottom sheet, thumb height rows (the sizes follow the 48 px primary action rule of the responsive-layout spec). */
.dd-panel[popover][data-sheet] {
  inset: auto 0 0 0 !important; width: 100% !important; min-width: 0 !important; max-width: none !important; max-height: var(--dd-max, 75dvh);
  padding: var(--sp-2) var(--sp-3) calc(var(--sp-3) + env(safe-area-inset-bottom)); border-inline: 0; border-bottom: 0; border-radius: var(--r-card) var(--r-card) 0 0;
}
.dd-panel[popover][data-sheet]:popover-open { animation: sheet-in .2s var(--ease); }
.dd-panel[popover][data-sheet]::before { content: ''; justify-self: center; width: 2.5rem; height: 4px; margin: 0 0 var(--sp-2); border-radius: var(--r-pill); background: var(--border); }
.dd-panel[popover][data-sheet]::backdrop { background: rgb(5 5 12 / .45); }
.dd-panel[popover][data-sheet] .dd-item { min-block-size: 48px; }
@keyframes sheet-in { from { transform: translateY(100%); } }
@media (prefers-reduced-motion: reduce) { .dd-panel[popover][data-sheet]:popover-open { animation: none; } }
</style>
