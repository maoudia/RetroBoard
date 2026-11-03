<script setup lang="ts">
/**
 * Column turns (change ux-irritants-wave-3): a thin strip that says which column is open for writing.
 * The facilitator moves to the previous or next column or stops the turns; everyone else just reads it.
 */
const { t } = useT()
const board = useBoardStore()
const cols = computed(() => board.columns.filter((c) => !c.hidden))
const at = computed(() => cols.value.findIndex((c) => c.id === board.snapshot?.turn))
const current = computed(() => cols.value[at.value] ?? null)
const go = (i: number) => { const c = cols.value[i]; if (c) board.commands.setTurn(c.id) }
</script>

<template>
  <div v-if="current" class="turnbar glass" role="status" data-testid="turn-bar">
    <Icon name="lucide:scan-line" class="ti" />
    <button v-if="board.access.canSteer" class="mini-btn" type="button" :disabled="at <= 0" :aria-label="t('turn.prev')" :title="t('turn.prev')" data-testid="turn-prev" @click="go(at - 1)"><Icon name="lucide:chevron-left" /></button>
    <span class="name"><strong>{{ current.title }}</strong><small class="muted sr-only">{{ t('turn.open.text', { title: current.title }) }}</small></span>
    <span class="muted pos" aria-hidden="true">{{ at + 1 }}/{{ cols.length }}</span>
    <button v-if="board.access.canSteer" class="mini-btn" type="button" :disabled="at >= cols.length - 1" :aria-label="t('turn.next')" :title="t('turn.next')" data-testid="turn-next" @click="go(at + 1)"><Icon name="lucide:chevron-right" /></button>
    <button v-if="board.access.canSteer" class="mini-btn stop" type="button" :aria-label="t('turn.stop')" :title="t('turn.stop')" data-testid="turn-stop" @click="board.commands.setTurn(null)"><Icon name="lucide:x" /></button>
  </div>
</template>

<style scoped>
.turnbar { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: .2rem .75rem; border-bottom: 1px solid var(--border); background: color-mix(in oklab, var(--accent) 10%, var(--surface)); }
.ti { color: var(--accent); }
.name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pos { font-size: var(--fs-sm); font-variant-numeric: tabular-nums; }
.stop { color: var(--danger); }
</style>
