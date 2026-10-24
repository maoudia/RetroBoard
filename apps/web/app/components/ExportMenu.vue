<script setup lang="ts">
import { download, exportLabels, toCsv, toJson, toMarkdown } from '~/utils/export'
const { t } = useT()

const board = useBoardStore()
const { push } = useToasts()
const slug = computed(() => (board.settings?.title ?? 'retro').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'retro')

function run(kind: 'md' | 'csv' | 'json' | 'copy') {
  const s = board.snapshot
  if (!s) return
  if (kind === 'md') download(`${slug.value}.md`, toMarkdown(s, { date: new Date(), labels: exportLabels }), 'text/markdown')
  else if (kind === 'csv') download(`${slug.value}.csv`, toCsv(s, exportLabels), 'text/csv')
  else if (kind === 'json') download(`${slug.value}.json`, toJson(s), 'application/json')
  else {
    navigator.clipboard?.writeText(toMarkdown(s, { date: new Date(), labels: exportLabels })).then(() => push(t('export.copied'), 'ok'), () => push(t('export.copyFailed'), 'warn'))
  }
}
</script>

<template>
  <Dropdown width="230px">
    <template #trigger="{ toggle, open }">
      <button class="icon-btn" type="button" :aria-expanded="open" data-testid="btn-export" @click="toggle">
        <Icon name="lucide:download" class="ico" /><span>{{ t('toolbar.export') }}</span>
      </button>
    </template>
    <template #default="{ close }">
      <button class="dd-item" type="button" role="menuitem" data-testid="export-md" @click="run('md'); close()"><Icon name="lucide:file-text" /> {{ t('export.md') }}</button>
      <button class="dd-item" type="button" role="menuitem" @click="run('copy'); close()"><Icon name="lucide:copy" /> {{ t('export.copy') }}</button>
      <button class="dd-item" type="button" role="menuitem" @click="run('csv'); close()"><Icon name="lucide:file-spreadsheet" /> {{ t('export.csv') }}</button>
      <button class="dd-item" type="button" role="menuitem" @click="run('json'); close()"><Icon name="lucide:file-json" /> {{ t('export.json') }}</button>
    </template>
  </Dropdown>
</template>
