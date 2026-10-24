<script setup lang="ts">
import type { ColumnItem } from '@retroboard/application'
const { t } = useT()

const props = defineProps<{ item: Extract<ColumnItem, { kind: 'group' }>; secret: boolean; expanded?: boolean }>()
const board = useBoardStore()
const ui = useUiStore()
const over = ref(false)
const top = computed(() => props.item.notes[0]!)

function onDrop() {
  over.value = false
  // A cluster dropped on this one merges into it (this one keeps its title).
  const gid = ui.dragGroupId
  ui.dragGroupId = null
  if (gid) { if (gid !== props.item.group.id) board.commands.mergeGroups(gid, props.item.group.id); return }
  const id = ui.dragNoteId
  ui.dragNoteId = null
  if (id && !props.item.notes.some((n) => n.id === id)) board.commands.groupNotes(id, top.value.id)
}
function onDragStart(e: DragEvent) {
  ui.dragGroupId = props.item.group.id
  e.dataTransfer?.setData('text/plain', props.item.group.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
const open = () => { ui.openGroupId = props.item.group.id }
</script>

<template>
  <div class="cluster" :class="{ expanded }">
  <section v-if="expanded" class="inline" :class="{ over }" :data-testid="`cluster-inline-${item.group.id}`" @dragover.prevent="over = !!(ui.dragNoteId || ui.dragGroupId)" @dragleave="over = false" @drop.prevent.stop="onDrop">
    <button class="ihead" type="button" :aria-label="t('group.label', { title: item.title, n: item.notes.length })" @click="open">
      <Icon name="lucide:layers" /> <strong>{{ item.title }}</strong> <span class="muted">{{ item.notes.length }}</span>
    </button>
    <div class="inotes">
      <NoteCard v-for="n in item.notes" :key="n.id" :note="n" in-group />
    </div>
  </section>
  <button
    v-else
    type="button" class="stack" :class="{ over }" :data-testid="`group-${item.group.id}`" :aria-label="t('group.label', { title: item.title, n: item.notes.length })"
    :style="{ '--c': `var(--note-${top.color})`, '--c2': `var(--note-${item.notes[1]?.color ?? top.color})` }"
    draggable="true" @dragstart="onDragStart" @dragend="ui.dragGroupId = null"
    @click="open" @dragover.prevent="over = !!(ui.dragNoteId || ui.dragGroupId)" @dragleave="over = false" @drop.prevent.stop="onDrop"
  >
    <span class="layer l2" aria-hidden="true" />
    <span class="layer l1" aria-hidden="true" />
    <span class="face">
      <span class="fold" aria-hidden="true" />
      <span class="text">{{ item.title }}</span>
      <span class="meta">
        <span class="count"><Icon name="lucide:layers" /> {{ item.notes.length }}</span>
        <span v-if="!secret && !item.group.votable" class="votes mono"><Icon name="lucide:thumbs-up" /> {{ item.votes }}</span>
      </span>
    </span>
  </button>
  <!-- Outside the stack button (no nested buttons): a cluster is voted as one idea. -->
  <VoteControl
    v-if="item.group.votable && !expanded" :id="item.group.id" class="gvote" kind="cluster"
    :votes="item.group.votes" :my-votes="item.group.myVotes" :label="item.title"
  />
  </div>
</template>

<style scoped>
.cluster { position: relative; min-width: 0; }
.cluster.expanded { grid-column: 1 / -1; }
.inline { display: grid; gap: .5rem; padding: .5rem; border: 2px dashed color-mix(in oklab, var(--accent) 45%, transparent); border-radius: var(--r-card); }
.inline.over { border-style: solid; border-color: var(--accent); }
.ihead { display: flex; align-items: center; gap: .4rem; padding: 0; border: 0; background: none; color: var(--text); cursor: pointer; font: inherit; text-align: left; }
.inotes { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--note-w, 150px), 1fr)); gap: .6rem; }
.gvote { position: absolute; right: .55rem; bottom: .45rem; color: var(--note-ink); }
.stack { position: relative; display: block; padding: 0; border: 0; background: none; cursor: pointer; text-align: left; min-height: 112px; color: var(--note-ink); transition: transform .25s var(--ease); min-width: 0; }
.stack:hover { transform: translateY(-3px) scale(1.015); }
.stack.over { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
.layer { position: absolute; inset: 0; border-radius: calc(var(--r-card) / 3 + 2px); box-shadow: var(--shadow-1); }
.l2 { background: var(--c2); transform: translate(7px, -7px) rotate(2.2deg); filter: brightness(.94); }
.l1 { background: var(--c); transform: translate(3px, -3px) rotate(-1.4deg); filter: brightness(.97); }
.face {
  position: relative; display: grid; gap: .5rem; align-content: space-between; min-height: 112px; padding: .75rem .8rem .6rem; background: var(--c);
  border-radius: calc(var(--r-card) / 3 + 2px); box-shadow: var(--shadow-1);
}
.fold { position: absolute; top: 0; right: 0; width: 26px; height: 26px; border-top-right-radius: calc(var(--r-card) / 3 + 2px); background: linear-gradient(225deg, var(--bg) 0 50%, color-mix(in oklab, var(--c) 70%, #000) 50%); }
.text { overflow-wrap: anywhere; font-weight: 600; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; padding-right: 14px; }
.meta { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; font-weight: 800; }
.count, .votes { display: inline-flex; align-items: center; gap: .3rem; padding: .1rem .5rem; border-radius: 999px; background: color-mix(in oklab, var(--note-ink) 12%, transparent); }
</style>
