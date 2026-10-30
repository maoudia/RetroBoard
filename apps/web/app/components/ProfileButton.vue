<script setup lang="ts">
const { t } = useT()
const identity = useIdentityStore()
const settings = useSettingsStore()
const ui = useUiStore()
const initial = computed(() => (identity.name.trim()[0] ?? '?').toUpperCase())
</script>

<template>
  <button class="avatar" type="button" :aria-label="t('profile.button')" data-testid="btn-profile" :style="{ '--h': settings.s.avatarHue }" @click="ui.open('profile')">
    <span>{{ initial }}</span>
  </button>
</template>

<style scoped>
.avatar { display: grid; place-items: center; width: 38px; height: 38px; min-width: 38px; flex: none; aspect-ratio: 1; padding: 0; border-radius: 50%; border: 2px solid color-mix(in oklab, currentColor 14%, transparent); background: hsl(var(--h) 75% 78%); color: #1b1b1b; font-weight: 800; cursor: pointer; transition: transform .2s var(--ease, ease); }
.avatar:hover { transform: scale(1.08); }
</style>
