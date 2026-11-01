<script setup lang="ts">
import type { ConnectionState } from '@retroboard/application'

/** Connection dot (change presence-status): the shape differs per state, colour is never the only cue. */
defineProps<{ state: ConnectionState }>()
const { t } = useT()
</script>

<template>
  <span class="dot" :class="state" :title="t(`presence.${state}`)" :data-state="state" data-testid="conn-dot">
    <span class="sr-only">{{ t(`presence.${state}`) }}</span>
  </span>
</template>

<style scoped>
.dot { display: inline-block; flex: none; width: 10px; height: 10px; border-radius: 50%; box-sizing: border-box; }
.direct { background: var(--success); }
.relay { border: 3px solid var(--warn); background: transparent; }
.reconnecting { border: 2px dashed var(--muted); background: transparent; animation: conn-pulse 1.2s ease-in-out infinite; }
@keyframes conn-pulse { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .reconnecting { animation: none; } }
</style>
