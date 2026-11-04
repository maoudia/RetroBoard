<script setup lang="ts">
import { NOTE_COLOR_COUNT } from '@retroboard/domain'
import type { SnapshotNote } from '@retroboard/domain'
const { t } = useT()

const props = defineProps<{ note: SnapshotNote; inGroup?: boolean }>()
const emit = defineEmits<{ edit: [] }>()
const moderator = computed(() => useBoardStore().access.role !== 'participant')
const board = useBoardStore()
const ui = useUiStore()
/** Keyboard and touch alternative to dragging a note onto another idea (WCAG 2.5.7). */
const targets = computed(() => board.itemsFor(props.note.columnId, 'time').flatMap((i) => {
  if (i.kind === 'note') return i.note.id === props.note.id ? [] : [{ key: i.note.id, onto: i.note.id, label: i.note.text }]
  if (i.notes.some((n) => n.id === props.note.id)) return []
  return [{ key: i.group.id, onto: i.notes[0]!.id, label: t('note.groupWithGroup', { title: i.title }) }]
}))
const groupOpen = ref(false)
const picks = ref(new Set<string>())
function toggle(key: string) {
  const next = new Set(picks.value)
  if (!next.delete(key)) next.add(key)
  picks.value = next
}
/** This idea joins the first ticked target (a cluster or an idea); every other ticked idea joins the resulting cluster. */
function groupPicked() {
  const chosen = targets.value.filter((g) => picks.value.has(g.key))
  const [first, ...rest] = chosen
  if (!first) return
  board.commands.groupNotes(props.note.id, first.onto)
  for (const g of rest) board.commands.groupNotes(g.onto, props.note.id)
  picks.value = new Set()
}
const delAsk = ref(false)
/** A pinned note is on the shared spotlight: ask before removing it (change ux-irritants-wave-2). */
function askDelete() {
  if (props.note.pinned) delAsk.value = true
  else board.commands.deleteNote(props.note.id)
}
const clip = (s: string) => (s.length > 48 ? `${s.slice(0, 48)}...` : s)
const gate = computed(() => board.availability('action.add'))
function toAction() {
  ui.openActionFrom({ sourceId: props.note.id, text: props.note.text, owner: props.note.author ?? '' })
}
const others = computed(() => board.columns.filter((c) => c.id !== props.note.columnId))
</script>

