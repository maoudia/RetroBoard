<script setup lang="ts">
/** SMS-style counter "143 / 280": orange near the limit, red at it. Screen readers only hear the two thresholds. */
const props = defineProps<{ value: number; max: number }>()
const { t } = useT()
const level = computed(() => (props.value >= props.max ? 'limit' : props.value >= Math.floor(props.max * 0.9) ? 'warn' : 'ok'))
</script>

<template>
  <span class="counter mono" :class="level" :data-level="level" data-testid="note-counter">
    <span aria-hidden="true">{{ value }} / {{ max }}</span>
    <span class="sr-only" role="status">{{ level === 'limit' ? t('note.counter.limit', { max }) : level === 'warn' ? t('note.counter.near', { left: max - value }) : '' }}</span>
  </span>
</template>

<style scoped>
.counter { font-size: .72rem; font-weight: 700; padding: .05rem .4rem; border-radius: 999px; background: color-mix(in oklab, var(--note-ink) 10%, transparent); color: var(--note-ink); }
.counter.warn { background: #ffb020; color: #1b1d2a; }
.counter.limit { background: #c62828; color: #fff; }
</style>
