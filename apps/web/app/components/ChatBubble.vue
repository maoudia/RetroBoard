<script setup lang="ts">
import {
  type Box, type Dir, type Insets, type Place, badgeSide, convert, dock, fromPixels, keyboardHeight, nextPlace, placeKey, rest, stepFree,
} from '~/utils/chat-dock'
import { safeStorage } from '~/utils/storage'

/**
 * The minimised chat button (change chat-floating-dock): it snaps to the nearest edge on release, remembers its place as an
 * edge and a fraction (never pixels, never sent anywhere), keeps out of the toolbar, the composer buttons and the keyboard,
 * and can be moved without dragging (menu, Move mode, profile picker). The maths live in `utils/chat-dock.ts`.
 */
const { t } = useT()
const chat = useChatStore()
const settings = useSettingsStore()
const shown = computed(() => !chat.open && chat.minimized)

const dockEl = ref<HTMLElement | null>(null)
const buttonEl = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const moving = ref(false)
const announcement = ref('')
const badge = ref(badgeSide(settings.s.chatPlace))

/** Old free position in pixels (before this change): converted once to the new model, then dropped. */
const OLD_KEY = 'retroboard:chat-bubble'
/** A press that is held this long opens the menu (touch has no right click). */
const HOLD_MS = 500
const SLOP = 6
const SETTLE_MS = 180

let probe: HTMLElement | null = null
/** The safe-area insets of the device (notch, home bar), measured through a hidden element that uses `env()`. */
function insets(): Insets {
  if (!probe) {
    probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;inset:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
    document.body.append(probe)
  }
  const c = getComputedStyle(probe)
  const px = (v: string) => Number.parseFloat(v) || 0
  return { top: px(c.paddingTop), right: px(c.paddingRight), bottom: px(c.paddingBottom), left: px(c.paddingLeft) }
}
const windowSize = () => ({ w: window.innerWidth, h: window.innerHeight })
const keyboard = () => { const v = window.visualViewport; return v ? keyboardHeight(window.innerHeight, v.height, v.offsetTop) : 0 }
/** What must stay reachable: the toolbar, the presenter bar, the composer buttons. Only what is on screen counts. */
function avoided(): Box[] {
  const { w, h } = windowSize()
  return [...document.querySelectorAll<HTMLElement>('[data-avoid-chat]')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < w && r.top < h)
    .map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }))
}

/** The place being shown: the stored one, or the one under the arrow keys during a move. */
const live = ref<Place | null>(null)
const place = computed(() => live.value ?? settings.s.chatPlace)

let applied = ''
function put(x: number, y: number) {
  const el = dockEl.value
  if (!el) return
  const v = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
  if (v !== applied) { applied = v; el.style.transform = v }
}
/** Put the button at its resting place: transient avoidance on top of the stored place, which it never overwrites. */
function settle(animate = true) {
  const el = dockEl.value
  if (!el || !shown.value || dragging) return
  el.style.transition = animate && !reduced() ? `transform ${SETTLE_MS}ms cubic-bezier(.22, 1, .36, 1)` : 'none'
  const p = place.value
  const at = rest(p, windowSize(), insets(), avoided(), keyboard())
  put(at.x, at.y)
  badge.value = badgeSide(p)
}
let queued = 0
function schedule(animate = true) {
  if (queued) return
  queued = requestAnimationFrame(() => { queued = 0; settle(animate) })
}
const reduced = () => settings.s.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

// --- dragging -------------------------------------------------------------------------------------------------------
let dragging = false
let press: { sx: number; sy: number; ox: number; oy: number; id: number; timer: number } | null = null
let suppressClick = false
function swallowClick() { suppressClick = true; setTimeout(() => { suppressClick = false }, 0) }