<template>
  <Dropdown width="210px" menu>
    <template #trigger="{ toggle, open }">
      <button class="mini-btn" type="button" :aria-label="t('note.options')" aria-haspopup="menu" :aria-expanded="open" :data-testid="`note-menu-${note.id}`" @click.stop="toggle">
        <Icon name="lucide:ellipsis-vertical" />
      </button>
    </template>
    <template #default="{ close }">
      <div class="swatches" role="group" :aria-label="t('note.color')">
        <button
          v-for="i in NOTE_COLOR_COUNT" :key="i" type="button" role="menuitemradio" :aria-checked="note.color === i - 1" class="sw" :class="{ on: note.color === i - 1 }" :style="{ background: `var(--note-${i - 1})` }"
          :aria-label="t('note.colorN', { n: i })" @click="board.commands.recolorNote(note.id, i - 1); close()"
        />
      </div>
      <button class="dd-item" type="button" role="menuitem" :data-testid="`palette-open-${note.id}`" @click="ui.openPalette(note.id); close()"><Icon name="lucide:palette" /> {{ t('note.palette') }}</button>
      <button class="dd-item" type="button" role="menuitem" :disabled="!gate.allowed" :title="gate.allowed ? undefined : t('gated.actions.closed', { phase: gate.closedBy ? t(`agenda.phase.${gate.closedBy}` as never) : '' })" :data-testid="`create-action-${note.id}`" @click="toAction(); close()">
        <Icon name="lucide:list-checks" /> {{ t('note.toAction') }}
      </button>
      <button v-if="board.access.canSteer" class="dd-item" type="button" role="menuitem" :data-testid="`freeze-${note.id}`" @click="note.frozen ? board.commands.unfreeze(note.id) : board.commands.freeze(note.id); close()">
        <Icon :name="note.frozen ? 'lucide:flame' : 'lucide:snowflake'" /> {{ note.frozen ? t('note.unfreeze') : t('note.freeze') }}
      </button>
      <button v-if="board.access.canSteer && !inGroup && !note.groupId" class="dd-item" type="button" role="menuitem" :data-testid="`pin-${note.id}`" @click="note.pinned ? board.commands.unpin(note.id) : board.commands.pin(note.id); close()">
        <Icon :name="note.pinned ? 'lucide:pin-off' : 'lucide:pin'" /> {{ note.pinned ? t('note.unpin') : t('note.pin') }}
      </button>
      <div class="dd-sep" />
      <button v-if="inGroup || note.groupId" class="dd-item" type="button" role="menuitem" :data-testid="`ungroup-${note.id}`" @click="board.commands.ungroupNote(note.id); close()">
        <Icon name="lucide:ungroup" /> {{ t('note.ungroup') }}
      </button>
      <template v-if="targets.length && !board.locked">
        <button class="dd-item" type="button" role="menuitem" aria-haspopup="true" :aria-expanded="groupOpen" :data-testid="`group-with-${note.id}`" @click.stop="groupOpen = !groupOpen">
          <Icon name="lucide:group" /> {{ t('note.groupWith') }}
        </button>
        <div v-if="groupOpen" class="gw-list" role="group" :aria-label="t('note.groupWithList')">
          <!-- Tick several ideas, then group them all at once (change feedback-wave-6). -->
          <button
            v-for="g in targets" :key="g.key" class="dd-item gw-pick" type="button" role="menuitemcheckbox" :aria-checked="picks.has(g.key)"
            :data-testid="`group-onto-${g.key}`" @click.stop="toggle(g.key)"
          >
            <Icon :name="picks.has(g.key) ? 'lucide:square-check' : 'lucide:square'" /> <span>{{ clip(g.label) }}</span>
          </button>
          <button class="btn btn-sm btn-primary gw-go" type="button" role="menuitem" :disabled="!picks.size" data-testid="group-bulk-go" @click.stop="groupPicked(); close()">
            <Icon name="lucide:group" /> {{ t('note.groupN', { n: picks.size + 1 }) }}
          </button>
        </div>
      </template>
      <template v-if="others.length">
        <span class="lbl-sm muted">{{ t('note.moveTo') }}</span>
        <button v-for="c in others" :key="c.id" class="dd-item" type="button" role="menuitem" @click="board.commands.moveNote(note.id, c.id); close()">
          <Icon :name="`lucide:${c.icon}`" /> {{ c.title }}
        </button>
      </template>
      <template v-if="(note.mine || moderator) && !note.frozen">
        <div class="dd-sep" />
        <!-- The author edits their note; facilitators edit any note (change edit-published-notes). -->
        <button class="dd-item" type="button" role="menuitem" :data-testid="`edit-${note.id}`" @click="emit('edit'); close()"><Icon name="lucide:pencil" /> {{ t('note.edit') }}</button>
        <button v-if="note.mine" class="dd-item danger" type="button" role="menuitem" :data-testid="`delete-${note.id}`" @click="askDelete(); close()">
          <Icon name="lucide:trash" /> {{ t('note.delete') }}
        </button>
      </template>
    </template>
  </Dropdown>
  <ConfirmDialog v-model:open="delAsk" danger :title="t('note.delete.title')" :message="t('note.delete.pinned')" :confirm-label="t('note.delete')" confirm-icon="lucide:trash" @confirm="board.commands.deleteNote(note.id)" />
</template>

<style scoped>
.swatches { display: grid; grid-template-columns: repeat(8, minmax(24px, 1fr)); gap: 5px; padding: .35rem .4rem; }
.sw { aspect-ratio: 1; min-width: 24px; min-height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .15s; }
.sw:hover { transform: scale(1.2); }
.sw.on { border-color: var(--text); }
.gw-list { display: grid; max-height: 11rem; overflow: auto; padding-left: .6rem; }
.lbl-sm { font-size: var(--fs-xs); font-weight: 700; padding: .3rem .65rem 0; text-transform: uppercase; letter-spacing: .05em; }
.gw-pick { display: flex; align-items: flex-start; gap: .45rem; text-align: left; }
.gw-pick span { overflow-wrap: anywhere; }
.gw-go { margin: .3rem .5rem .2rem; width: calc(100% - 1rem); justify-content: center; }
</style>
