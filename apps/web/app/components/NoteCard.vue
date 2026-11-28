<script setup lang="ts">
import type { SnapshotNote } from '@retroboard/domain'
const { t } = useT()

const props = defineProps<{ note: SnapshotNote; inGroup?: boolean }>()
const board = useBoardStore()
const ui = useUiStore()
const live = useLiveStore()
const flights = useFlights()
const fromHere = computed(() => board.actionsBySource.get(props.note.id)?.length ?? 0)

const el = ref<HTMLElement | null>(null)
const textEl = ref<HTMLElement | null>(null)
const { clipped, open: readMore } = useNoteFit(textEl, () => props.note.text)
const over = ref(false)
const { openZoom } = useNoteZoom()
// Double tap or double click zooms the idea (change note-zoom-on-double-tap); a note in a cluster steps through its cluster.
useNoteZoomGesture(el, { enabled: () => true, zoom: () => { openZoom(props.note.id, props.note.groupId ?? null) } })

// Set before first render so the enter animation is replaced by the flight.
const flightFrom = props.note.mine ? flights.consume(props.note.columnId, props.note.text) : null
const tilt = computed(() => `${((hashId(props.note.id) % 30) - 15) / 10}deg`)
function hashId(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

// The writing zone is at the foot of the column and a new note lands at the end of the list: bring it into view before the flight measures where it ends (change writing-zone-at-column-bottom).
onMounted(() => { if (flightFrom && el.value) { ui.quietScrollUntil = performance.now() + 250; el.value.scrollIntoView({ block: 'nearest', inline: 'nearest' }); flights.fly(el.value, flightFrom) } })


// The keyboard shortcut (Enter on a focused note) opens the idea in the writing zone, like the "Edit" item of its menu.
const rights = useNoteRights()
watch(() => ui.editNoteId, (id) => {
  if (id !== props.note.id) return
  ui.editNoteId = null
  const r = rights.edit(props.note)
  if (r.shown && !r.reason) ui.editInComposer(props.note.id, props.note.columnId)
})

// A long press with a finger lifts the note (change responsive-and-i18n-hardening, task 3.2); a mouse uses the native drag below.
const touch = useTouchDrag(el, {
  enabled: () => !board.locked && !props.note.frozen,
  begin: () => { ui.dragNoteId = props.note.id },
  end: () => { ui.dragNoteId = null; over.value = false },
})
function onDragStart(e: DragEvent) {
  if (touch.touching()) return e.preventDefault()
  ui.dragNoteId = props.note.id
  e.dataTransfer?.setData('text/plain', props.note.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDrop() {
  over.value = false
  const id = ui.dragNoteId
  ui.dragNoteId = null
  if (id && id !== props.note.id) board.commands.groupNotes(id, props.note.id)
}
</script>

<template>
  <article
    ref="el" tabindex="-1" class="note" :class="{ 'is-flying': !!flightFrom, over, mine: note.mine, frozen: note.frozen, pinned: !!note.pinned }" :data-testid="`note-${note.id}`" :data-source-id="note.id" :data-anchor="note.id" data-anchor-kind="note" data-drop :data-long="note.text.length > 110 ? '' : undefined"
    :style="{ '--c': `var(--note-${note.color})`, '--tilt': tilt }" :draggable="!board.locked && !note.frozen"
    @dragstart="onDragStart" @dragend="ui.dragNoteId = null; over = false"
    @dragover.prevent="over = !!ui.dragNoteId && ui.dragNoteId !== note.id" @dragleave="over = false" @drop.prevent.stop="onDrop"
  >
    <div class="body">
      <p ref="textEl" class="text" :class="{ open: readMore }" data-testid="note-text">{{ note.text }}</p>
      <!-- Long text keeps a few lines and a way to the rest (change postit-visual-system, task 1.2); the whole text stays in the page for screen readers. -->
      <button v-if="clipped" class="more" type="button" :aria-expanded="readMore" :data-testid="`note-more-${note.id}`" @click.stop="readMore = !readMore">{{ readMore ? t('note.readLess') : t('note.readMore') }}</button>
    </div>

    <footer>
      <span v-if="note.author" class="by">{{ note.author }}</span>
      <small v-if="note.edited" class="edited" :data-testid="`edited-${note.id}`">{{ t('note.edited') }}</small>
      <!-- Someone has this idea open in the writing zone: a light mark, not a board event (change note-edit-and-unpublish). -->
      <small v-if="live.editingNote.has(note.id)" class="being-edited" role="status" :title="t('live.editing', { names: live.editingNote.get(note.id)!.map((p) => p.name || t('common.anonymous')).join(', ') })" :data-testid="`being-edited-${note.id}`"><Icon name="lucide:pencil" aria-hidden="true" /> {{ t('note.beingEdited') }}</small>
      <span class="grow" />
      <span v-if="note.pinned" class="fbadge pbadge" :data-testid="`pinned-${note.id}`"><Icon name="lucide:pin" aria-hidden="true" /> {{ t('note.pinned') }}</span>
      <span v-if="note.frozen" class="fbadge" :title="t('error.frozen')" :data-testid="`frozen-${note.id}`"><Icon name="lucide:snowflake" aria-hidden="true" /> {{ t('note.frozen') }}</span>
      <button v-if="fromHere" class="abadge" type="button" :aria-label="t('actions.countLabel', { n: fromHere })" :data-testid="`action-badge-${note.id}`" @click.stop="ui.openActionsFor(note.id)">
        <Icon name="lucide:list-checks" aria-hidden="true" /> {{ t('actions.count', { n: fromHere }) }}
      </button>
      <button v-if="ui.presenter" class="mini-btn" type="button" :aria-label="t('presenter.spotlight.open')" :title="t('presenter.spotlight.open')" :data-testid="`note-spotlight-${note.id}`" @click.stop="ui.spotlightNoteId = note.id"><Icon name="lucide:expand" /></button>
      <LiveMarkers :peers="live.onNote.get(note.id)" :testid="`live-note-${note.id}`" />
      <!-- Notes inside a votable cluster are voted through the cluster. -->
      <VoteControl v-if="note.votable && board.votingEnabled" :id="note.id" kind="note" :votes="note.votes" :my-votes="note.myVotes" :label="note.text" />
      <NoteMenu :note="note" :in-group="inGroup" />
    </footer>
  </article>
</template>

<style scoped>
.note {
  position: relative; display: grid; gap: .5rem; align-content: space-between; min-height: 112px; padding: .75rem .8rem .5rem;
  background: var(--c); color: var(--note-ink); border-radius: calc(var(--r-card) / 3 + 2px);
  box-shadow: var(--shadow-1), inset 0 -22px 30px -26px rgb(0 0 0 / .25); transform: rotate(var(--tilt, 0deg));
  cursor: grab; touch-action: manipulation; transition: box-shadow .2s, transform .25s var(--ease), outline-color .2s; outline: 2px solid transparent; min-width: 0;
  /* The text never leaves the card: the single track is capped to the card width and long words break. */
  grid-template-columns: minmax(0, 1fr);
}
.note:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.note:hover { transform: rotate(0) translateY(-3px) scale(1.015); box-shadow: var(--shadow-2); z-index: 2; }
.note:active { cursor: grabbing; }
.note.over { outline-color: var(--accent); transform: scale(1.04); }
/* Peel (change postit-visual-system, task 3.1): resting a mouse on a note lifts its top-right corner. The text does not move; reduced motion shows the corner at once. */
.note::after { content: ''; position: absolute; top: 0; right: 0; width: 18px; height: 18px; pointer-events: none; background: linear-gradient(225deg, var(--bg) 50%, rgb(0 0 0 / .14) 50%); border-bottom-left-radius: 4px; opacity: 0; transform: scale(.3); transform-origin: top right; transition: opacity var(--dur-fast), transform var(--dur-base) var(--ease); }
@media (hover: hover) { .note:hover::after { opacity: 1; transform: scale(1); } }
.body { display: grid; grid-template-columns: minmax(0, 1fr); gap: .2rem; min-width: 0; }
.more { justify-self: start; min-height: 24px; padding: 0; border: 0; background: none; color: inherit; font: inherit; font-size: var(--fs-sm); font-weight: 700; text-decoration: underline; cursor: pointer; }
.more:hover { text-decoration-thickness: 2px; }
.text { min-width: 0; max-width: 100%; word-break: break-word; overflow-wrap: anywhere; white-space: pre-wrap; font-weight: 500; line-height: 1.3; }
/* The footer wraps: author, badges, vote and menu never leave the card, a long list goes to a second line (change hotfix-ux-wave8). */
footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: .2rem .15rem; margin-inline: -.2rem; min-width: 0; }
footer > * { min-width: 0; }
.grow { flex: 1 1 0; }
.abadge { display: inline-flex; align-items: center; gap: .25rem; padding: .12rem .5rem; border-radius: 999px; border: 1.5px solid color-mix(in oklab, var(--note-ink) 35%, transparent); background: transparent; color: inherit; font: inherit; font-size: var(--fs-xs); font-weight: 700; cursor: pointer; }
.abadge:hover { background: color-mix(in oklab, var(--note-ink) 12%, transparent); }
.by { font-size: var(--fs-xs); font-style: italic; opacity: .78; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; flex: 0 1 auto; }
.vote {
  position: relative; display: inline-flex; align-items: center; gap: .3rem; padding: .22rem .55rem; border-radius: 999px; cursor: pointer;
  border: 1.5px solid color-mix(in oklab, var(--note-ink) 35%, transparent); background: transparent; color: inherit; font-weight: 700; font-size: var(--fs-sm);
  transition: background .15s, color .15s, transform .15s;
}
.vote:hover { background: color-mix(in oklab, var(--note-ink) 12%, transparent); }
.vote.voted { background: var(--note-ink); color: var(--c); border-color: var(--note-ink); }
.vote.off { opacity: .45; cursor: not-allowed; }
.thumb { display: inline-grid; }
.plus { position: absolute; left: 50%; top: -4px; translate: -50% 0; font-weight: 800; pointer-events: none; animation: vote-float .8s ease-out forwards; }
.edited { font-size: var(--fs-xs); opacity: .75; font-style: italic; }
.being-edited { display: inline-flex; align-items: center; gap: .2rem; font-size: var(--fs-xs); font-weight: 700; padding: .05rem .4rem; border-radius: 999px; border: 1.5px dashed color-mix(in oklab, var(--note-ink) 45%, transparent); }
.note.frozen { background-image: linear-gradient(135deg, rgb(255 255 255 / .35), rgb(255 255 255 / 0) 60%); cursor: default; }
.note.pinned { outline: 2px solid var(--accent); outline-offset: 1px; }
.pbadge { background: var(--accent); color: var(--accent-ink); }
.fbadge { display: inline-flex; align-items: center; gap: .25rem; font-size: var(--fs-xs); font-weight: 700; padding: .1rem .45rem; border-radius: 999px; background: rgb(255 255 255 / .55); color: var(--note-ink); }
</style>
