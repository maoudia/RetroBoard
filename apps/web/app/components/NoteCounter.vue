<script setup lang="ts">
/**
 * Compact counter "143 / 160", shown from 80% of the limit (muted, then warning from 90%, alert at the limit).
 * Screen readers hear two thresholds only (polite live region, always rendered so the change is announced).
 */
const props = defineProps<{ value: number; max: number }>()
const { t } = useT()
const level = computed(() => (props.value >= props.max ? 'limit' : props.value >= Math.floor(props.max * 0.9) ? 'warn' : props.value >= Math.floor(props.max * 0.8) ? 'near' : 'ok'))
</script>

<template>
  <span class="counter mono" :class="level" :data-level="level" data-testid="note-counter">
    <span v-if="level !== 'ok'" aria-hidden="true">{{ value }} / {{ max }}</span>
    <span class="sr-only" role="status">{{ level === 'limit' ? t('note.counter.limit', { max }) : level === 'warn' ? t('note.counter.near', { left: max - value }) : '' }}</span>
  </span>
</template>

<style scoped>
/* Ink-based so it reads on every paper colour in light and dark; warning tokens only when it matters. */
.counter { font-size: var(--fs-xs); font-weight: 700; padding: 0 .35rem; border-radius: 999px; color: color-mix(in oklab, var(--note-ink) 78%, transparent); }
.counter.ok { padding: 0; }
.counter.warn { background: #ffb020; color: #1b1d2a; }
.counter.limit { background: #c62828; color: #fff; }
</style>
