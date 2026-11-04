<script setup lang="ts">
import { groupByAuthorPlan, groupSimilarPlan } from '@retroboard/application'
import { NOTE_COLOR_COUNT } from '@retroboard/domain'
import type { Column } from '@retroboard/domain'
import { errorLabel } from '~/utils/labels'
const { t } = useT()

const props = defineProps<{ column: Column; index: number; count: number; noteCount: number }>()
const board = useBoardStore()
const ui = useUiStore()
const confirm = ref(false)
const resetAsk = ref(false)
const { push } = useToasts()
const mode = ref<'author' | 'similar'>('author')
// The plan is computed on demand, when the facilitator asks: computing it for every column on every board
// change froze big boards (change ux-irritants-wave-2).
const plan = ref<{ label: string; noteIds: string[] }[]>([])
function ask(m: 'author' | 'similar') {
  mode.value = m
  const snap = board.snapshot
  plan.value = !snap ? [] : m === 'author'
    ? groupByAuthorPlan(snap, props.column.id).map((p) => ({ label: p.author, noteIds: p.noteIds }))
    : groupSimilarPlan(snap, props.column.id)
  if (plan.value.length) groupAsk.value = true
  else push(t(m === 'author' ? 'column.groupAuthor.none' : 'column.groupSimilar.none'), 'info')
}
const groupAsk = ref(false)
const applied = computed(() => ui.autoGrouped[props.column.id] ?? [])
const canUndo = computed(() => applied.value.some((id) => board.noteById(id)?.groupId))
const planText = computed(() => plan.value.map((p) => `${p.label} (${p.noteIds.length})`).join(', '))
function applyGrouping() {
  for (const p of plan.value) for (const id of p.noteIds.slice(1)) board.commands.groupNotes(id, p.noteIds[0]!)
  ui.autoGrouped = { ...ui.autoGrouped, [props.column.id]: plan.value.flatMap((p) => p.noteIds) }
  push(t('column.group.done', { n: plan.value.length }), 'ok')
}
/** Facilitator: one colour for every idea of the column (change feedback-wave-7). Ideas inside groups follow their own group colour rules, so only loose ideas and group members are recoloured by note. */
function colourAll(color: number) {
  const ids = (board.snapshot?.notes ?? []).filter((n) => n.columnId === props.column.id && n.color !== color).map((n) => n.id)
  for (const id of ids) board.commands.recolorNote(id, color)
  push(t('column.colourAll.done', { n: ids.length }), 'ok')
}
function undoGrouping() {
  for (const id of applied.value) if (board.noteById(id)?.groupId) board.commands.ungroupNote(id)
  ui.autoGrouped = { ...ui.autoGrouped, [props.column.id]: [] }
}
const visibleCount = computed(() => board.columns.filter((c) => !c.hidden).length)
/** A refused hide is never silent: the person gets the reason (change feedback-wave-4). */
function hide() {
  const r = board.commands.hideColumn(props.column.id)
  if (!r.ok && r.error && r.error !== 'offline') push(errorLabel(r.error as never), 'warn')
}
const move = (to: number) => board.commands.moveColumn(props.column.id, to)
</script>

