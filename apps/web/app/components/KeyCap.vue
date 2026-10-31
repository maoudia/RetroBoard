<script setup lang="ts">
/** Shortcut hint next to an action (change keyboard-shortcuts-v2): decorative, desktop with a mouse only, off in the profile. */
defineProps<{ k: string }>()
const settings = useSettingsStore()
</script>

<template>
  <kbd v-if="settings.s.shortcuts && settings.s.keyHints" class="keycap" aria-hidden="true" data-testid="keycap">{{ k }}</kbd>
</template>

<style scoped>
.keycap { position: absolute; top: 1px; right: 1px; min-width: 16px; padding: 0 4px; border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 5px; background: var(--surface); color: var(--muted); font: 700 .62rem/1.4 var(--f-mono, ui-monospace, monospace); text-align: center; pointer-events: none; display: none; }
@media (hover: hover) and (pointer: fine) { .keycap { display: block; } }
</style>
