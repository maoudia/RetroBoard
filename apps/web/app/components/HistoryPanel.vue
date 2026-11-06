<script setup lang="ts">
import type { HistoryEntry } from '@retroboard/application'
const { t, locale } = useT()
const board = useBoardStore()
const { push } = useToasts()
const pending = ref<HistoryEntry | null>(null)
const confirmOpen = ref(false)
const time = (at: number) => new Date(at).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
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
  <Dropdown width="340px">
    <template #trigger="{ toggle, open }">
      <button class="icon-btn" type="button" :aria-expanded="open" aria-haspopup="dialog" data-testid="btn-history" @click="toggle">
        <Icon name="lucide:history" class="ico" /><span>{{ t('history.title') }}</span>
      </button>
    </template>
    <template #default>
      <div class="history" role="region" :aria-label="t('history.title')" data-testid="history-panel">
        <p v-if="!shown.length" class="muted empty">{{ t('history.empty') }}</p>
        <ul v-else>
          <li v-for="e in shown" :key="e.id" data-testid="history-entry">
            <span class="mono muted">{{ time(e.at) }}</span>
            <span class="what">{{ label(e) }}</span>
            <button v-if="board.access.canSteer" class="mini-btn" type="button" :aria-label="t('history.restore.label', { action: label(e) })" data-testid="history-restore" @click="ask(e)">
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
.history { padding: .5rem .6rem; max-height: 50vh; overflow: auto; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; font-size: var(--fs-sm); }
li { display: grid; grid-template-columns: auto 1fr; gap: .1rem .5rem; align-items: baseline; }
.what { min-width: 0; overflow-wrap: anywhere; }
li .mini-btn { grid-column: 2; justify-self: start; }
.empty { margin: 0; font-size: var(--fs-sm); }
</style>
