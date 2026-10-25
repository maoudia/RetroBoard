<script setup lang="ts">
import { buildReport } from '@retroboard/application'
import { toActionsCsv, toAgentsBundle, toDocHtml, toPlainText, toSheetsTsv, toSlack } from '@retroboard/exporters'
import { td } from '~/i18n'
import { exportLabels, toCsv, toJson, toMarkdown } from '~/utils/export'
const { t } = useT()

/**
 * Exports by destination (change export-hub): files, Jira, Confluence / Google Docs, Google
 * Sheets, Slack and AI agents, each with an "actions only" variant and a preview. Everything is
 * computed on this device; nothing goes through the relay.
 */
const ui = useUiStore()
const board = useBoardStore()
const { $ports } = useNuxtApp()
const { push } = useToasts()
const open = computed({ get: () => ui.dialog === 'export', set: (v) => { if (!v && ui.dialog === 'export') ui.close() } })

type Dest = 'files' | 'jira' | 'docs' | 'sheets' | 'slack' | 'agents'
const DESTS: { id: Dest; icon: string }[] = [
  { id: 'files', icon: 'lucide:file-down' },
  { id: 'jira', icon: 'lucide:square-kanban' },
  { id: 'docs', icon: 'lucide:file-text' },
  { id: 'sheets', icon: 'lucide:sheet' },
  { id: 'slack', icon: 'lucide:message-square' },
  { id: 'agents', icon: 'lucide:bot' },
]
const dest = ref<Dest>('files')
const actionsOnly = ref(false)
const slug = computed(() => (board.settings?.title ?? 'retro').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'retro')
const report = computed(() => (open.value && board.snapshot ? buildReport(board.snapshot, new Date()) : null))
const o = computed(() => ({ actionsOnly: actionsOnly.value }))

/** What the selected destination produces, for the preview and the buttons. */
const preview = computed(() => {
  const r = report.value
  const s = board.snapshot
  if (!r || !s) return ''
  switch (dest.value) {
    case 'jira': return toActionsCsv(s)
    case 'docs': return toDocHtml(r, td, o.value)
    case 'sheets': return toSheetsTsv(r, td, o.value)
    case 'slack': return toSlack(r, td, o.value)
    case 'agents': return toAgentsBundle(r, o.value)
    default: return actionsOnly.value ? toPlainText(r, td, o.value) : toMarkdown(s, { date: new Date(), labels: exportLabels })
  }
})

async function copy(text: string, html?: string) {
  try {
    if (html && $ports.clipboard.writeRich) await $ports.clipboard.writeRich(html, text)
    else await $ports.clipboard.writeText(text)
    push(t('exportHub.copied'), 'ok')
  } catch { push(t('export.copyFailed'), 'warn') }
}
const save = (name: string, content: string, mime: string) => $ports.file.save(name, content, mime)

function copyCurrent() {
  const r = report.value
  if (!r) return
  if (dest.value === 'docs') void copy(toPlainText(r, td, o.value), toDocHtml(r, td, o.value))
  else void copy(preview.value)
}

