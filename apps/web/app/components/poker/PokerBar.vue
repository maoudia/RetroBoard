<script setup lang="ts">
// The bar of every Scrum Poker page (change poker-design-v2): the application's own bar (`AppBar`, the one of a board) with the poker tools in the place
// the board puts its equivalent: Invite is the first tool, as Share is on a board. A room shows the round with one status line; the start page and the
// name step show the name of the page. Language, theme, settings, help and guide links are in the profile dialog of the avatar, as everywhere.
import { pt } from '~/poker/strings'

/** `status` and `state` make it the bar of a room (the round is the page's heading); without them it is the name of the page. `invite` adds the Invite tool. */
defineProps<{ title: string; status?: string; state?: string; invite?: boolean }>()
const emit = defineEmits<{ invite: [event: Event] }>()
</script>

<template>
  <AppBar data-testid="poker-bar" :tools-label="pt('poker.tools')">
    <template #title>
      <div v-if="status !== undefined" class="titles">
        <h1 data-testid="poker-round">{{ title }}</h1>
        <p class="status" data-testid="poker-status" :data-status="state">{{ status }}</p>
      </div>
      <p v-else class="name" data-testid="poker-name-of-page">{{ title }}</p>
    </template>
    <button v-if="invite" type="button" class="icon-btn" :aria-label="pt('poker.invite')" :title="pt('poker.invite')" data-testid="poker-invite" @click="emit('invite', $event)">
      <Icon name="lucide:user-plus" class="ico" /><span class="label">{{ pt('poker.invite') }}</span>
    </button>
  </AppBar>
</template>

<style scoped>
.titles { display: grid; gap: 2px; min-inline-size: 0; }
h1 { margin: 0; font-size: var(--fs-lg); line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status { margin: 0; font-size: var(--fs-sm); color: var(--muted); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name { margin: 0; font-size: var(--fs-lg); font-weight: 700; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
