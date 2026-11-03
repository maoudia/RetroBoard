<script setup lang="ts">
import { similarIdeas } from '@retroboard/application'
import { NOTE_COLOR_COUNT, type Column } from '@retroboard/domain'
import { WRITE_SIZES } from '~/stores/ui'
import { MAX_WRITE_PX, MIN_WRITE_PX } from '~/utils/layout'
const { t } = useT()

const props = defineProps<{ column: Column; colorIndex: number }>()
const board = useBoardStore()
const drafts = useDraftsStore()
const layout = useLayoutStore()
const folded = computed(() => layout.writingHidden || layout.columnWriteHidden(board.roomId ?? '', props.column.id))
function unfold() {
  if (layout.writingHidden) { layout.setWritingHidden(false); return }
  layout.setColumnWriteHidden(board.roomId ?? '', props.column.id, false)
}
const identity = useIdentityStore()
const ui = useUiStore()
const { publish } = usePublish()
const text = computed({ get: () => drafts.compose(props.column.id), set: (v: string) => drafts.setCompose(props.column.id, v) })
/** Drag the grip under the writing field to set its height (mouse, touch, keyboard); a preset clears it (change board-layout-v2). */
const fieldEl = ref<HTMLTextAreaElement | null>(null)
const dragH = ref<number | null>(null)
const fieldH = computed(() => dragH.value ?? ui.writeHeightOf(props.column.id))
function startGrow(e: PointerEvent) {
  const grip = e.currentTarget as HTMLElement
  const start = fieldEl.value?.getBoundingClientRect().height ?? 52
  const y0 = e.clientY
  grip.setPointerCapture(e.pointerId)
  const move = (ev: PointerEvent) => { dragH.value = Math.max(MIN_WRITE_PX, Math.min(MAX_WRITE_PX, start + ev.clientY - y0)) }
  const up = () => {
    grip.removeEventListener('pointermove', move)
    if (dragH.value !== null) ui.setColumnWriteHeight(board.roomId, props.column.id, dragH.value)
    dragH.value = null
  }
  grip.addEventListener('pointermove', move)
  grip.addEventListener('pointerup', up, { once: true })
  grip.addEventListener('pointercancel', up, { once: true })
}
/** Double-click on the grip: back to the column's default height and size. */
function resetSize() { ui.setColumnWriteHeight(board.roomId, props.column.id, null) }
function setSize(z: (typeof WRITE_SIZES)[number]) {
  if (ui.writeAll) ui.setAllWriteSize(board.roomId, z)
  else ui.setColumnWriteSize(board.roomId, props.column.id, z)
}
function growKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  e.preventDefault()
  const now = fieldH.value ?? fieldEl.value?.getBoundingClientRect().height ?? 52
  ui.setColumnWriteHeight(board.roomId, props.column.id, now + (e.key === 'ArrowDown' ? 24 : -24))
}
/** On touch screens the keyboard's return key adds a line; the buttons act. */
const coarse = ref(false)
onMounted(() => { coarse.value = window.matchMedia('(pointer: coarse)').matches })
const mine = computed(() => drafts.forColumn(props.column.id))
/** Writing closed by the current phase: greyed composer with the reason (facilitators keep it open). */
const gate = computed(() => board.availability('note.addMany'))
const turnOff = computed(() => { const t = board.snapshot?.turn ?? null; return t !== null && t !== props.column.id })
const closed = computed(() => !gate.value.allowed || turnOff.value)
/** Look-alike ideas already published in this column, computed on this device while I type. */
const similar = computed(() => (text.value.trim().length >= 4 ? similarIdeas(text.value, board.snapshot?.notes ?? [], props.column.id, 1)[0] ?? null : null))
function showSimilar(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-anchor="${id}"]`)
  if (!el) return
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}

/** Signature of the next notes: my name, or anonymous. One click switches (no name yet: opens the name dialog). */
const signed = computed(() => identity.showName && identity.name.trim() !== '')
function setSignature(named: boolean) {
  if (named && identity.name.trim() === '') { ui.open('name'); return }
  if (signed.value === named) return
  identity.set({ name: identity.name, showName: named })
  board.updateIdentity(identity.identity)
}
/** Colour of the next notes: the column default until the author picks another swatch (kept for the following notes). */
const picked = ref<number | null>(null)
const colour = computed(() => picked.value ?? props.colorIndex)
const colorsOpen = ref(false)
/** Adding keeps the field focused: on a phone the keyboard stays open so several notes can be stacked in a row. */
function add() {
  if (drafts.add(props.column.id, text.value, colour.value)) text.value = ''
  fieldEl.value?.focus({ preventScroll: true })
}
/** Publish: the note being typed joins the stack, then everything stacked in this column goes out and the keyboard closes. */
function publishNow() {
  drafts.add(props.column.id, text.value, colour.value)
  text.value = ''
  const ids = drafts.forColumn(props.column.id).map((d) => d.id)
  fieldEl.value?.blur()
  if (ids.length) publish(ids)
}
/** Enter: draft. Shift+Enter: new line. Ctrl/Cmd+Enter: publish now. Escape: clear. */
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    publishNow()
  } else if (e.key === 'Enter' && !e.shiftKey && !coarse.value) {
    e.preventDefault()
    add()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    // First Escape clears what was typed, the next one leaves the field (so board shortcuts work again).
    if (text.value) text.value = ''
    else (e.target as HTMLElement).blur()
  }
}
</script>

<template>
  <!-- The writing area folds with a vertical slide: for every column (toolbar) or for this one (its own button);
       one handle brings it back (changes board-layout-v2 and ux-irritants-wave-2). -->
  <div class="priv-wrap" :data-folded="folded ? '' : undefined">
    <div class="priv-clip" :inert="folded">
  <section class="priv" :data-area="ui.writeSizeOf(column.id)" :aria-label="t('private.section', { title: column.title })">
    <header>
      <span class="title" :title="t('private.hint')"><Icon name="lucide:eye-off" /><span class="sr-only">{{ t('private.title') }}. {{ t('private.hint') }}</span></span>
      <GatedHint compact :availability="gate" what="gated.write" :testid="`gated-${column.id}`" />
      <button v-if="mine.length" class="btn btn-sm btn-primary" type="button" :disabled="board.locked || closed" :data-testid="`publish-${column.id}`" @click="publish(mine.map((d) => d.id))">
        <Icon name="lucide:send" /><span class="sr-only">{{ t('private.publish') }}</span><span aria-hidden="true">{{ mine.length }}</span>
      </button>
      <!-- Size in place: S M L right here, and a link that makes the choice apply to every column (change feedback-wave-4). -->
      <span class="pick-seg size-seg" role="group" :aria-label="t('private.area')">
        <button v-for="z in WRITE_SIZES" :key="z" type="button" :class="{ on: ui.writeSizeOf(column.id) === z }" :aria-pressed="ui.writeSizeOf(column.id) === z" :aria-label="t(`private.area.${z}` as never)" :title="t(`private.area.${z}` as never)" :data-testid="`area-${z}-${column.id}`" @click="setSize(z)">{{ z === 'small' ? 'S' : z === 'normal' ? 'M' : 'L' }}</button>
      </span>
      <button class="mini-btn" type="button" :aria-pressed="ui.writeAll" :aria-label="t('private.area.all')" :title="t('private.area.all')" :data-testid="`area-all-${column.id}`" @click="ui.writeAll = !ui.writeAll"><Icon :name="ui.writeAll ? 'lucide:link' : 'lucide:unlink'" /></button>
      <button class="mini-btn" type="button" :aria-label="t('private.fold')" :title="t('private.fold')" :data-testid="`write-hide-${column.id}`" @click="layout.setColumnWriteHidden(board.roomId ?? '', column.id, true)"><Icon name="lucide:chevrons-down" /></button>
    </header>

    <ul v-if="mine.length" class="drafts">
      <li v-for="d in mine" :key="d.id" :data-draft-id="d.id" class="draft" :style="{ '--c': `var(--note-${d.color})` }">
        <p>{{ d.text }}</p>
        <span class="acts">
          <button class="mini-btn" type="button" :aria-label="t('private.publishOne')" :disabled="board.locked || closed" :data-testid="`draft-publish-${d.id}`" @click="publish([d.id])"><Icon name="lucide:send" /></button>
          <button class="mini-btn" type="button" :aria-label="t('private.deleteDraft')" :data-testid="`draft-dismiss-${d.id}`" @click="drafts.remove(d.id)"><Icon name="lucide:trash" /></button>
        </span>
      </li>
    </ul>

    <label class="composer" :class="{ gated: closed }" :style="{ '--c': `var(--note-${colour})` }">
      <span class="sr-only">{{ t('private.newIn', { title: column.title }) }}</span>
      <textarea
        ref="fieldEl" v-model="text" :maxlength="board.noteLimit" rows="2" :disabled="board.locked || closed" :data-testid="`draft-${column.id}`"
        :aria-describedby="gate.closedBy ? `gated-${column.id}` : undefined"
        :placeholder="board.locked ? t('private.locked') : turnOff ? t('turn.locked') : closed ? t('gated.write.placeholder') : coarse ? t('private.placeholderTouch') : t('private.placeholder')"
        :style="fieldH ? { minHeight: `${fieldH}px`, height: `${fieldH}px` } : undefined" @keydown="onKey"
      />
      <small class="hint-row"><span class="sr-only">{{ t('private.hint') }}</span><NoteCounter :value="text.length" :max="board.noteLimit" /></small>
      <span
        class="grow-grip" role="separator" aria-orientation="horizontal" tabindex="0" :aria-label="t('private.grow')" :aria-valuenow="Math.round(fieldH ?? fieldEl?.getBoundingClientRect().height ?? 52)"
        :aria-valuemin="MIN_WRITE_PX" :aria-valuemax="MAX_WRITE_PX" :data-testid="`grow-grip-${column.id}`" @pointerdown.prevent="startGrow" @dblclick="resetSize" @keydown="growKey"
      />
    </label>
    <div v-if="colorsOpen" class="swatches" role="group" :aria-label="t('note.color')" :data-testid="`compose-colors-${column.id}`">
      <button
        v-for="i in NOTE_COLOR_COUNT" :key="i" type="button" class="sw" :class="{ on: colour === i - 1 }" :style="{ background: `var(--note-${i - 1})` }"
        :aria-label="t('note.colorN', { n: i })" :aria-pressed="colour === i - 1" :data-testid="`compose-color-${column.id}-${i - 1}`" @click="picked = i - 1"
      />
    </div>
    <div class="compose-actions">
      <span class="sig-group" role="group" :aria-label="t('private.signature')" :data-testid="`signature-${column.id}`" :data-signed="signed">
        <button
          class="sig" type="button" :class="{ on: signed }" :aria-pressed="signed" :aria-label="identity.name.trim() ? t('private.signedAs', { name: identity.name }) : t('private.signedNoName')" :title="signed ? t('private.signedHint') : t('private.anonymousHint')"
          :data-testid="`signature-named-${column.id}`" @click="setSignature(true)"
        ><Icon name="lucide:user-round" /></button>
        <button class="sig" type="button" :class="{ on: !signed }" :aria-pressed="!signed" :aria-label="t('private.anonymous')" :title="t('private.anonymousHint')" :data-testid="`signature-anon-${column.id}`" @click="setSignature(false)"><Icon name="lucide:venetian-mask" /></button>
      </span>
      <button class="mini-btn colour-btn" type="button" :aria-label="t('private.colour')" :aria-expanded="colorsOpen" :data-testid="`compose-colour-toggle-${column.id}`" @click="colorsOpen = !colorsOpen">
        <span class="dot" :style="{ background: `var(--note-${colour})` }" aria-hidden="true" /><Icon name="lucide:palette" />
      </button>
      <Dropdown width="250px" align="start">
        <template #trigger="{ toggle, open }">
          <button class="mini-btn" type="button" :aria-label="t('private.help')" :aria-expanded="open" :data-testid="`compose-help-${column.id}`" @click="toggle"><Icon name="lucide:circle-help" /></button>
        </template>
        <p class="help-text">{{ t('private.keys') }}</p>
      </Dropdown>
      <button class="btn btn-sm act act-publish" type="button" :title="t('private.publishNow')" :disabled="board.locked || closed || (!text.trim() && !mine.length)" :data-testid="`compose-publish-${column.id}`" @mousedown.prevent @click="publishNow"><Icon name="lucide:send" /><span class="sr-only">{{ t('private.publishNow') }}</span></button>
      <button class="btn btn-sm btn-primary act act-add" type="button" :title="t('private.add')" :disabled="board.locked || closed || !text.trim()" :data-testid="`compose-add-${column.id}`" @mousedown.prevent @click="add"><Icon name="lucide:plus" /><span class="sr-only">{{ t('private.add') }}</span></button>
    </div>
    <p v-if="similar" class="similar" role="status" :data-testid="`similar-${column.id}`">
      <Icon name="lucide:copy-check" /> {{ t('private.similar') }}
      <button class="link" type="button" @click="showSimilar(similar.id)">« {{ similar.text }} »</button>
    </p>
  </section>
    </div>
    <button v-if="folded" class="priv-handle" type="button" :data-testid="`write-handle-${column.id}`" @click="unfold">
      <Icon name="lucide:chevrons-up" /><span class="sr-only">{{ t('private.open') }}</span><span v-if="mine.length" class="n">{{ mine.length }}</span>
    </button>
  </div>
</template>

<style scoped>
.priv { display: grid; gap: .6rem; padding: .75rem; border-top: 1px dashed var(--border); background: color-mix(in oklab, var(--bg) 50%, var(--surface)); border-radius: 0 0 var(--r-card) var(--r-card); }
/* Privacy mark on the left, then everything else pushed to the right with the chevron last (smoother than a centred icon). */
header { display: flex; align-items: center; gap: .35rem; min-height: 30px; }
header > .title { margin-inline-end: auto; }
.title { display: inline-flex; align-items: center; gap: .4rem; font-weight: 700; font-size: var(--fs-xs); color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.similar { margin: 0; display: flex; flex-wrap: wrap; gap: .3rem; align-items: center; font-size: var(--fs-sm); color: var(--muted); }
.similar .link { overflow-wrap: anywhere; text-align: left; border: 0; background: none; padding: 0; color: var(--accent); text-decoration: underline; cursor: pointer; font: inherit; font-weight: 600; }
.priv-wrap { display: grid; grid-template-rows: 1fr; transition: grid-template-rows .3s var(--ease); }
.priv-wrap[data-folded] { grid-template-rows: 0fr; }
.priv-clip { min-height: 0; overflow: hidden; }
.priv-wrap[data-folded] .priv-clip { visibility: hidden; transition: visibility 0s .3s; }
.priv-handle { display: flex; align-items: center; justify-content: flex-end; padding-inline: .9rem; gap: .4rem; width: 100%; min-height: 40px; border: 0; border-top: 1px dashed var(--border); background: transparent; color: var(--muted); font: inherit; font-weight: 600; cursor: pointer; }
.priv-handle:hover { color: var(--accent); background: var(--accent-soft); }
.drafts { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; max-height: 22vh; overflow: auto; }
.draft { display: flex; justify-content: space-between; gap: .5rem; padding: .5rem .6rem; border: 1.5px dashed var(--c); border-radius: var(--r-sm); animation: pop-in .25s var(--ease); }
/* Pointer devices reveal the actions on hover or focus; touch screens always show them. */
@media (hover: hover) {
  .draft .acts { opacity: 0; transition: opacity .15s; }
  .draft:hover .acts, .draft:focus-within .acts { opacity: 1; }
}
.draft p { overflow-wrap: anywhere; white-space: pre-wrap; font-size: var(--fs-sm); }
.acts { display: flex; flex: none; color: var(--muted); }
.composer { position: relative; display: grid; gap: .3rem; padding: .6rem; border-radius: var(--r-xs); background: var(--c); color: var(--note-ink); box-shadow: var(--shadow-1); transform: rotate(-.6deg); }
.priv[data-area="small"] .composer textarea { min-height: 2rem; }
.priv[data-area="large"] .composer textarea { min-height: 9rem; }
.size-seg button { padding: .15rem .5rem; min-width: 28px; min-height: 28px; }
.grow-grip { position: absolute; right: 0; bottom: 0; width: 24px; height: 24px; cursor: ns-resize; touch-action: none; display: grid; place-items: center; border-radius: var(--r-pill); }
.grow-grip::after { content: ''; width: 12px; height: 12px; background: linear-gradient(135deg, transparent 0 45%, color-mix(in oklab, var(--note-ink) 55%, transparent) 45% 55%, transparent 55% 70%, color-mix(in oklab, var(--note-ink) 55%, transparent) 70% 80%, transparent 80%); transition: opacity .15s; opacity: .7; }
.grow-grip:hover::after, .grow-grip:focus-visible::after, .grow-grip:active::after { opacity: 1; }
.grow-grip:focus-visible { outline: 2px solid var(--note-ink); outline-offset: -2px; }
.composer textarea { width: 100%; min-height: 3.2rem; resize: none; padding: 0; border: 0; background: transparent; color: inherit; outline: none; font-weight: 500; }
.composer textarea::placeholder { color: color-mix(in oklab, var(--note-ink) 62%, transparent); }
.composer small { font-size: var(--fs-xs); font-weight: 500; color: color-mix(in oklab, var(--note-ink) 80%, transparent); }
.hint-row { padding-right: 22px; display: flex; justify-content: space-between; gap: .5rem; align-items: center; }
.compose-actions { display: flex; gap: .4rem; justify-content: flex-end; align-items: center; flex-wrap: wrap; }
.sig-group { display: inline-flex; border: 1px solid var(--control, var(--border)); border-radius: 999px; overflow: hidden; }
.sig { display: inline-grid; place-items: center; width: 30px; min-height: 28px; padding: 0; border: 0; background: transparent; color: var(--text); cursor: pointer; }
.sig:hover { background: color-mix(in oklab, var(--accent) 12%, transparent); }
.sig.on { background: var(--accent); color: var(--accent-ink, #fff); }
.colour-btn { position: relative; }
.colour-btn .dot { position: absolute; right: 3px; bottom: 3px; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 1px var(--border); }
.help-text { margin: 0; padding: .5rem .65rem; font-size: var(--fs-sm); color: var(--text); }
.compose-actions > .sig-group { margin-right: 0; }
/* Icon-led actions: colour carries the intent (add = outline accent, publish = filled accent), text stays for assistive tech. */
.act { width: 42px; min-height: 36px; padding: 0; justify-content: center; border-radius: var(--r-pill); }
.act-publish { margin-left: auto; border-color: var(--accent); color: var(--accent); background: transparent; }
.act-publish:hover:not(:disabled) { background: var(--accent-soft); }
.act-add { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
.act-add:hover:not(:disabled) { background: color-mix(in oklab, var(--accent) 88%, #000); }
.hint-row { justify-content: flex-end; }
.swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(24px, 1fr)); gap: 5px; padding: 0 .2rem; }
.sw { aspect-ratio: 1; min-width: 24px; min-height: 24px; border-radius: 50%; border: 2px solid transparent; box-shadow: 0 0 0 1px var(--border); cursor: pointer; }
.sw.on { border-color: var(--text); }
.composer.gated { background: var(--gated-bg); color: var(--muted); box-shadow: none; transform: none; border: 1.5px dashed var(--gated-line); }
.composer.gated textarea::placeholder { color: var(--muted); }
.composer:focus-within { box-shadow: 0 0 0 3px var(--accent), var(--shadow-1); }
</style>

<style scoped>
@media (prefers-reduced-motion: reduce) { .priv-wrap, .priv-wrap[data-folded] .priv-clip { transition: none; } }
</style>
