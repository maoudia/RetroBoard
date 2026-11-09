<script setup lang="ts">
import type { HistoryEntry } from '@retroboard/application'
const { t, locale } = useT()
const board = useBoardStore()
const { push } = useToasts()
const pending = ref<HistoryEntry | null>(null)
const confirmOpen = ref(false)
const time = (at: number) => formatClock(at, locale.value)
const hiddenColumns = computed(() => new Set(board.hiddenColumns.map((c) => c.id)))
const label = (e: HistoryEntry) => t(`history.${e.kind}` as never, { name: e.by ?? t('common.anonymous'), text: hiddenColumns.value.has(e.columnId) ? t('history.hidden') : e.text } as never)
/** Newest first: the last thing that went wrong is at the top. Read from the log only while the menu is open (the slot renders then). */
const shown = computed(() => (board.snapshot ? [...board.commands.history()].reverse() : []))

function ask(e: HistoryEntry) { pending.value = e; confirmOpen.value = true }
function restore() {
  const e = pending.value
  if (!e) return
  const out = board.commands.rewind(e.id)
  if (!out.result.ok) { push(t(out.result.error === 'limit-reached' ? 'history.tooMany' : 'history.failed'), 'warn'); return }
  if (!out.sent) { push(t('history.restored.none'), 'info'); return }
  push(t(out.skipped ? 'history.restored.partial' : 'history.restored', { n: out.sent, skipped: out.skipped }), 'ok')
}
</script>

<template>
  <Dropdown width="var(--panel-w)" fixed>
    <template #trigger="{ toggle, open }">
      <button class="icon-btn" type="button" :aria-expanded="open" aria-haspopup="dialog" data-testid="btn-history" @click="toggle">
        <Icon name="lucide:history" class="ico" /><span>{{ t('history.title') }}</span>
      </button>
    </template>
    <template #default>
      <div class="history" role="region" :aria-label="t('history.title')" data-testid="history-panel">
        <p v-if="!shown.length" class="muted panel-empty">{{ t('history.empty') }}</p>
        <ul v-else>
          <li v-for="e in shown" :key="e.id" class="panel-row" data-testid="history-entry">
            <span class="meta">{{ time(e.at) }}</span>
            <span class="body">{{ label(e) }}</span>
            <button v-if="board.access.canSteer" class="btn btn-sm act restore" type="button" :aria-label="t('history.restore.label', { action: label(e) })" data-testid="history-restore" @click="ask(e)">
              <Icon name="lucide:rotate-ccw" /> {{ t('history.restore') }}
            </button>
          </li>
        </ul>
      </div>
    </template>
  </Dropdown>
  <ConfirmDialog v-model:open="confirmOpen" :title="t('history.restore.title')" :message="t('history.restore.message')" :confirm-label="t('history.restore')" confirm-icon="lucide:rotate-ccw" @confirm="restore" />
</template>

<style scoped>
.history { padding: var(--panel-pad); }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--row-gap); }
.restore { min-height: 40px; }
</style>
