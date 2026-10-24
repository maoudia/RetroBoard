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
.loc button { padding: .22rem .6rem; border: 0; border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: .78rem; font-weight: 600; letter-spacing: .02em; opacity: .65; cursor: pointer; transition: background .2s, opacity .2s; }
.loc button:hover { opacity: 1; }
.loc button.on { background: #fff; color: #1d1d1f; opacity: 1; box-shadow: 0 1px 4px rgb(0 0 0 / .15); }
</style>