// Board file (.retro): encrypted, restores the board into the same link.
const fileInput = ref<HTMLInputElement | null>(null)
async function saveBoardFile() {
  const text = await board.exportBoardFile()
  if (text) save(`${slug.value}.retro`, text, 'application/octet-stream')
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
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('exportHub.title')" width="900px">
    <div class="hub">
      <nav class="dests" :aria-label="t('exportHub.destinations')">
        <button
          v-for="d in DESTS" :key="d.id" type="button" class="dest" :aria-pressed="dest === d.id" :data-testid="`export-dest-${d.id}`" @click="dest = d.id"
        >
          <Icon :name="d.icon" /><span><strong>{{ td(`exportHub.${d.id}`) }}</strong><small class="muted">{{ td(`exportHub.${d.id}.hint`) }}</small></span>
        </button>
        <button type="button" class="dest" data-testid="export-report" @click="ui.open('report')">
          <Icon name="lucide:file-chart-column" /><span><strong>{{ t('report.open') }}</strong><small class="muted">{{ t('exportHub.report.hint') }}</small></span>
        </button>
      </nav>

      <section class="pane">
        <label v-if="dest !== 'jira'" class="only">
          <input v-model="actionsOnly" type="checkbox" data-testid="export-actions-only" /> {{ t('exportHub.actionsOnly') }}
        </label>

        <div class="acts">
          <template v-if="dest === 'files'">
            <button class="btn btn-primary" type="button" data-testid="export-md" @click="save(`${slug}.md`, preview, 'text/markdown')"><Icon name="lucide:file-text" /> {{ t('export.md') }}</button>
            <button class="btn" type="button" data-testid="export-csv" @click="save(`${slug}.csv`, toCsv(board.snapshot!, exportLabels), 'text/csv')"><Icon name="lucide:file-spreadsheet" /> {{ t('export.csv') }}</button>
            <button class="btn" type="button" data-testid="export-json" @click="save(`${slug}.json`, toJson(board.snapshot!), 'application/json')"><Icon name="lucide:file-json" /> {{ t('export.json') }}</button>
            <button class="btn" type="button" @click="copy(preview)"><Icon name="lucide:copy" /> {{ t('export.copy') }}</button>
          </template>
          <template v-else-if="dest === 'jira'">
            <button class="btn btn-primary" type="button" data-testid="export-actions" @click="save(`${slug}-actions.csv`, preview, 'text/csv')"><Icon name="lucide:file-down" /> {{ t('export.actionsCsv') }}</button>
          </template>
          <template v-else>
            <button class="btn btn-primary" type="button" :data-testid="`export-copy-${dest}`" @click="copyCurrent"><Icon name="lucide:copy" /> {{ td(`exportHub.${dest}.copy`) }}</button>
            <button v-if="dest === 'sheets'" class="btn" type="button" @click="save(`${slug}.tsv`, preview, 'text/tab-separated-values')"><Icon name="lucide:file-down" /> {{ t('exportHub.download') }}</button>
            <button v-if="dest === 'agents'" class="btn" type="button" data-testid="export-agents-file" @click="save(`${slug}-for-ai.md`, preview, 'text/markdown')"><Icon name="lucide:file-down" /> {{ t('exportHub.download') }}</button>
          </template>
        </div>

        <p class="muted small">{{ td(`exportHub.${dest}.how`) }}</p>
        <!-- Docs preview: the exporter escapes every text from the board. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="dest === 'docs'" class="preview doc" data-testid="export-preview" v-html="preview" />
        <pre v-else class="preview" data-testid="export-preview">{{ preview }}</pre>

        <div v-if="dest === 'files' && board.canUseBoardFile()" class="boardfile">
          <strong><Icon name="lucide:file-lock" /> {{ t('boardFile.export') }}</strong>
          <p class="muted small">{{ t('boardFile.exportHint') }}</p>
          <span class="acts">
            <button class="btn" type="button" data-testid="export-retro" @click="saveBoardFile"><Icon name="lucide:file-lock" /> {{ t('boardFile.export') }}</button>
            <button class="btn" type="button" data-testid="import-retro" @click="fileInput?.click()"><Icon name="lucide:file-up" /> {{ t('boardFile.import') }}</button>
          </span>
          <input ref="fileInput" type="file" accept=".retro,application/json" class="visually-hidden" tabindex="-1" aria-hidden="true" data-testid="import-retro-input" @change="restoreBoardFile" />
        </div>
      </section>
    </div>
  </BaseDialog>
</template>

<style scoped>
.hub { display: grid; grid-template-columns: minmax(12rem, 16rem) 1fr; gap: 1rem; min-height: 0; }
@media (max-width: 720px) { .hub { grid-template-columns: 1fr; } }
.dests { display: grid; gap: .3rem; align-content: start; }
.dest { display: flex; gap: .6rem; align-items: flex-start; padding: .55rem .65rem; text-align: left; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: inherit; cursor: pointer; font: inherit; }
.dest span { display: grid; }
.dest small { font-size: .78rem; }
.dest[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); }
.pane { display: grid; gap: .7rem; align-content: start; min-width: 0; }
.only { display: inline-flex; gap: .4rem; align-items: center; font-weight: 600; }
.acts { display: flex; flex-wrap: wrap; gap: .5rem; }
.small { font-size: .85rem; margin: 0; }
.preview { max-height: 34vh; overflow: auto; margin: 0; padding: .7rem .8rem; border: 1px solid var(--border); border-radius: 10px; background: var(--bg); font-size: .82rem; white-space: pre-wrap; overflow-wrap: anywhere; }
.preview.doc { white-space: normal; font-size: .88rem; }
.boardfile { display: grid; gap: .4rem; padding-top: .7rem; border-top: 1px solid var(--border); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
