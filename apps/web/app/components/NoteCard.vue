<script setup lang="ts">
import type { SnapshotNote } from '@retroboard/domain'
const { t } = useT()

const props = defineProps<{ note: SnapshotNote; inGroup?: boolean }>()
const board = useBoardStore()
const ui = useUiStore()
const live = useLiveStore()
const flights = useFlights()

/** Swatches shown on hover; the full palette is one click away. */
const QUICK = [0, 1, 2, 3, 5]
const el = ref<HTMLElement | null>(null)
const editing = ref(false)
const draft = ref('')
const over = ref(false)

// Set before first render so the enter animation is replaced by the flight.
const flightFrom = props.note.mine ? flights.consume(props.note.columnId, props.note.text) : null
const tilt = computed(() => `${((hashId(props.note.id) % 30) - 15) / 10}deg`)
function hashId(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

onMounted(() => { if (flightFrom && el.value) flights.fly(el.value, flightFrom) })


watch(() => ui.editNoteId, (id) => {
  if (id !== props.note.id) return
  ui.editNoteId = null
  if (props.note.mine && !board.locked && !editing.value) startEdit()
})
const editor = ref<HTMLTextAreaElement | null>(null)
// autofocus only works on page load: focus the editor when it appears.
function startEdit() { draft.value = props.note.text; editing.value = true; void nextTick(() => editor.value?.focus()) }
function saveEdit() {
  const t = draft.value.trim()
  if (t && t !== props.note.text) board.commands.editNote(props.note.id, t)
  editing.value = false
}

function onDragStart(e: DragEvent) {
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
    ref="el" tabindex="-1" class="note" :class="{ 'is-flying': !!flightFrom, over, mine: note.mine }" :data-testid="`note-${note.id}`" :data-anchor="note.id" data-anchor-kind="note"
    :style="{ '--c': `var(--note-${note.color})`, '--tilt': tilt }" :draggable="!editing && !board.locked"
    @dragstart="onDragStart" @dragend="ui.dragNoteId = null; over = false"
    @dragover.prevent="over = !!ui.dragNoteId && ui.dragNoteId !== note.id" @dragleave="over = false" @drop.prevent.stop="onDrop"
  >
    <template v-if="!editing">
      <p class="text" data-testid="note-text">{{ note.text }}</p>
    </template>
    <div v-else class="edit">
      <textarea ref="editor" v-model="draft" :maxlength="board.noteLimit" rows="3" @keydown.enter.exact.prevent="saveEdit" @keydown.esc="editing = false" />
      <div class="edit-side">
        <button class="mini-btn" type="button" :aria-label="t('note.save')" :data-testid="`note-save-${note.id}`" @click="saveEdit"><Icon name="lucide:check" /></button>
        <button class="mini-btn cancel" type="button" :aria-label="t('note.cancel')" :data-testid="`note-cancel-${note.id}`" @click="editing = false"><Icon name="lucide:x" /></button>
        <NoteCounter :value="draft.length" :max="board.noteLimit" />
      </div>
    </div>

    <div v-if="!editing" class="quick" role="group" :aria-label="t('note.color')" :data-testid="`quick-${note.id}`">
      <button
        v-for="i in QUICK" :key="i" type="button" class="q" :class="{ on: note.color === i }" :style="{ background: `var(--note-${i})` }"
        :aria-label="t('note.colorN', { n: i + 1 })" :aria-pressed="note.color === i" :data-testid="`quick-color-${note.id}-${i}`" @click.stop="board.commands.recolorNote(note.id, i)"
      />
      <button type="button" class="q more" :aria-label="t('note.palette')" :data-testid="`quick-palette-${note.id}`" @click.stop="ui.openPalette(note.id)"><Icon name="lucide:palette" /></button>
    </div>

    <footer>
      <span v-if="note.author" class="by">{{ note.author }}</span>
      <span class="grow" />
      <LiveMarkers :peers="live.onNote.get(note.id)" :testid="`live-note-${note.id}`" />
      <!-- Notes inside a votable cluster are voted through the cluster. -->
      <VoteControl v-if="note.votable" :id="note.id" kind="note" :votes="note.votes" :my-votes="note.myVotes" :label="note.text" />
      <NoteMenu :note="note" :in-group="inGroup" @edit="startEdit" />
    </footer>
  </article>
</template>

<style scoped>
.note {
  position: relative; display: grid; gap: .5rem; align-content: space-between; min-height: 112px; padding: .75rem .8rem .5rem;
  background: var(--c); color: var(--note-ink); border-radius: calc(var(--r-card) / 3 + 2px);
  box-shadow: var(--shadow-1), inset 0 -22px 30px -26px rgb(0 0 0 / .25); transform: rotate(var(--tilt, 0deg));
  cursor: grab; transition: box-shadow .2s, transform .25s var(--ease), outline-color .2s; outline: 2px solid transparent; min-width: 0;
}
.note:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.note:hover { transform: rotate(0) translateY(-3px) scale(1.015); box-shadow: var(--shadow-2); z-index: 2; }
.note:active { cursor: grabbing; }
.note.over { outline-color: var(--accent); transform: scale(1.04); }
.note::after { content: ''; position: absolute; top: 0; right: 0; width: 16px; height: 16px; background: linear-gradient(225deg, var(--bg) 50%, rgb(0 0 0 / .14) 50%); border-bottom-left-radius: 4px; opacity: .0; }
.text { overflow-wrap: anywhere; white-space: pre-wrap; font-weight: 500; line-height: 1.3; }
.quick {
  position: absolute; top: -13px; right: 10px; display: flex; gap: 4px; align-items: center; padding: 3px 6px; border-radius: 999px;
  background: var(--surface); box-shadow: var(--shadow-1), 0 0 0 1px var(--border); opacity: 0; pointer-events: none; transition: opacity .15s;
}
.note:hover .quick, .note:focus-within .quick { opacity: 1; pointer-events: auto; }
@media (hover: none) { .quick { display: none; } }
.q { width: 16px; height: 16px; padding: 0; border-radius: 50%; border: 2px solid transparent; box-shadow: 0 0 0 1px var(--border); cursor: pointer; display: grid; place-items: center; }
.q.on { border-color: var(--text); }
.q.more { background: transparent; border: 0; box-shadow: none; color: var(--text); font-size: .85rem; }
footer { display: flex; align-items: center; gap: .15rem; margin-inline: -.2rem; }
.grow { flex: 1; }
.by { font-size: .74rem; font-style: italic; opacity: .78; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%; }
.vote {
  position: relative; display: inline-flex; align-items: center; gap: .3rem; padding: .22rem .55rem; border-radius: 999px; cursor: pointer;
  border: 1.5px solid color-mix(in oklab, var(--note-ink) 35%, transparent); background: transparent; color: inherit; font-weight: 700; font-size: .85rem;
  transition: background .15s, color .15s, transform .15s;
}
.vote:hover { background: color-mix(in oklab, var(--note-ink) 12%, transparent); }
.vote.voted { background: var(--note-ink); color: var(--c); border-color: var(--note-ink); }
.vote.off { opacity: .45; cursor: not-allowed; }
.thumb { display: inline-grid; }
.plus { position: absolute; left: 50%; top: -4px; translate: -50% 0; font-weight: 800; pointer-events: none; animation: vote-float .8s ease-out forwards; }
@media (hover: hover) {
  .edit .cancel { opacity: 0; transition: opacity .15s; }
  .edit:hover .cancel, .edit:focus-within .cancel { opacity: 1; }
}
.edit-side { display: grid; gap: .3rem; justify-items: end; }
.edit { display: flex; gap: .3rem; align-items: start; }
.edit textarea { width: 100%; resize: none; border: 1.5px solid color-mix(in oklab, var(--note-ink) 40%, transparent); border-radius: 6px; background: rgb(255 255 255 / .35); padding: .3rem .4rem; color: inherit; }
</style>
