<script setup lang="ts">
import { groupByAuthorPlan } from '@retroboard/application'
import type { Column } from '@retroboard/domain'
const { t } = useT()

const props = defineProps<{ column: Column; index: number; count: number; noteCount: number }>()
const board = useBoardStore()
const ui = useUiStore()
const confirm = ref(false)
const resetAsk = ref(false)
const plan = computed(() => (board.snapshot ? groupByAuthorPlan(board.snapshot, props.column.id) : []))
const groupAsk = ref(false)
const applied = computed(() => ui.autoGrouped[props.column.id] ?? [])
const canUndo = computed(() => applied.value.some((id) => board.noteById(id)?.groupId))
const planText = computed(() => plan.value.map((p) => `${p.author} (${p.noteIds.length})`).join(', '))
function applyGrouping() {
  for (const p of plan.value) for (const id of p.noteIds.slice(1)) board.commands.groupNotes(id, p.noteIds[0]!)
  ui.autoGrouped = { ...ui.autoGrouped, [props.column.id]: plan.value.flatMap((p) => p.noteIds) }
}
function undoGrouping() {
  for (const id of applied.value) if (board.noteById(id)?.groupId) board.commands.ungroupNote(id)
  ui.autoGrouped = { ...ui.autoGrouped, [props.column.id]: [] }
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
        <button class="dd-item" type="button" role="menuitem" :disabled="!plan.length" :title="plan.length ? undefined : t('column.groupAuthor.none')" :data-testid="`col-group-author-${column.id}`" @click="groupAsk = true; close()">
          <Icon name="lucide:users" /> {{ t('column.groupAuthor') }}
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
    v-model:open="groupAsk" :title="t('column.groupAuthor.title')" :confirm-label="t('column.groupAuthor.ok')"
    :message="t('column.groupAuthor.msg', { list: planText })" @confirm="applyGrouping"
  />
  <ConfirmDialog
    v-model:open="resetAsk" danger :title="t('column.reset.title')" :confirm-label="t('column.reset.ok')"
    :message="t('column.reset.msg', { n: noteCount, title: column.title })" @confirm="board.commands.resetColumn(column.id)"
  />
  <ConfirmDialog
    v-model:open="confirm"  danger :title="t('column.delete.title')" :confirm-label="t('common.delete')"
    :message="noteCount ? t('column.delete.msgNotes', { n: noteCount, title: column.title }) : t('column.delete.msgEmpty', { title: column.title })"
    @confirm="board.commands.deleteColumn(column.id)"
  />
</template>
