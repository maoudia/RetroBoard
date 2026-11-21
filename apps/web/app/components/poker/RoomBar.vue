<script setup lang="ts">
// The bar of a poker room (change poker-design-v2, K6): the way back, the round with one status line under it, Invite, and an overflow menu
// that holds the rare things (language, light or dark, the way back). It is 56 px high and the same on every screen class.
import PokerMenu from '~/components/poker/PokerMenu.vue'
import { pt } from '~/poker/strings'

defineProps<{ title: string; status: string; state: string }>()
const emit = defineEmits<{ invite: [event: Event] }>()
</script>

<template>
  <header class="bar" data-testid="poker-bar">
    <NuxtLink to="/" class="btn btn-ghost round" :aria-label="pt('poker.home')" :title="pt('poker.home')" data-testid="poker-home"><Icon name="lucide:arrow-left" /></NuxtLink>
    <div class="titles">
      <h1 data-testid="poker-round">{{ title }}</h1>
      <p class="status" data-testid="poker-status" :data-status="state">{{ status }}</p>
    </div>
    <button type="button" class="btn btn-ghost invite" :aria-label="pt('poker.invite')" :title="pt('poker.invite')" data-testid="poker-invite" @click="emit('invite', $event)">
      <Icon name="lucide:user-plus" /><span class="label">{{ pt('poker.invite') }}</span>
    </button>
    <PokerMenu />
  </header>
</template>

<style scoped>
.bar { display: flex; align-items: center; gap: var(--sp-1); min-block-size: 56px; padding: var(--sp-1) var(--sp-2); border-bottom: 1px solid var(--border); }
.titles { flex: 1; min-inline-size: 0; display: grid; gap: 2px; }
h1 { margin: 0; font-size: var(--fs-lg); line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status { margin: 0; font-size: var(--fs-sm); color: var(--muted); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.round { min-block-size: 44px; min-inline-size: 44px; padding: 0; }
.invite { min-block-size: 44px; min-inline-size: 44px; padding: 0 var(--sp-2); }
/* The label of Invite shows from the tablet up; on a phone the icon alone carries it (the accessible name stays). */
.label { display: none; }
[data-screen="tablet"] .label, [data-screen="laptop"] .label, [data-screen="wide"] .label, [data-screen="tv"] .label { display: inline; }
</style>
