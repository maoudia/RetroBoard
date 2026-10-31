<script setup lang="ts">
import { LOCALES } from '~/i18n'

const { t, locale } = useT()
const settings = useSettingsStore()
function pick(id: 'fr' | 'en') { settings.patch({ locale: id }) }
</script>

<template>
  <span class="loc" role="group" :aria-label="t('profile.language')">
    <button v-for="l in LOCALES" :key="l.id" type="button" :class="{ on: locale === l.id }" :aria-pressed="locale === l.id" :lang="l.id" :title="l.label" :data-testid="`lang-${l.id}`" @click="pick(l.id)">{{ l.id.toUpperCase() }}</button>
  </span>
</template>

<style scoped>
.loc { display: inline-flex; padding: 2px; border-radius: 999px; background: color-mix(in srgb, currentColor 8%, transparent); }
.loc button { padding: .22rem .6rem; border: 0; border-radius: 999px; background: transparent; color: #48484c; font: inherit; font-size: var(--fs-xs); font-weight: 600; letter-spacing: .02em; cursor: pointer; transition: background .2s, color .2s; }
.loc button:hover { color: #1d1d1f; }
.loc button.on { background: #fff; color: #1d1d1f; box-shadow: 0 1px 4px rgb(0 0 0 / .15); }
</style>
