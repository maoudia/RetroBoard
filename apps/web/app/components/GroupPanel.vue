<script setup lang="ts">
import { LIMITS } from '@retroboard/domain'
import type { ColumnItem } from '@retroboard/application'
const { t } = useT()

const props = defineProps<{ item: Extract<ColumnItem, { kind: 'group' }> }>()
const board = useBoardStore()
const ui = useUiStore()
const title = ref(props.item.group.title ?? '')
watch(() => props.item.group.title, (t) => { title.value = t ?? '' })

const close = () => { ui.openGroupId = null }
function saveTitle() {
  if (title.value.trim() !== (props.item.group.title ?? '')) board.send({ t: 'group.rename', id: props.item.group.id, title: title.value })
}
function dissolve() { board.send({ t: 'group.dissolve', id: props.item.group.id }); close() }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="scrim" @click.self="close">
    <section class="panel" role="dialog" :aria-label="t('group.panel')" data-testid="group-panel">
      <header>
        <Icon name="lucide:layers" class="gi" />
        <label class="sr-only" for="gtitle">{{ t('group.titleLabel') }}</label>
        <input
          id="gtitle" v-model="title" class="gtitle" :maxlength="LIMITS.groupTitle" :placeholder="item.notes[0]?.text" data-testid="group-title"
          @blur="saveTitle" @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
        <span v-if="!board.secretVoting" class="pill mono"><Icon name="lucide:thumbs-up" /> {{ item.votes }}</span>
        <button class="mini-btn" type="button" :aria-label="t('group.closeLabel')" data-testid="group-close" @click="close"><Icon name="lucide:x" /></button>
      </header>
      <TransitionGroup name="note" tag="div" class="grid">
        <NoteCard v-for="n in item.notes" :key="n.id" :note="n" in-group />
      </TransitionGroup>
      <footer>
        <button class="btn btn-sm btn-ghost" type="button" data-testid="group-dissolve" @click="dissolve"><Icon name="lucide:ungroup" /> {{ t('group.dissolve') }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.scrim { position: absolute; inset: 0; z-index: 20; display: grid; align-items: start; padding: .6rem; background: color-mix(in oklab, var(--bg) 62%, transparent); backdrop-filter: blur(2px); border-radius: inherit; animation: fade-in .2s; }
.panel { position: relative; display: grid; gap: .8rem; padding: .9rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-card); box-shadow: var(--shadow-2); max-height: 100%; overflow: auto; animation: pop-in .25s var(--ease); }
header { display: flex; align-items: center; gap: .5rem; }
.gi { color: var(--accent); font-size: 1.2rem; flex: none; }
.gtitle { flex: 1; min-width: 0; padding: .3rem .4rem; border: 1px solid transparent; border-radius: 8px; background: transparent; font-family: var(--f-display); font-size: 1.15rem; font-weight: 600; color: var(--text); text-overflow: ellipsis; }
.gtitle:hover, .gtitle:focus { border-color: var(--border); background: var(--surface2); outline: none; }
.grid { position: relative; display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--note-w, 150px), 1fr)); gap: .75rem; }
footer { display: flex; justify-content: flex-end; }
</style>
