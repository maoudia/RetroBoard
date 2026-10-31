<script setup lang="ts">
import type { LiveFocus } from '~/stores/live'
const { t } = useT()

/** Who else is here (a note being edited or dragged, a column in view). Up to 3 dots, then +n. */
const props = defineProps<{ peers?: LiveFocus[]; testid: string }>()
const { isLeadConn } = useLead()
const shown = computed(() => (props.peers ?? []).slice(0, 3))
const more = computed(() => Math.max(0, (props.peers?.length ?? 0) - 3))
const label = (p: LiveFocus) => p.name || t('common.anonymous')
const title = computed(() => t('live.here', { names: (props.peers ?? []).map((p) => label(p) + (p.typing ? ` (${t('live.typing')})` : '')).join(', ') }))
</script>

<template>
  <span v-if="peers?.length" class="markers" role="img" :aria-label="title" :title="title" :data-testid="testid">
    <span v-for="p in shown" :key="p.conn" class="dot" :class="[`c-${p.color}`, { typing: p.typing, lead: isLeadConn(p.conn) }]">{{ label(p).slice(0, 1).toUpperCase() }}<Icon v-if="isLeadConn(p.conn)" class="crown" name="lucide:crown" :data-testid="`crown-marker-${p.conn}`" /></span>
    <span v-if="more" class="dot more">+{{ more }}</span>
  </span>
</template>

<style scoped>
.markers { display: inline-flex; align-items: center; }
.dot { display: grid; place-items: center; width: 20px; height: 20px; margin-left: -5px; font-size: var(--fs-xs); font-weight: 700; border-radius: 50%; border: 2px solid var(--surface); background: var(--c); color: var(--ink); }
.dot { position: relative; }
.crown { position: absolute; top: -9px; left: 3px; width: 11px; height: 11px; color: var(--text); }
.dot:first-child { margin-left: 0; }
.dot.more { background: var(--surface-2, var(--surface)); color: var(--muted); }
.dot.typing { animation: pulse 1.2s var(--ease) infinite; }
@keyframes pulse { 50% { transform: scale(1.15); } }
:root[data-motion='reduced'] .dot.typing { animation: none; }
.c-0 { --c: var(--note-0); } .c-1 { --c: var(--note-1); } .c-2 { --c: var(--note-2); } .c-3 { --c: var(--note-3); }
.c-4 { --c: var(--note-4); } .c-5 { --c: var(--note-5); } .c-6 { --c: var(--note-6); } .c-7 { --c: var(--note-7); }
</style>
