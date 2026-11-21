<script setup lang="ts">
// The overflow menu of the Scrum Poker pages (change poker-design-v2, K6): the rare things, one place for the room bar and the name step: language,
// light or dark, the way to suggest an idea and the way back. Dark and light is personal; a room's theme is not chosen here.
import { LOCALES } from '~/i18n'
import { ideaUrl } from '~/utils/feedback'
import { pt } from '~/poker/strings'

const { t, locale } = useT()
const settings = useSettingsStore()
/** The variant on screen, read from the root where the theme writes it (the menu is rendered when it opens): importing the theme store here would move shared code into the entry chunk. */
const variant = () => (import.meta.client && document.documentElement.dataset.variant === 'dark' ? 'dark' : 'light')
</script>

<template>
  <Dropdown menu>
    <template #trigger="{ toggle, open }">
      <button type="button" class="btn btn-ghost round" aria-haspopup="menu" :aria-expanded="open" :aria-label="pt('poker.menu')" :title="pt('poker.menu')" data-testid="poker-menu" @click="toggle">
        <Icon name="lucide:ellipsis" />
      </button>
    </template>
    <template #default="{ close }">
      <button
        v-for="l in LOCALES" :key="l.id" class="dd-item" type="button" role="menuitemradio" :aria-checked="locale === l.id" :lang="l.id" :data-testid="`poker-lang-${l.id}`"
        @click="settings.patch({ locale: l.id }); close()"
      >
        <Icon name="lucide:languages" /> {{ l.label }}
      </button>
      <button class="dd-item" type="button" role="menuitem" data-testid="poker-variant" @click="settings.patch({ variant: variant() === 'dark' ? 'light' : 'dark' }); close()">
        <Icon :name="variant() === 'dark' ? 'lucide:sun' : 'lucide:moon'" /> {{ t(variant() === 'dark' ? 'toolbar.variant.toLight' : 'toolbar.variant.toDark') }}
      </button>
      <a class="dd-item" :href="ideaUrl" target="_blank" rel="noopener" role="menuitem" data-testid="poker-menu-idea" @click="close()"><Icon name="lucide:lightbulb" /> {{ t('feedback.idea') }}</a>
      <NuxtLink to="/" class="dd-item" role="menuitem" data-testid="poker-menu-home" @click="close()"><Icon name="lucide:arrow-left" /> {{ pt('poker.home') }}</NuxtLink>
    </template>
  </Dropdown>
</template>

<style scoped>
.round { min-block-size: 44px; min-inline-size: 44px; padding: 0; }
/* The checked language is a lit row with the text colour (accent text on its own tint falls under 4.5:1 in some themes); the menu rows are 44 px. */
.dd-item { min-block-size: 44px; }
.dd-item[aria-checked="true"] { color: var(--text); font-weight: 700; }
</style>
