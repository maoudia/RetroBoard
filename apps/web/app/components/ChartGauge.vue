<script setup lang="ts">
/** Half-circle gauge in SVG: share 0..1 with a centre text. Text alternative = the caption below. */
const props = defineProps<{ share: number; centre: string }>()
const R = 40
const half = Math.PI * R
const dash = computed(() => `${half * Math.max(0, Math.min(1, props.share))} ${half * 2}`)
</script>

<template>
  <svg viewBox="0 0 100 56" class="gauge" aria-hidden="true">
    <path class="track" d="M10 50 A40 40 0 0 1 90 50" />
    <path class="fill" d="M10 50 A40 40 0 0 1 90 50" :stroke-dasharray="dash" />
    <text x="50" y="46" text-anchor="middle" class="mono">{{ centre }}</text>
  </svg>
</template>

<style scoped>
.gauge { width: 100%; max-width: 180px; }
path { fill: none; stroke-width: 9; stroke-linecap: round; }
.track { stroke: var(--ring-track); }
.fill { stroke: var(--ring-1); }
text { fill: var(--text); font-size: 14px; font-weight: 800; }
</style>