function onDown(e: PointerEvent) {
  if (e.button !== 0 || moving.value) return
  const r = dockEl.value!.getBoundingClientRect()
  closeMenu(false)
  press = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, id: e.pointerId, timer: window.setTimeout(() => { if (press && !dragging) { swallowClick(); openMenu() } }, HOLD_MS) }
  buttonEl.value?.setPointerCapture?.(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!press) return
  const dx = e.clientX - press.sx
  const dy = e.clientY - press.sy
  if (!dragging) {
    if (Math.hypot(dx, dy) < SLOP) return
    dragging = true
    clearTimeout(press.timer)
    closeMenu(false)
    if (dockEl.value) dockEl.value.style.transition = 'none'
  }
  const { w, h } = windowSize()
  put(Math.min(Math.max(press.ox + dx, 0), w - 48), Math.min(Math.max(press.oy + dy, 0), h - 48))
}
function onUp() {
  if (!press) return
  clearTimeout(press.timer)
  const moved = dragging
  press = null
  dragging = false
  if (!moved) return
  swallowClick()
  const r = dockEl.value!.getBoundingClientRect()
  const next = dock({ x: r.left + 24, y: r.top + 24 }, windowSize(), insets(), settings.s.chatDock, keyboard())
  settings.patch({ chatPlace: next })
  settle()
}
function onCancel() {
  if (press) clearTimeout(press.timer)
  press = null
  if (dragging) { dragging = false; settle(false) }
}
function onClick() { if (!suppressClick && !moving.value) chat.show() }

// --- menu (long press, context-menu key, Shift+F10) -----------------------------------------------------------------
function openMenu() {
  menuOpen.value = true
  void nextTick(() => menuEl.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus())
}
function closeMenu(refocus = true) {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (refocus) void nextTick(() => buttonEl.value?.focus())
}
function onContext(e: Event) { e.preventDefault(); if (!moving.value) openMenu() }
function onMenuKey(e: KeyboardEvent) {
  const items = [...(menuEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
  const i = items.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu() }
  else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
  else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
  else if (e.key === 'End') { e.preventDefault(); items.at(-1)?.focus() }
  else if (e.key === 'Tab') closeMenu(false)
}
function onOutside(e: PointerEvent) { if (menuOpen.value && !dockEl.value?.contains(e.target as Node)) closeMenu(false) }

const placeName = (p: Place) => { const k = placeKey(p); return t(k ? `chat.place.${k}` as never : 'chat.place.custom') }

// --- Move mode: the arrow keys, Enter to drop, Escape to cancel -----------------------------------------------------
let origin: Place | null = null
function startMove() {
  closeMenu(false)
  origin = { ...settings.s.chatPlace }
  moving.value = true
  live.value = origin
  announcement.value = t('chat.move.help')
  void nextTick(() => buttonEl.value?.focus())
}
function endMove(commit: boolean) {
  if (!moving.value) return
  const chosen = live.value
  moving.value = false
  live.value = null
  if (commit && chosen) { settings.patch({ chatPlace: chosen }); announcement.value = t('chat.move.done', { place: placeName(chosen) }) }
  else announcement.value = t('chat.move.cancel')
  origin = null
  settle()
}
const ARROWS: Record<string, Dir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
function onKey(e: KeyboardEvent) {
  if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); if (!moving.value) openMenu(); return }
  if (!moving.value) return
  const dir = ARROWS[e.key]
  if (dir) {
    e.preventDefault(); e.stopPropagation()
    const cur = live.value ?? settings.s.chatPlace
    const next = cur.mode === 'free' ? stepFree(cur, dir, windowSize(), insets(), keyboard()) : nextPlace(cur, dir)
    live.value = next
    announcement.value = t('chat.move.at', { place: placeName(next) })
    settle()
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); endMove(true) }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endMove(false) }
}
function onBlur() { if (moving.value) endMove(true) }

function toggleMode() {
  const to = settings.s.chatDock === 'snap' ? 'free' : 'snap'
  settings.patch({ chatDock: to, chatPlace: convert(settings.s.chatPlace, to, windowSize(), insets(), keyboard()) })
  closeMenu()
}
function reset() { settings.resetChatPlace(); closeMenu() }

