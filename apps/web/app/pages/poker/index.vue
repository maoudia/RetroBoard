<script setup lang="ts">
// Scrum Poker demo (change scrum-poker): present only in a build made with NUXT_PUBLIC_POKER_DEMO=1 (see nuxt.config.ts).
import { randomBytes, toBase64Url } from '@retroboard/crypto'
import { formatInvite } from '@retroboard/domain'
import { pt } from '~/poker/strings'

// A demo is never indexed, whatever the indexing switch says.
useHead({ title: computed(() => pt('poker.pageTitle')), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

/** A room is made here, in the browser: its id, its key and the moderator secret never leave this tab except in the link. */
function start() {
  const part = () => toBase64Url(randomBytes(16))
  const fragment = formatInvite({ roomId: part(), roomKey: part(), facilitatorSecret: part() }, 'facilitator')
  void navigateTo({ path: '/poker/room', hash: `#${fragment}` })
}
</script>

<template>
  <main id="main" class="poker-start" data-testid="poker-start">
    <p class="badge" role="note">{{ pt('poker.demo') }}</p>
    <h1>{{ pt('poker.start.title') }}</h1>
    <p class="lead">{{ pt('poker.start.lead') }}</p>
    <button type="button" class="btn btn-primary" data-testid="poker-start-action" @click="start">
      <Icon name="lucide:play" /> {{ pt('poker.start.action') }}
    </button>
    <p class="private">{{ pt('poker.start.private') }}</p>
  </main>
</template>

<style scoped>
.poker-start { max-width: 36rem; margin: 0 auto; padding: var(--sp-6) var(--sp-4); display: grid; gap: var(--sp-4); justify-items: start; }
h1 { margin: 0; font-size: var(--fs-3xl); }
.lead { margin: 0; font-size: var(--fs-lg); }
.private { margin: 0; font-size: var(--fs-sm); color: var(--muted); }
.badge { margin: 0; padding: var(--sp-1) var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-pill); font-size: var(--fs-sm); color: var(--muted); }
@media (max-width: 480px) { .btn-primary { width: 100%; min-height: 48px; justify-content: center; } }
</style>
