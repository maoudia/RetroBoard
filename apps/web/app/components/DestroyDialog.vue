<script setup lang="ts">
/** Destroying a board is irreversible (no server copy exists): the title must be typed to confirm. */
const { t } = useT()
const ui = useUiStore()
const board = useBoardStore()
const open = computed({ get: () => ui.dialog === 'destroy', set: (v) => { if (!v && ui.dialog === 'destroy') ui.close() } })
const title = computed(() => (board.settings?.title ?? '').trim())
const typed = ref('')
watch(open, (v) => { if (v) typed.value = '' })
const matches = computed(() => title.value !== '' && typed.value.trim().toLowerCase() === title.value.toLowerCase())

function destroy() {
  if (!matches.value) return
  board.commands.destroyBoard()
  ui.close()
}
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('destroy.title')" width="460px">
    <form id="destroy-form" class="form" @submit.prevent="destroy">
      <p class="muted">{{ t('destroy.msg') }}</p>
      <label class="lbl">{{ t('destroy.type', { title }) }}
        <input v-model="typed" class="field" autocomplete="off" autofocus data-testid="destroy-title" />
      </label>
    </form>
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="ui.close()">{{ t('common.cancel') }}</button>
      <button class="btn btn-danger" type="submit" form="destroy-form" :disabled="!matches" data-testid="destroy-confirm"><Icon name="lucide:trash" /> {{ t('destroy.confirm') }}</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.form { display: grid; gap: .9rem; }
</style>
