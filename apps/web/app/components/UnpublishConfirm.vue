<script setup lang="ts">
const { t } = useT()
const board = useBoardStore()
const rights = useNoteRights()
const { asking, run } = useUnpublish()
/** The idea being sent back, read from the board: it may be gone by the time the person answers. */
const note = computed(() => (asking.value ? board.noteById(asking.value) : undefined))
const removed = computed(() => (note.value ? rights.votes(note.value).removed : 0))
const message = computed(() => {
  const n = note.value
  if (!n) return ''
  return [t(n.mine ? 'note.unpublish.mine' : 'note.unpublish.theirs'), removed.value > 0 ? t('note.unpublish.votes', { n: removed.value }) : '', n.pinned ? t('note.unpublish.pinned') : ''].filter(Boolean).join(' ')
})
</script>

<template>
  <ConfirmDialog
    :open="!!note" :title="t('note.unpublish.title')" :message="message" :confirm-label="t('note.unpublish.confirm')" confirm-icon="lucide:undo-2"
    @update:open="(v: boolean) => { if (!v) asking = null }" @confirm="asking && run(asking)"
  />
</template>