// --- life cycle -----------------------------------------------------------------------------------------------------
let observer: MutationObserver | null = null
const onViewport = () => schedule(false)
const onTransitionEnd = (e: Event) => { if (!dockEl.value?.contains(e.target as Node)) schedule() }
onMounted(() => {
  // The old pixel key, once.
  const old = safeStorage.get<unknown>(OLD_KEY, null)
  if (old !== null) {
    const migrated = fromPixels(old, windowSize(), insets(), settings.s.chatDock)
    if (migrated) settings.patch({ chatPlace: migrated })
    safeStorage.remove(OLD_KEY)
  }
  window.addEventListener('resize', onViewport)
  window.addEventListener('orientationchange', onViewport)
  window.visualViewport?.addEventListener('resize', onViewport)
  window.visualViewport?.addEventListener('scroll', onViewport)
  document.addEventListener('transitionend', onTransitionEnd, true)
  document.addEventListener('pointerdown', onOutside, true)
  // An avoided element can appear or go (a composer opens, the toolbar folds): look again, once per frame.
  observer = new MutationObserver((records) => { if (records.some((r) => !dockEl.value?.contains(r.target))) schedule() })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'data-folded'] })
  schedule(false)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(queued)
  window.removeEventListener('resize', onViewport)
  window.removeEventListener('orientationchange', onViewport)
  window.visualViewport?.removeEventListener('resize', onViewport)
  window.visualViewport?.removeEventListener('scroll', onViewport)
  document.removeEventListener('transitionend', onTransitionEnd, true)
  document.removeEventListener('pointerdown', onOutside, true)
  observer?.disconnect()
  probe?.remove()
  probe = null
})
watch([() => settings.s.chatPlace, () => settings.s.chatDock], () => schedule(), { deep: true })
watch(shown, (v) => { if (v) void nextTick(() => settle(false)); else { menuOpen.value = false; moving.value = false; live.value = null } })
watch(() => chat.unread, () => schedule(false))

const menuAbove = computed(() => (place.value.mode === 'free' ? place.value.y > 0.5 : place.value.edge === 'bottom' || (place.value.edge !== 'top' && place.value.at > 0.5)))
const menuEnd = computed(() => (place.value.mode === 'free' ? place.value.x > 0.5 : place.value.edge === 'right' || (place.value.edge !== 'left' && place.value.at > 0.5)))
</script>

<template>
  <div ref="dockEl" class="bubble-dock">
    <Transition name="bubble">
      <div v-if="shown" class="bubble-box" :data-bh="badge.h" :data-bv="badge.v">
        <button
          ref="buttonEl" class="bubble" :class="{ moving }" type="button" aria-haspopup="menu" :aria-expanded="menuOpen"
          :aria-label="chat.unread ? t('chat.unread', { n: chat.unread }) : t('chat.title')" :aria-describedby="moving ? 'chat-move-help' : undefined" :title="t('chat.bubble.drag')" data-testid="chat-bubble"
          @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onCancel" @click="onClick" @contextmenu="onContext" @keydown="onKey" @blur="onBlur"
        >
          <Icon name="lucide:message-circle" />
          <span v-if="chat.unread" class="badge" data-testid="chat-bubble-unread">{{ chat.unread }}</span>
        </button>
        <button class="bubble-x" type="button" :aria-label="t('chat.close')" :title="t('chat.close')" data-testid="chat-bubble-close" @click="chat.close()"><Icon name="lucide:x" /></button>
        <ul v-if="menuOpen" ref="menuEl" class="bubble-menu" :class="{ above: menuAbove, end: menuEnd }" role="menu" :aria-label="t('chat.menu.label')" data-testid="chat-bubble-menu" @keydown="onMenuKey">
          <li role="none"><button class="item" type="button" role="menuitem" data-testid="chat-menu-move" @click="startMove"><Icon name="lucide:move" /> {{ t('chat.menu.move') }}</button></li>
          <li role="none"><button class="item" type="button" role="menuitem" data-testid="chat-menu-mode" @click="toggleMode"><Icon :name="settings.s.chatDock === 'snap' ? 'lucide:move-diagonal' : 'lucide:magnet'" /> {{ t(settings.s.chatDock === 'snap' ? 'chat.menu.free' : 'chat.menu.snap') }}</button></li>
          <li role="none"><button class="item" type="button" role="menuitem" data-testid="chat-menu-reset" @click="reset"><Icon name="lucide:rotate-ccw" /> {{ t('chat.menu.reset') }}</button></li>
        </ul>
      </div>
    </Transition>
    <span id="chat-move-help" class="sr-only" role="status" aria-live="polite" data-testid="chat-move-status">{{ announcement }}</span>
  </div>
