<script setup lang="ts">
const props = withDefaults(defineProps<{ mode?: 'presenter' | 'zoom' }>(), { mode: 'presenter' })
const { t } = useT()
const { push } = useToasts()

/**
 * One enlarged-idea card, two modes (change note-zoom-on-double-tap):
 * - `presenter` (change presenter-mode-v2): non-modal, state `ui.spotlightNoteId`, driven from the presenter tab.
 * - `zoom`: a modal dialog with a focus trap that returns the focus to the note, state `ui.zoomNoteId`, local to the device and read-only.
 * Arrow keys move to the previous or next idea of the same column (or cluster); Escape closes.
 */
const ui = useUiStore()
const board = useBoardStore()
const zoom = computed(() => props.mode === 'zoom')
const current = computed({
  get: () => (zoom.value ? ui.zoomNoteId : ui.spotlightNoteId),
  set: (v: string | null) => { if (zoom.value) ui.zoomNoteId = v; else ui.spotlightNoteId = v },
})
const siblings = computed(() => {
  const cur = board.snapshot?.notes.find((n) => n.id === current.value)
  if (!cur) return []
  const all = board.snapshot!.notes
  if (zoom.value && ui.zoomGroupId) return all.filter((n) => n.groupId === ui.zoomGroupId)
  return all.filter((n) => n.columnId === cur.columnId)
})
const index = computed(() => siblings.value.findIndex((n) => n.id === current.value))
const note = computed(() => siblings.value[index.value] ?? null)
/** The text size follows its length so a long idea fits the card without scrolling. */
const size = computed(() => { const n = note.value?.text.length ?? 0; return n < 60 ? 'xl' : n < 160 ? 'l' : n < 320 ? 'm' : 's' })
const column = computed(() => board.columns.find((c) => c.id === note.value?.columnId))
/** A cluster's title heads its ideas; otherwise the column name does. */
const heading = computed(() => {
  if (zoom.value && ui.zoomGroupId) {
    const item = board.itemsFor(note.value?.columnId ?? '', 'time').find((i) => i.kind === 'group' && i.group.id === ui.zoomGroupId)
    if (item && item.kind === 'group') return item.title
  }
  return column.value?.title ?? ''
})
const announce = computed(() => (zoom.value && note.value ? t('zoom.announce', { i: index.value + 1, n: siblings.value.length, column: heading.value }) : ''))

const card = ref<HTMLElement | null>(null)
let returnTo: HTMLElement | null = null
/** Ids of the neighbours while the idea exists, so the card can move to one when it disappears. */
let known: string[] = []

function step(d: 1 | -1) {
  const next = siblings.value[index.value + d]
  if (next) current.value = next.id
}
function close() { current.value = null }
function onKey(e: KeyboardEvent) {
  if (current.value === null || ui.dialog !== null) return
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || (zoom.value && e.key === 'PageDown')) { e.preventDefault(); e.stopImmediatePropagation(); step(1) }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (zoom.value && e.key === 'PageUp')) { e.preventDefault(); e.stopImmediatePropagation(); step(-1) }
  else if (e.key === 'Escape') { e.stopImmediatePropagation(); close() }
  else if (zoom.value && e.key === 'Tab') trap(e)
}
/** Focus trap of the modal zoom: Tab cycles inside the card. */
function trap(e: KeyboardEvent) {
  const items = [...(card.value?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])]
  if (!items.length) { e.preventDefault(); return }
  const first = items[0]!
  const last = items[items.length - 1]!
  const on = document.activeElement
  if (e.shiftKey && (on === first || on === card.value)) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && on === last) { e.preventDefault(); first.focus() }
  else if (!card.value?.contains(on)) { e.preventDefault(); first.focus() }
}

watch(note, (n) => {
  if (n) { known = siblings.value.map((s) => s.id); return }
  const id = current.value
  if (id === null) return
  // The idea went (deleted, unpublished, column hidden): the zoom shows a neighbour that is still there, else closes with a notice.
  const ids = new Set(board.snapshot?.notes.map((x) => x.id))
  const at = known.indexOf(id)
  const near = [...known.slice(at + 1), ...known.slice(0, Math.max(at, 0)).reverse()].find((k) => ids.has(k))
  if (near && zoom.value) { current.value = near; return }
  close()
  if (zoom.value) push(t('zoom.gone'), 'info', 3000)
}, { flush: 'sync' })
watch(current, async (id, was) => {
  if (!zoom.value) return
  if (id !== null && was === null) {
    returnTo = document.activeElement as HTMLElement | null
    await nextTick()
    card.value?.focus()
  } else if (id === null && was !== null) {
    const back = returnTo
    returnTo = null
    await nextTick()
    if (back?.isConnected) back.focus({ preventScroll: true })
  }
})
// A dialog (profile, share...) opening over the zoom closes it.
watch(() => ui.dialog, (d) => { if (zoom.value && d !== null) close() })
onMounted(() => document.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey, true); current.value = null; if (zoom.value) ui.zoomGroupId = null })
</script>

