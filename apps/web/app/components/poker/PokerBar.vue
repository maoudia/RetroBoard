<script setup lang="ts">
// The top line of the Scrum Poker pages (change scrum-poker): the way back to RetroBoard and the language, the two things a first visit looks for.
import { LOCALES } from '~/i18n'
import { pt } from '~/poker/strings'

const { locale } = useT()
const settings = useSettingsStore()
</script>

<template>
  <div class="top">
    <NuxtLink to="/" class="btn btn-sm" :aria-label="pt('poker.home')" :title="pt('poker.home')" data-testid="poker-home"><Icon name="lucide:arrow-left" /> RetroBoard</NuxtLink>
    <span class="lang" role="group" :aria-label="pt('poker.language')">
      <button v-for="l in LOCALES" :key="l.id" type="button" class="seg" :aria-pressed="locale === l.id" :lang="l.id" :title="l.label" :data-testid="`poker-lang-${l.id}`" @click="settings.patch({ locale: l.id })">{{ l.id.toUpperCase() }}</button>
    </span>
  </div>
</template>

<style scoped>
.top { display: flex; justify-content: space-between; align-items: center; gap: var(--sp-2); }
.lang { display: inline-flex; gap: var(--sp-1); }
.seg { min-width: 2.75rem; min-height: 2.75rem; padding: 0 var(--sp-2); border: 1px solid var(--border); border-radius: var(--r-control); background: var(--surface); color: inherit; font: inherit; font-size: var(--fs-sm); font-weight: 600; cursor: pointer; }
.seg[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); font-weight: 700; }
</style>
