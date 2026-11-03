<script setup lang="ts">
/**
 * Simple / Advanced (change simple-advanced-mode). One personal preference shared by the creation page,
 * the share dialog, the export dialog and the profile: it only decides which options are shown.
 */
const { t } = useT()
const settings = useSettingsStore()
</script>

<template>
  <span class="pick-seg mode" role="group" :aria-label="t('mode.label')" data-testid="mode-switch">
    <button type="button" :class="{ on: settings.s.uiMode === 'simple' }" :aria-pressed="settings.s.uiMode === 'simple'" data-testid="mode-simple" @click="settings.patch({ uiMode: 'simple' })"><Icon name="lucide:sparkles" /> {{ t('mode.simple') }}</button>
    <button type="button" :class="{ on: settings.s.uiMode === 'advanced' }" :aria-pressed="settings.s.uiMode === 'advanced'" data-testid="mode-advanced" @click="settings.patch({ uiMode: 'advanced' })"><Icon name="lucide:sliders-horizontal" /> {{ t('mode.advanced') }}</button>
  </span>
</template>

<style scoped>
/* Same segmented control as every other choice in the app (pick-seg in base.css): only its placement is local. */
.mode { width: fit-content; max-width: 100%; align-self: center; justify-self: center; margin-inline: auto; }
.mode button { display: inline-flex; align-items: center; gap: .3rem; }
</style>