<template>
  <div
    v-if="note" class="spot" :class="{ zoom }" role="dialog" :aria-label="t(zoom ? 'zoom.label' : 'presenter.spotlight.label')" :aria-modal="zoom ? 'true' : 'false'"
    :data-testid="zoom ? 'zoom' : 'spotlight'"
  >
    <div class="scrim" aria-hidden="true" @click="close" />
    <article ref="card" class="card" tabindex="-1" :style="{ '--col': `var(--note-${note.color})` }">
      <span v-if="heading" class="chip-col">{{ heading }}</span>
      <p class="text" :data-size="size" :data-testid="zoom ? 'zoom-text' : 'spotlight-text'">{{ note.text }}</p>
      <footer>
        <button class="btn" type="button" :disabled="index <= 0" :aria-label="t('presenter.spotlight.prev')" :data-testid="zoom ? 'zoom-prev' : 'spotlight-prev'" @click="step(-1)"><Icon name="lucide:chevron-left" /></button>
        <span class="muted" role="status">{{ t('presenter.walk.pos', { i: index + 1, n: siblings.length }) }}</span>
        <button class="btn" type="button" :disabled="index >= siblings.length - 1" :aria-label="t('presenter.spotlight.next')" :data-testid="zoom ? 'zoom-next' : 'spotlight-next'" @click="step(1)"><Icon name="lucide:chevron-right" /></button>
        <button class="btn btn-ghost" type="button" :data-testid="zoom ? 'zoom-close' : 'spotlight-close'" @click="close"><Icon name="lucide:x" /> {{ t('presenter.spotlight.close') }}</button>
      </footer>
      <span v-if="zoom" class="sr-only" aria-live="polite" data-testid="zoom-live">{{ announce }}</span>
    </article>
  </div>
</template>

<style scoped>
div.spot.spot { position: fixed; z-index: 65; inset: 0; display: grid; place-items: center; padding: 1rem; }
.scrim { position: absolute; inset: 0; background: rgb(5 5 12 / .62); backdrop-filter: blur(3px); }
.card { position: relative; display: grid; gap: 1.1rem; width: min(70rem, 100%); max-height: calc(100dvh - 2rem); padding: clamp(1.2rem, 3vw, 2.4rem) clamp(1.2rem, 4vw, 3rem); border-radius: calc(var(--r-card, 12px) * 1.5); background: var(--col); color: var(--note-ink); border: 3px solid var(--col); box-shadow: var(--shadow-2); }
.chip-col { justify-self: start; padding: .15rem .8rem; border-radius: 999px; background: color-mix(in oklab, var(--note-ink) 14%, transparent); font-size: var(--fs-sm); font-weight: 700; letter-spacing: .02em; }
.text { margin: 0; line-height: 1.25; font-weight: 600; overflow-wrap: break-word; white-space: pre-wrap; text-wrap: pretty; overflow-y: auto; }
.text[data-size='xl'] { font-size: clamp(2.2rem, 5vw, 4.6rem); }
.text[data-size='l'] { font-size: clamp(1.8rem, 3.8vw, 3.4rem); }
.text[data-size='m'] { font-size: clamp(1.4rem, 2.8vw, 2.4rem); }
.text[data-size='s'] { font-size: clamp(1.15rem, 2vw, 1.7rem); }
footer { padding-top: .6rem; border-top: 1px solid color-mix(in oklab, var(--note-ink) 18%, transparent); }
footer .btn { background: color-mix(in oklab, var(--note-ink) 10%, transparent); color: var(--note-ink); border-color: transparent; }
footer .btn:disabled { opacity: .35; }
footer { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
.card:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
/* Short fade and scale on opening; none under reduced motion. */
@media (prefers-reduced-motion: no-preference) { .zoom .card { animation: zoom-in var(--dur-base, .2s) var(--ease, ease-out); } }
/* Phone (under 600 px): full-width card, the controls in a bottom bar with 44 px touch targets. */
@media (max-width: 599px) {
  div.spot.spot.zoom { padding: 0; place-items: stretch; }
  .zoom .card { width: 100%; max-height: 100dvh; height: 100dvh; border-radius: 0; grid-template-rows: auto 1fr auto; padding-bottom: 0; }
  .zoom footer { position: sticky; bottom: 0; justify-content: space-between; padding: .6rem 0 max(.6rem, env(safe-area-inset-bottom)); }
  .zoom footer .btn { min-height: 44px; min-width: 44px; justify-content: center; }
}
/* TV (2560 px and up): the card and the text stop growing. */
@media (min-width: 2560px) {
  .card { width: 90rem; }
  .text[data-size='xl'] { font-size: clamp(5rem, 3vw, 6rem); }
  .text[data-size='l'] { font-size: clamp(3.4rem, 2.2vw, 4.4rem); }
}
@keyframes zoom-in { from { opacity: 0; transform: scale(.96); } }
</style>
