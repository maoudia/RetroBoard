<script setup lang="ts">
/**
 * Simple / Advanced (change simple-advanced-mode). One personal preference shared by the creation page,
 * the share dialog, the export dialog and the profile: it only decides which options are shown.
 */
const { t } = useT()
const settings = useSettingsStore()
</script>

<template>
  <span class="mode" role="group" :aria-label="t('mode.label')" data-testid="mode-switch">
    <button type="button" :aria-pressed="settings.s.uiMode === 'simple'" data-testid="mode-simple" @click="settings.patch({ uiMode: 'simple' })"><Icon name="lucide:sparkles" /> {{ t('mode.simple') }}</button>
    <button type="button" :aria-pressed="settings.s.uiMode === 'advanced'" data-testid="mode-advanced" @click="settings.patch({ uiMode: 'advanced' })"><Icon name="lucide:sliders-horizontal" /> {{ t('mode.advanced') }}</button>
  </span>
</template>

<style scoped>
.mode { display: inline-flex; flex: none; border: 1px solid var(--control, var(--border)); border-radius: 999px; overflow: hidden; }
button { display: inline-flex; align-items: center; gap: .3rem; min-height: 32px; padding: .2rem .8rem; border: 0; background: transparent; color: var(--text); font: inherit; font-size: var(--fs-sm); font-weight: 600; cursor: pointer; }
button:hover { background: color-mix(in oklab, var(--accent) 12%, transparent); }
button[aria-pressed="true"] { background: var(--accent-soft); color: var(--accent); }
</style>
