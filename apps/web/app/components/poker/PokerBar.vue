<script setup lang="ts">
// The top line of the pages that come before a room (change poker-design-v2, K10): the start page (the way back and the language, as the pill of the
// landing page) and the name step (the way back, the name of the page and the overflow menu of the room). Same height as the bar of a room.
import PokerMenu from '~/components/poker/PokerMenu.vue'
import { pt } from '~/poker/strings'

/** With a title the bar is the one of a step in a room (the name step, a bad link); without one it is the one of the start page. */
defineProps<{ title?: string }>()
</script>

<template>
  <header class="top" data-testid="poker-bar">
    <NuxtLink v-if="title" to="/" class="btn btn-ghost round" :aria-label="pt('poker.home')" :title="pt('poker.home')" data-testid="poker-home"><Icon name="lucide:arrow-left" /></NuxtLink>
    <NuxtLink v-else to="/" class="btn btn-sm back" :aria-label="pt('poker.home')" :title="pt('poker.home')" data-testid="poker-home"><Icon name="lucide:arrow-left" /> RetroBoard</NuxtLink>
    <p v-if="title" class="name">{{ title }}</p>
    <PokerMenu v-if="title" />
    <LocaleSwitch v-else class="pill" test-prefix="poker-" />
  </header>
</template>

<style scoped>
.top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-1); min-block-size: 56px; padding: var(--sp-1) var(--sp-2); }
.name { flex: 1; min-inline-size: 0; margin: 0; font-size: var(--fs-lg); font-weight: 700; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.round { min-block-size: 44px; min-inline-size: 44px; padding: 0; }
.back { min-block-size: 44px; }
/* The pill of the landing page, in the inks of the page (a dark room is dark) and with targets of 44 px. */
.pill { --loc-ink: var(--muted); --loc-ink-on: var(--text); --loc-on: var(--surface); }
.pill :deep(button) { min-block-size: 44px; min-inline-size: 44px; }
</style>
