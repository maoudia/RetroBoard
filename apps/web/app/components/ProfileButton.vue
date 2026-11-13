<script setup lang="ts">
const { t } = useT()
const identity = useIdentityStore()
const settings = useSettingsStore()
const ui = useUiStore()
const initial = computed(() => (identity.name.trim()[0] ?? '?').toUpperCase())
// The hue is a device setting: bound once mounted, so the prerendered markup carries no style attribute (CSP).
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const hue = computed(() => (mounted.value ? { style: { '--h': settings.s.avatarHue } } : {}))
</script>

<template>
  <button class="avatar" type="button" :aria-label="t('profile.button')" data-testid="btn-profile" v-bind="hue" @click="ui.open('profile')">
    <span>{{ initial }}</span>
  </button>
</template>

<style scoped>
.avatar { --h: 210; display: grid; place-items: center; width: 38px; height: 38px; min-width: 38px; flex: none; aspect-ratio: 1; padding: 0; border-radius: 50%; border: 2px solid color-mix(in oklab, currentColor 14%, transparent); background: hsl(var(--h) 75% 78%); color: #1b1b1b; font-weight: 800; cursor: pointer; transition: transform .2s var(--ease, ease); }
.avatar:hover { transform: scale(1.08); }
</style>