<template>
  <Dropdown menu>
    <template #trigger="{ toggle, open }">
      <button class="mini-btn" type="button" :aria-label="t('column.options')" aria-haspopup="menu" :aria-expanded="open" :data-testid="`col-menu-${column.id}`" @click="toggle">
        <Icon name="lucide:ellipsis-vertical" />
      </button>
    </template>
    <template #default="{ close }">
      <button class="dd-item" type="button" role="menuitem" data-testid="col-rename" @click="ui.editColumn(column.id); close()"><Icon name="lucide:pencil" /> {{ t('column.rename') }}</button>
      <button class="dd-item" type="button" role="menuitem" :disabled="index === 0" @click="move(index - 1); close()"><Icon name="lucide:arrow-left" /> {{ t('column.left') }}</button>
      <button class="dd-item" type="button" role="menuitem" :disabled="index === count - 1" @click="move(index + 1); close()"><Icon name="lucide:arrow-right" /> {{ t('column.right') }}</button>
      <div class="dd-sep" />
      <template v-if="board.access.canSteer">
        <p class="dd-label muted">{{ t('column.colourAll') }}</p>
        <div class="swatches" role="group" :aria-label="t('column.colourAll')" :data-testid="`col-colour-all-${column.id}`">
          <button
            v-for="i in NOTE_COLOR_COUNT" :key="i" type="button" role="menuitem" class="sw" :style="{ background: `var(--note-${i - 1})` }"
            :aria-label="t('note.colorN', { n: i })" :data-testid="`col-colour-${column.id}-${i - 1}`" @click="colourAll(i - 1); close()"
          />
        </div>
        <button class="dd-item" type="button" role="menuitem" :data-testid="`col-turn-${column.id}`" @click="board.commands.setTurn(board.snapshot?.turn === column.id ? null : column.id); close()">
          <Icon :name="board.snapshot?.turn === column.id ? 'lucide:lock-open' : 'lucide:scan-line'" /> {{ t(board.snapshot?.turn === column.id ? 'turn.stop' : 'turn.open') }}
        </button>
        <button class="dd-item" type="button" role="menuitem" :disabled="visibleCount <= 1" :title="visibleCount <= 1 ? t('column.hide.last') : undefined" :data-testid="`col-hide-${column.id}`" @click="hide(); close()">
          <Icon name="lucide:eye-off" /> {{ t('column.hide') }}
        </button>
        <button class="dd-item" type="button" role="menuitem" :data-testid="`col-group-author-${column.id}`" @click="ask('author'); close()">
          <Icon name="lucide:users" /> {{ t('column.groupAuthor') }}
        </button>
        <button class="dd-item" type="button" role="menuitem" :data-testid="`col-group-similar-${column.id}`" @click="ask('similar'); close()">
          <Icon name="lucide:sparkles" /> {{ t('column.groupSimilar') }}
        </button>
        <button v-if="canUndo" class="dd-item" type="button" role="menuitem" :data-testid="`col-group-undo-${column.id}`" @click="undoGrouping(); close()">
          <Icon name="lucide:undo-2" /> {{ t('column.groupAuthor.undo') }}
        </button>
      </template>
      <div class="dd-sep" />
      <button v-if="board.access.canSteer" class="dd-item danger" type="button" role="menuitem" :disabled="!noteCount" :data-testid="`col-reset-${column.id}`" @click="resetAsk = true; close()">
        <Icon name="lucide:eraser" /> {{ t('column.reset') }}
      </button>
      <button class="dd-item danger" type="button" role="menuitem" :disabled="count <= 1" data-testid="col-delete" @click="confirm = true; close()">
        <Icon name="lucide:trash" /> {{ t('column.delete') }}
      </button>
    </template>
  </Dropdown>
  <ConfirmDialog
    v-model:open="groupAsk" confirm-icon="lucide:group" :title="mode === 'author' ? t('column.groupAuthor.title') : t('column.groupSimilar.title')" :confirm-label="t('column.groupAuthor.ok')"
    :message="t(mode === 'author' ? 'column.groupAuthor.msg' : 'column.groupSimilar.msg', { list: planText })" @confirm="applyGrouping"
  />
  <ConfirmDialog
    v-model:open="resetAsk" danger confirm-icon="lucide:eraser" :title="t('column.reset.title')" :confirm-label="t('column.reset.ok')"
    :message="t('column.reset.msg', { n: noteCount, title: column.title })" @confirm="board.commands.resetColumn(column.id)"
  />
  <ConfirmDialog
    v-model:open="confirm"  danger :title="t('column.delete.title')" :confirm-label="t('common.delete')"
    :message="noteCount ? t('column.delete.msgNotes', { n: noteCount, title: column.title }) : t('column.delete.msgEmpty', { title: column.title })"
    @confirm="board.commands.deleteColumn(column.id)"
  />
</template>

<style scoped>
.dd-label { margin: .35rem .6rem 0; font-size: var(--fs-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.swatches { display: grid; grid-template-columns: repeat(8, minmax(22px, 1fr)); gap: 5px; padding: .3rem .5rem; }
.sw { aspect-ratio: 1; min-width: 22px; min-height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .15s; }
.sw:hover { transform: scale(1.2); }
</style>
