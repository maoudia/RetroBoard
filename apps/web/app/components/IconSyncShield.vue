<script setup lang="ts">
import type { VaultStatus } from '@retroboard/application'
import { SHIELD_PATH, SYNC_GLYPHS, syncStatusIcon } from '~/utils/sync-status'

/** The sync shield for a state (change sync-ux, group 1): the shield outline and the glyph of `utils/sync-status.ts`. Decorative: the state is said in words beside it. */
const props = defineProps<{ status: VaultStatus }>()
const glyph = computed(() => syncStatusIcon(props.status))
</script>

<template>
  <svg class="sync-icon" :data-glyph="glyph" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path :d="SHIELD_PATH" :stroke-dasharray="glyph === 'off' || glyph === 'unsupported' ? '3 2.2' : undefined" />
    <g class="inner" stroke-width="1.6"><path v-for="d in SYNC_GLYPHS[glyph]" :key="d" :d="d" /></g>
  </svg>
</template>

<style scoped>
.sync-icon { flex: none; overflow: visible; }
.inner { transform-origin: 12px 12.5px; }
.sync-icon[data-glyph="syncing"] .inner { animation: sync-spin 1.2s linear infinite; }
@keyframes sync-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .sync-icon[data-glyph="syncing"] .inner { animation: none; } }
</style>
