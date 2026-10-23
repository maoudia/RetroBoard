<script setup lang="ts">
const { t, locale } = useT()
const ui = useUiStore()
const board = useBoardStore()
const theme = useThemeStore()
const open = computed({ get: () => ui.dialog === 'template', set: (v) => { if (!v && ui.dialog === 'template') ui.close() } })
const picked = ref<string | null>(null)
const confirm = ref(false)
watch(open, (v) => { if (v) picked.value = board.settings?.templateId ?? null })

function apply() {
  if (!picked.value) return
  if (board.noteCount > 0) { confirm.value = true; return }
  send()
}
function send() {
  if (!picked.value) return
  board.send({ t: 'template.apply', templateId: picked.value, wipe: true, locale: locale.value })
  ui.close()
}
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('template.title')" width="780px">
    <TemplatePicker v-model="picked" :theme-id="theme.themeId" />
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="ui.close()">{{ t('common.cancel') }}</button>
      <button class="btn btn-primary" type="button" :disabled="!picked || picked === board.settings?.templateId" data-testid="template-apply" @click="apply">{{ t('common.apply') }}</button>
    </template>
    <ConfirmDialog
      v-model:open="confirm" danger :title="t('template.confirm.title')" :confirm-label="t('template.confirm.ok')"
      :message="t('template.confirm.msg')" @confirm="send"
    />
  </BaseDialog>
</template>
