<script setup lang="ts">
// The foot of a poker room (change poker-design-v2, K2): the zone of the thumb. It holds what this person can tap in this state and nothing else.
// Its content sits on the bottom edge, so the hand keeps its place whatever is shown above it.
</script>

<template>
  <div class="dock" data-testid="poker-dock"><slot /></div>
</template>

<style scoped>
.dock {
  display: grid; grid-template-columns: minmax(0, 1fr); align-content: end; gap: var(--sp-2); min-width: 0;
  padding: var(--sp-2) max(var(--sp-1), env(safe-area-inset-right)) calc(var(--sp-2) + env(safe-area-inset-bottom)) max(var(--sp-1), env(safe-area-inset-left));
  border-top: 1px solid var(--border); background: var(--bg);
}
</style>
