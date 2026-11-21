<script setup lang="ts">
// Scrum Poker room (change scrum-poker, ADR-0042, beta): one tab creates it, others join by the link, cards stay sealed until Reveal.
import { formatInvite, type KeyRing, parseInvite, participantRing } from '@retroboard/domain'
import { isValidDeck } from '@retroboard/domain'
import PokerBar from '~/components/poker/PokerBar.vue'
import PokerHand from '~/components/poker/PokerHand.vue'
import PokerResults from '~/components/poker/PokerResults.vue'
import PokerTable from '~/components/poker/PokerTable.vue'
import { PokerClient, type PokerView } from '~/poker/client'
import { pt } from '~/poker/strings'

// A room is never indexed, whatever the indexing switch says (and `/poker/room` is a private prefix of the shell and of the Worker).
useHead({ title: computed(() => pt('poker.pageTitle')), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const NAME_SLOT = 'retroboard:poker:name'
const ring = ref<KeyRing | null>(null)
const badLink = ref(false)
const name = ref('')
const joined = ref(false)
const view = shallowRef<PokerView | null>(null)
const copied = ref(false)
/** The share sheet of the phone, when the browser has one: the link is handed to it, never to a server. */
const canShare = ref(false)
const qrOpen = ref(false)
const shareUrl = ref('')
let client: PokerClient | null = null

onMounted(() => {
  const invite = parseInvite(location.hash)
  if (invite?.kind !== 'encrypted') { badLink.value = true; return }
  ring.value = invite.ring
  // The link people share never carries the moderator secret.
  shareUrl.value = `${location.origin}/poker/room#${formatInvite(participantRing(invite.ring), 'participant')}`
  canShare.value = typeof navigator.share === 'function'
  try { name.value = sessionStorage.getItem(NAME_SLOT) ?? '' } catch { /* private mode: ask again */ }
  // A reload keeps the seat; a first visit offers the name this browser already uses for boards, to confirm.
  const known = name.value.trim() !== ''
  if (!known) { const identity = useIdentityStore(); identity.load(); name.value = identity.name }
  if (known) void join()
})
onBeforeUnmount(() => client?.close())

async function join() {
  const who = name.value.trim()
  if (!who || !ring.value || joined.value) return
  try { sessionStorage.setItem(NAME_SLOT, who) } catch { /* kept for this page only */ }
  joined.value = true
  const base = useRuntimeConfig().public.wsUrl || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
  const store = (() => { try { return sessionStorage } catch { return undefined } })()
  const kept = (() => { try { return JSON.parse(store?.getItem(`retroboard:poker:deck:${ring.value.roomId}`) ?? 'null') as unknown } catch { return null } })()
  client = new PokerClient({ ring: ring.value, name: who, deck: isValidDeck(kept) ? kept : undefined, socketBase: base, store, onChange: (v) => { view.value = v } })
  await client.start()
}

async function copy() {
  try { await navigator.clipboard.writeText(shareUrl.value); copied.value = true } catch { copied.value = false }
}
async function share() {
  try { await navigator.share({ title: pt('poker.pageTitle'), url: shareUrl.value }) } catch { /* closed without sharing */ }
}

const round = computed(() => view.value?.round ?? null)
const canReveal = computed(() => !!view.value?.canReveal && (round.value?.voted ?? 0) > 0)
const progress = computed(() => (round.value?.revealed ? pt('poker.revealed') : pt('poker.progress', { voted: round.value?.voted ?? 0, total: round.value?.voters ?? 0 })))
const locked = computed(() => !round.value || round.value.revealed || view.value?.status === 'full')
const title = computed(() => pt(round.value?.revote ? 'poker.round.revote' : 'poker.round', { n: round.value?.n ?? 1 }))
const boardHref = computed(() => `/boards${location.hash}`)
</script>

<template>
  <main id="main" class="room" data-testid="poker-room">
    <PokerBar />
    <p v-if="badLink" class="notice" role="alert" data-testid="poker-bad-link">
      {{ pt('poker.error.link') }} <NuxtLink to="/poker" class="btn btn-sm"><Icon name="lucide:arrow-left" /> {{ pt('poker.back') }}</NuxtLink>
    </p>

    <form v-else-if="ring && !joined" class="name" @submit.prevent="join">
      <label for="poker-name">{{ pt('poker.name.label') }}</label>
      <input id="poker-name" v-model="name" class="field" type="text" maxlength="24" autocomplete="nickname" data-testid="poker-name">
      <p class="hint">{{ pt('poker.name.hint') }}</p>
      <button type="submit" class="btn btn-primary" :disabled="!name.trim()" data-testid="poker-name-join">
        <Icon name="lucide:users" /> {{ pt('poker.name.join') }}
      </button>
    </form>

    <template v-else-if="view">
      <p v-if="view.status === 'board'" class="notice" role="alert" data-testid="poker-board-hint">
        {{ pt('poker.board.hint') }} <a :href="boardHref" class="btn btn-sm"><Icon name="lucide:layout-dashboard" /> {{ pt('poker.board.open') }}</a>
      </p>
      <template v-else>
        <header class="bar">
          <h1 data-testid="poker-round">{{ title }}</h1>
          <p class="status" role="status" data-testid="poker-status" :data-status="view.status">{{ pt(`poker.status.${view.status}`) }}</p>
        </header>

        <section class="share" :aria-label="pt('poker.share.title')">
          <label for="poker-link">{{ pt('poker.share.label') }}</label>
          <div class="share-row">
            <input id="poker-link" class="field" :value="shareUrl" type="text" readonly data-testid="poker-share-url" @focus="($event.target as HTMLInputElement).select()">
            <button type="button" class="btn btn-sm" data-testid="poker-copy" @click="copy"><Icon name="lucide:copy" /> {{ pt(copied ? 'poker.share.copied' : 'poker.share.copy') }}</button>
            <button v-if="canShare" type="button" class="btn btn-sm" data-testid="poker-share" @click="share"><Icon name="lucide:share-2" /> {{ pt('poker.share.native') }}</button>
          </div>
          <details class="qrbox" @toggle="qrOpen = ($event.target as HTMLDetailsElement).open">
            <summary data-testid="poker-qr-toggle">{{ pt('poker.share.qr') }}</summary>
            <QrCode v-if="qrOpen" :value="shareUrl" :label="pt('poker.share.qrLabel')" :size="200" />
          </details>
          <p class="hint">{{ pt('poker.share.hint') }}</p>
        </section>

        <section :aria-label="pt('poker.table.title')">
          <h2>{{ pt('poker.table.title') }}</h2>
          <p class="progress" role="status" data-testid="poker-progress">{{ progress }}</p>
          <p v-if="view.seats.length <= 1" class="hint alone" data-testid="poker-alone">{{ pt('poker.alone') }}</p>
          <PokerTable :seats="view.seats" />
        </section>

        <PokerResults v-if="view.stats" :stats="view.stats" :unreadable="view.unreadable" />

        <div v-if="view.moderator && round" class="actions">
          <button v-if="!round.revealed" type="button" class="btn btn-primary" :disabled="!canReveal" data-testid="poker-reveal" @click="client?.reveal()">
            <Icon name="lucide:eye" /> {{ pt('poker.reveal') }}
          </button>
          <template v-else>
            <button type="button" class="btn btn-primary" data-testid="poker-revote" @click="client?.nextRound(true)">
              <Icon name="lucide:rotate-ccw" /> {{ pt('poker.revote') }}
            </button>
            <button type="button" class="btn" data-testid="poker-next" @click="client?.nextRound()">
              <Icon name="lucide:skip-forward" /> {{ pt('poker.next') }}
            </button>
          </template>
          <p v-if="!round.revealed && !view.canReveal" class="hint">{{ pt('poker.reveal.holder') }}</p>
          <p v-else-if="!round.revealed && !canReveal" class="hint">{{ pt('poker.reveal.wait') }}</p>
        </div>
        <p v-else-if="round" class="hint" data-testid="poker-participant-wait">{{ pt(round.revealed ? 'poker.wait.next' : 'poker.wait.reveal') }}</p>

        <PokerHand v-if="round" :deck="round.deck" :mine="view.mine" :locked="locked" :watching="!view.voter" @pick="client?.vote($event)" />
      </template>
    </template>
  </main>
</template>

<style scoped>
.room { max-width: 44rem; margin: 0 auto; padding: var(--sp-4); display: grid; gap: var(--sp-5); }
h1 { margin: 0; font-size: var(--fs-2xl); }
h2 { margin: 0 0 var(--sp-2); font-size: var(--fs-lg); }
.bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: var(--sp-2); }
.status, .hint, .progress { margin: 0; font-size: var(--fs-sm); color: var(--muted); }
.progress { margin-bottom: var(--sp-3); }
.notice { margin: 0; padding: var(--sp-1) var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-pill); font-size: var(--fs-sm); color: var(--muted); }
.name { display: grid; gap: var(--sp-3); max-width: 24rem; }
.share { display: grid; gap: var(--sp-1); }
.share-row { display: flex; gap: var(--sp-2); }
.share-row input { flex: 1; min-width: 0; }
.qrbox summary { cursor: pointer; font-size: var(--fs-sm); }
.qrbox :deep(svg) { margin-top: var(--sp-2); }
.alone { margin-bottom: var(--sp-3); }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-3); }
@media (max-width: 480px) { .actions .btn { flex: 1; min-height: 48px; justify-content: center; } }
</style>
