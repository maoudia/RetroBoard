<script setup lang="ts">
import { getTemplate, localizeTemplate } from '@retroboard/domain'
import { templateMapping } from '@retroboard/application'
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
  send('wipe')
}
function send(mode: 'wipe' | 'migrate') {
  if (!picked.value) return
  board.commands.applyTemplate(picked.value, locale.value, mode)
  confirm.value = false
  ui.close()
}
/** Which old columns land in each new column when the notes are kept. */
const mapping = computed(() => {
  const tpl = picked.value ? getTemplate(picked.value) : undefined
  if (!tpl) return []
  return templateMapping(board.columns.map((c) => c.title), localizeTemplate(tpl, locale.value).columns.map((c) => c.title))
})
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('template.title')" width="780px">
    <TemplatePicker v-model="picked" :theme-id="theme.themeId" />
    <template #footer>
      <button class="btn btn-ghost" type="button" @click="ui.close()">{{ t('common.cancel') }}</button>
      <button class="btn btn-primary" type="button" :disabled="!picked || picked === board.settings?.templateId" data-testid="template-apply" @click="apply">{{ t('common.apply') }}</button>
    </template>
    <BaseDialog v-model:open="confirm" :title="t('template.choice.title')" width="520px">
      <p class="muted">{{ t('template.choice.msg') }}</p>
      <ul class="map" data-testid="template-mapping" :aria-label="t('template.choice.mapping')">
        <li v-for="r in mapping" :key="r.to">
          <span class="from">{{ r.from.length ? r.from.join(' + ') : t('template.choice.empty') }}</span>
          <Icon name="lucide:arrow-right" aria-hidden="true" />
          <strong>{{ r.to }}</strong>
        </li>
      </ul>
      <template #footer>
        <button class="btn btn-ghost" type="button" @click="confirm = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-danger" type="button" data-testid="confirm" :title="t('template.confirm.msg')" @click="send('wipe')">{{ t('template.confirm.ok') }}</button>
        <button class="btn btn-primary" type="button" data-testid="template-migrate" @click="send('migrate')">{{ t('template.choice.migrate') }}</button>
      </template>
    </BaseDialog>
  </BaseDialog>
</template>

<style scoped>
.map { display: grid; gap: .35rem; margin: .75rem 0 0; padding: 0; list-style: none; }
.map li { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; padding: .35rem .6rem; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface2); }
.map .from { color: var(--muted); }
</style>
