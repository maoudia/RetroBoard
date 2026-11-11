<script setup lang="ts">
import { fileSize, formatSize, frameDocument, parseDelimited, parseJsonLines, previewKind, type StagedFile } from '~/utils/file-preview'
const { t } = useT()

/**
 * The exact file about to be saved, rendered for its format (change export-hub, task 2.3): report and
 * Docs HTML and Markdown in a sandboxed frame (no script, no same-origin access), CSV and TSV as a table,
 * JSON folded. "Save" writes these very bytes.
 */
const props = defineProps<{ file: StagedFile }>()
const emit = defineEmits<{ save: [], back: [] }>()

/** Rows shown at most: the file itself always holds them all. */
const ROW_CAP = 300
const kind = computed(() => previewKind(props.file))
const size = computed(() => formatSize(fileSize(props.file.content)))
const srcdoc = computed(() => (kind.value === 'html' || kind.value === 'markdown' ? frameDocument(kind.value, props.file.content) : ''))
const rows = computed(() => (kind.value === 'table' ? parseDelimited(props.file.content, props.file.name.endsWith('.tsv') ? '\t' : ',') : []))
const json = computed(() => {
  if (kind.value === 'jsonl') return parseJsonLines(props.file.content)
  if (kind.value !== 'json') return []
  try { return [JSON.parse(props.file.content) as unknown] } catch { return [props.file.content] }
})
</script>

<template>
  <section class="fp" data-testid="file-preview" :aria-label="t('exportHub.preview.title')">
    <header class="head">
      <Icon name="lucide:file-text" />
      <strong data-testid="file-preview-name">{{ file.name }}</strong>
      <span class="muted" data-testid="file-preview-size">{{ size }}</span>
    </header>

    <iframe
      v-if="srcdoc" class="frame" sandbox="" referrerpolicy="no-referrer" :srcdoc="srcdoc" :title="t('exportHub.preview.frame', { name: file.name })" data-testid="file-preview-frame"
    />
    <div v-else-if="kind === 'table'" class="scroll" tabindex="0" role="region" :aria-label="t('exportHub.previewLabel')" data-testid="file-preview-table">
      <table>
        <thead v-if="rows[0]"><tr><th v-for="(c, i) in rows[0]" :key="i" scope="col">{{ c }}</th></tr></thead>
        <tbody><tr v-for="(r, i) in rows.slice(1, ROW_CAP + 1)" :key="i"><td v-for="(c, j) in r" :key="j">{{ c }}</td></tr></tbody>
      </table>
      <p v-if="rows.length - 1 > ROW_CAP" class="muted small">{{ t('exportHub.preview.moreRows', { n: rows.length - 1 - ROW_CAP }) }}</p>
    </div>
    <div v-else-if="kind === 'json' || kind === 'jsonl'" class="scroll" tabindex="0" role="region" :aria-label="t('exportHub.previewLabel')" data-testid="file-preview-json">
      <JsonNode v-for="(v, i) in json" :key="i" :value="v" :name="kind === 'jsonl' ? String(i + 1) : ''" :depth="kind === 'jsonl' ? 1 : 0" />
    </div>
    <p v-else-if="kind === 'opaque'" class="muted" data-testid="file-preview-opaque">{{ t('exportHub.preview.opaque') }}</p>
    <pre v-else class="scroll text" tabindex="0" role="region" :aria-label="t('exportHub.previewLabel')" data-testid="file-preview-text">{{ file.content }}</pre>

    <div class="acts">
      <button class="btn" type="button" data-testid="file-preview-back" @click="emit('back')"><Icon name="lucide:arrow-left" /> {{ t('exportHub.preview.back') }}</button>
      <button class="btn btn-primary" type="button" data-testid="file-preview-save" @click="emit('save')"><Icon name="lucide:save" /> {{ t('exportHub.preview.save') }}</button>
    </div>
  </section>
</template>

<style scoped>
.fp { display: grid; gap: var(--sp-3); min-width: 0; }
.head { display: flex; flex-wrap: wrap; gap: var(--sp-2); align-items: center; }
.head strong { overflow-wrap: anywhere; }
.frame { width: 100%; height: 50vh; border: 1px solid var(--border); border-radius: var(--r-control); color-scheme: light; background: Canvas; }
.scroll { max-height: 50vh; overflow: auto; margin: 0; padding: var(--sp-2) var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-control); background: var(--bg); }
.text { white-space: pre-wrap; overflow-wrap: anywhere; font-size: var(--fs-sm); }
table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
th, td { text-align: left; padding: var(--sp-1) var(--sp-2); border-bottom: 1px solid var(--border); vertical-align: top; overflow-wrap: anywhere; }
th { position: sticky; top: 0; background: var(--surface); white-space: nowrap; overflow-wrap: normal; }
.small { font-size: var(--fs-sm); margin: var(--sp-2) 0 0; }
.acts { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
</style>
