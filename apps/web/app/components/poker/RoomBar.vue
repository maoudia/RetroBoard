<script setup lang="ts">
// The bar of a poker room (change poker-design-v2, K6): the way back, the round with one status line under it, Invite, and an overflow menu
// that holds the rare things (language, light or dark, the way back). It is 56 px high and the same on every screen class.
import { LOCALES } from '~/i18n'
import { pt } from '~/poker/strings'

defineProps<{ title: string; status: string; state: string }>()
const emit = defineEmits<{ invite: [event: Event] }>()

const { t, locale } = useT()
const settings = useSettingsStore()
/** The variant on screen, read from the root where the theme writes it (the menu is rendered when it opens): importing the theme store here would move shared code into the entry chunk. */
const variant = () => (import.meta.client && document.documentElement.dataset.variant === 'dark' ? 'dark' : 'light')
</script>

<template>
  <header class="bar" data-testid="poker-bar">
    <NuxtLink to="/" class="btn btn-ghost round" :aria-label="pt('poker.home')" :title="pt('poker.home')" data-testid="poker-home"><Icon name="lucide:arrow-left" /></NuxtLink>
    <div class="titles">
      <h1 data-testid="poker-round">{{ title }}</h1>
      <p class="status" role="status" data-testid="poker-status" :data-status="state">{{ status }}</p>
    </div>
    <button type="button" class="btn btn-ghost invite" :aria-label="pt('poker.invite')" :title="pt('poker.invite')" data-testid="poker-invite" @click="emit('invite', $event)">
      <Icon name="lucide:user-plus" /><span class="label">{{ pt('poker.invite') }}</span>
    </button>
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
        <NuxtLink to="/" class="dd-item" role="menuitem" data-testid="poker-menu-home" @click="close()"><Icon name="lucide:arrow-left" /> {{ pt('poker.home') }}</NuxtLink>
      </template>
    </Dropdown>
  </header>
</template>

<style scoped>
.bar { display: flex; align-items: center; gap: var(--sp-1); min-block-size: 56px; padding: var(--sp-1) var(--sp-2); border-bottom: 1px solid var(--border); }
.titles { flex: 1; min-inline-size: 0; display: grid; gap: 2px; }
h1 { margin: 0; font-size: var(--fs-lg); line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status { margin: 0; font-size: var(--fs-sm); color: var(--muted); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.round { min-block-size: 44px; min-inline-size: 44px; padding: 0; }
.invite { min-block-size: 44px; min-inline-size: 44px; padding: 0 var(--sp-2); }
/* The checked language is a lit row with the text colour (accent text on its own tint falls under 4.5:1 in some themes); the menu rows are 44 px. */
.dd-item { min-block-size: 44px; }
.dd-item[aria-checked="true"] { color: var(--text); font-weight: 700; }
/* The label of Invite shows from the tablet up; on a phone the icon alone carries it (the accessible name stays). */
.label { display: none; }
[data-screen="tablet"] .label, [data-screen="laptop"] .label, [data-screen="wide"] .label, [data-screen="tv"] .label { display: inline; }
</style>
