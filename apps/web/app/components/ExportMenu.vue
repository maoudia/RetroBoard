<script setup lang="ts">
import { toActionsCsv } from '@retroboard/exporters'
import { exportLabels, toCsv, toJson, toMarkdown } from '~/utils/export'
const { t } = useT()

const board = useBoardStore()
const ui = useUiStore()
const { $ports } = useNuxtApp()
const { push } = useToasts()
const slug = computed(() => (board.settings?.title ?? 'retro').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'retro')

const fileInput = ref<HTMLInputElement | null>(null)
async function saveBoardFile() {
  const text = await board.exportBoardFile()
  if (text) $ports.file.save(`${slug.value}.retro`, text, 'application/octet-stream')
}
async function restoreBoardFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const added = await board.importBoardFile(await file.text())
  if (added === null) push(t('boardFile.invalid'), 'warn')
  else push(t('boardFile.restored', { n: added }), 'ok')
}

function run(kind: 'md' | 'csv' | 'json' | 'copy' | 'actions') {
  const s = board.snapshot
  if (!s) return
  if (kind === 'md') $ports.file.save(`${slug.value}.md`, toMarkdown(s, { date: new Date(), labels: exportLabels }), 'text/markdown')
  else if (kind === 'csv') $ports.file.save(`${slug.value}.csv`, toCsv(s, exportLabels), 'text/csv')
  else if (kind === 'actions') $ports.file.save(`${slug.value}-actions.csv`, toActionsCsv(s), 'text/csv')
  else if (kind === 'json') $ports.file.save(`${slug.value}.json`, toJson(s), 'application/json')
  else {
    $ports.clipboard.writeText(toMarkdown(s, { date: new Date(), labels: exportLabels })).then(() => push(t('export.copied'), 'ok'), () => push(t('export.copyFailed'), 'warn'))
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
      <button class="dd-item" type="button" role="menuitem" data-testid="export-report" @click="ui.open('report'); close()"><Icon name="lucide:file-chart-column" /> {{ t('report.open') }}</button>
      <hr class="dd-sep" />
      <button class="dd-item" type="button" role="menuitem" data-testid="export-md" @click="run('md'); close()"><Icon name="lucide:file-text" /> {{ t('export.md') }}</button>
      <button class="dd-item" type="button" role="menuitem" @click="run('copy'); close()"><Icon name="lucide:copy" /> {{ t('export.copy') }}</button>
      <button class="dd-item" type="button" role="menuitem" @click="run('csv'); close()"><Icon name="lucide:file-spreadsheet" /> {{ t('export.csv') }}</button>
      <button class="dd-item" type="button" role="menuitem" @click="run('json'); close()"><Icon name="lucide:file-json" /> {{ t('export.json') }}</button>
      <button class="dd-item" type="button" role="menuitem" data-testid="export-actions" @click="run('actions'); close()"><Icon name="lucide:list-checks" /> {{ t('export.actionsCsv') }}</button>
      <template v-if="board.canUseBoardFile()">
        <hr class="dd-sep" />
        <button class="dd-item" type="button" role="menuitem" data-testid="export-retro" :title="t('boardFile.exportHint')" @click="saveBoardFile(); close()"><Icon name="lucide:file-lock" /> {{ t('boardFile.export') }}</button>
        <button class="dd-item" type="button" role="menuitem" data-testid="import-retro" @click="fileInput?.click(); close()"><Icon name="lucide:file-up" /> {{ t('boardFile.import') }}</button>
      </template>
    </template>
  </Dropdown>
  <input ref="fileInput" type="file" accept=".retro,application/json" class="visually-hidden" tabindex="-1" aria-hidden="true" data-testid="import-retro-input" @change="restoreBoardFile" />
</template>

<style scoped>
.dd-sep { margin: .25rem 0; border: 0; border-top: 1px solid var(--border); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