</template>

<style scoped>
/* One fixed 48 px square, moved with a transform set from script (never an inline style in the markup: CSP). */
.bubble-dock { position: fixed; z-index: 45; top: 0; left: 0; width: 48px; height: 48px; touch-action: none; pointer-events: none; }
.bubble-box { position: relative; width: 48px; height: 48px; pointer-events: auto; }
.bubble {
  position: relative; display: grid; place-items: center; width: 48px; height: 48px; padding: 0; touch-action: none; user-select: none; -webkit-touch-callout: none;
  border-radius: 50%; border: 1px solid var(--border); background: var(--accent); color: var(--accent-ink); font-size: var(--fs-xl); cursor: grab; box-shadow: var(--shadow-2);
}
.bubble:active { cursor: grabbing; }
.bubble:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.bubble.moving { outline: 3px dashed var(--accent-ink); outline-offset: 3px; box-shadow: 0 0 0 6px var(--accent), var(--shadow-2); }
.bubble .badge { position: absolute; min-width: 20px; padding: 0 .35rem; border-radius: 999px; background: var(--danger); color: var(--accent-ink); font-size: var(--fs-xs); font-weight: 800; text-align: center; }
/* The badge sits on the inner corner (towards the centre of the screen), the close mark on the opposite one: neither is clipped. */
.bubble-box[data-bv="top"] .badge { top: -6px; } .bubble-box[data-bv="bottom"] .badge { bottom: -6px; }
.bubble-box[data-bh="left"] .badge { left: -6px; } .bubble-box[data-bh="right"] .badge { right: -6px; }
.bubble-x { position: absolute; display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 1px solid var(--border); border-radius: 50%; background: var(--surface); color: var(--text); font-size: var(--fs-xs); cursor: pointer; box-shadow: var(--shadow-1); }
.bubble-box[data-bv="top"] .bubble-x { bottom: -8px; } .bubble-box[data-bv="bottom"] .bubble-x { top: -8px; }
.bubble-box[data-bh="left"] .bubble-x { right: -8px; } .bubble-box[data-bh="right"] .bubble-x { left: -8px; }
.bubble-menu { position: absolute; z-index: 1; min-width: 14rem; margin: 0; padding: .25rem; list-style: none; border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); box-shadow: var(--shadow-2); }
.bubble-menu { top: calc(100% + 8px); left: 0; } .bubble-menu.above { top: auto; bottom: calc(100% + 8px); } .bubble-menu.end { left: auto; right: 0; }
.item { display: flex; align-items: center; gap: .5rem; width: 100%; min-height: 44px; padding: 0 .75rem; border: 0; border-radius: var(--r-sm); background: none; color: var(--text); font: inherit; font-size: var(--fs-md); text-align: start; cursor: pointer; }
.item:hover, .item:focus-visible { background: var(--accent-soft); outline: none; }
.item:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
.bubble-enter-active, .bubble-leave-active { transition: transform .3s var(--spring, cubic-bezier(.22, 1, .36, 1)), opacity .2s; }
.bubble-enter-from, .bubble-leave-to { transform: scale(.4); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .bubble-enter-active, .bubble-leave-active { transition: none; } }
</style>
