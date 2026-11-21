<script setup lang="ts">
// The page of a step before the room (change poker-design-v2, K10): the start page and the name step share this one look. A bar, a column of
// content and, in a form, one filled button: fixed at the foot of a phone (48 px, above the safe-area inset), in the flow from 600 px (56 px).
import PokerBar from '~/components/poker/PokerBar.vue'

/** The title of the bar: set for the name step, absent on the start page (whose bar has the way back and the language). */
defineProps<{ title?: string }>()
const emit = defineEmits<{ submit: [] }>()
</script>

<template>
  <div class="step">
    <PokerBar :title="title" />
    <form class="form" @submit.prevent="emit('submit')">
      <div class="body"><slot /></div>
      <div class="foot"><slot name="foot" /></div>
    </form>
  </div>
</template>

<style scoped>
.step { min-block-size: 100dvh; display: flex; flex-direction: column; }
.form { flex: 1; display: flex; flex-direction: column; }
.body { flex: 1; inline-size: 100%; max-inline-size: 36rem; margin-inline: auto; padding: var(--sp-4) var(--sp-4) var(--sp-5); display: grid; gap: var(--sp-4); align-content: start; box-sizing: border-box; }
.foot { position: sticky; inset-block-end: 0; padding: var(--sp-3) var(--sp-4) max(var(--sp-3), env(safe-area-inset-bottom)); border-top: 1px solid var(--border); background: var(--bg); }
.foot :deep(.primary) { inline-size: 100%; min-block-size: 48px; justify-content: center; font-size: var(--fs-lg); box-shadow: var(--shadow-1); }
@media (min-width: 600px) {
  .body { flex: none; padding-bottom: var(--sp-4); }
  .foot { position: static; inline-size: 100%; max-inline-size: 36rem; margin-inline: auto; padding: 0 var(--sp-4) var(--sp-6); border-top: 0; background: transparent; box-sizing: border-box; }
  .foot :deep(.primary) { min-block-size: 56px; }
}
</style>
