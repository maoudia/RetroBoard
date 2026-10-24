<script setup lang="ts">
import { buildReport } from '@retroboard/application'
import { toReportHtml } from '@retroboard/exporters'
import { td } from '~/i18n'
const { t } = useT()
const ui = useUiStore()
const board = useBoardStore()
const { $ports } = useNuxtApp()
const open = computed({ get: () => ui.dialog === 'report', set: (v) => { if (!v && ui.dialog === 'report') ui.close() } })

/** Computed on this device from the board; nothing is sent anywhere. */
const report = computed(() => (open.value || printing.value) && board.snapshot ? buildReport(board.snapshot, new Date()) : null)
const slug = computed(() => (board.settings?.title ?? 'retro').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'retro')

function download() {
  if (report.value) $ports.file.save(`${slug.value}-report.html`, toReportHtml(report.value, td), 'text/html')
}

/** Prints only the report: a copy outside the dialog, the rest of the page hidden by print CSS. */
const printing = ref(false)
async function print() {
  printing.value = true
  document.documentElement.dataset.print = 'report'
  await nextTick()
  window.print()
  delete document.documentElement.dataset.print
  printing.value = false
}
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('report.title')" width="820px">
    <ReportView v-if="report" :report="report" />
    <template #footer>
      <button class="btn" type="button" data-testid="report-print" @click="print"><Icon name="lucide:printer" /> {{ t('report.print') }}</button>
      <button class="btn btn-primary" type="button" data-testid="report-download" @click="download"><Icon name="lucide:file-down" /> {{ t('report.download') }}</button>
    </template>
  </BaseDialog>
  <Teleport to="body">
    <div v-if="printing && report" class="report-print"><ReportView :report="report" /></div>
  </Teleport>
</template>
