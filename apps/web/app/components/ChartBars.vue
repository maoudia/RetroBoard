<script setup lang="ts">
/**
 * Horizontal bars drawn in SVG (change voting-results-charts). Themed through --ring-* tokens,
 * no chart library. The list text IS the text alternative: label and value are real text, the
 * bar is decorative.
 */
export interface BarRow { id: string; label: string; value: string; /** 0..1 */ ratio: number; /** Ties and leaders draw in the second ring colour. */ highlight?: boolean; hint?: string }
defineProps<{ rows: readonly BarRow[]; label: string }>()
</script>

<template>
  <ol class="bars" :aria-label="label">
    <li v-for="r in rows" :key="r.id" :data-testid="`bar-${r.id}`">
      <span class="top">
        <span class="lbl">{{ r.label }}<small v-if="r.hint" class="muted"> · {{ r.hint }}</small></span>
        <strong class="mono val">{{ r.value }}</strong>
      </span>
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" class="bar">
        <rect class="track" x="0" y="0" width="100" height="6" rx="3" />
        <rect class="fill" :class="{ hl: r.highlight }" x="0" y="0" :width="Math.max(r.ratio > 0 ? 2 : 0, r.ratio * 100)" height="6" rx="3" />
      </svg>
    </li>
  </ol>
</template>

<style scoped>
.bars { display: grid; gap: .55rem; margin: 0; padding: 0; list-style: none; }
.top { display: flex; justify-content: space-between; gap: .75rem; align-items: baseline; }
.lbl { min-width: 0; overflow-wrap: anywhere; }
.bar { display: block; width: 100%; height: .6rem; }
.track { fill: var(--ring-track); }
.fill { fill: var(--ring-1); }
.fill.hl { fill: var(--ring-2); }
</style>
