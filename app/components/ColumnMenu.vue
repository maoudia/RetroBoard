<script setup lang="ts">
import type { Column } from '@retroboard/domain'
const { t } = useT()

const props = defineProps<{ column: Column; index: number; count: number; noteCount: number }>()
const board = useBoardStore()
const ui = useUiStore()
const confirm = ref(false)
const move = (to: number) => board.send({ t: 'column.move', id: props.column.id, toIndex: to })
</script>

<template>
  <Dropdown>
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
      <button class="dd-item danger" type="button" role="menuitem" :disabled="count <= 1" data-testid="col-delete" @click="confirm = true; close()">
        <Icon name="lucide:trash" /> {{ t('column.delete') }}
      </button>
    </template>
  </Dropdown>
  <ConfirmDialog
    v-model:open="confirm"  danger :title="t('column.delete.title')" :confirm-label="t('common.delete')"
    :message="noteCount ? t('column.delete.msgNotes', { n: noteCount, title: column.title }) : t('column.delete.msgEmpty', { title: column.title })"
    @confirm="board.send({ t: 'column.delete', id: column.id })"
  />
</template>
