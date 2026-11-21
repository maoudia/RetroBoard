<script setup lang="ts">
// Scrum Poker demo room (change scrum-poker, ADR-0042): one tab creates it, others join by the link, cards stay sealed until Reveal.
import { formatInvite, type KeyRing, parseInvite, participantRing } from '@retroboard/domain'
import { DECK, PokerClient, type PokerView } from '~/poker/client'
import { pt } from '~/poker/strings'

// A demo is never indexed, whatever the indexing switch says.
useHead({ title: computed(() => pt('poker.pageTitle')), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const NAME_SLOT = 'retroboard:poker:name'
const ring = ref<KeyRing | null>(null)
const badLink = ref(false)
const name = ref('')
const joined = ref(false)
const view = shallowRef<PokerView | null>(null)
const copied = ref(false)
const shareUrl = ref('')
let client: PokerClient | null = null

onMounted(() => {
  const invite = parseInvite(location.hash)
  if (invite?.kind !== 'encrypted') { badLink.value = true; return }
  ring.value = invite.ring
  // The link people share never carries the moderator secret.
  shareUrl.value = `${location.origin}/poker/room#${formatInvite(participantRing(invite.ring), 'participant')}`
  try { name.value = sessionStorage.getItem(NAME_SLOT) ?? '' } catch { /* private mode: ask again */ }
  if (name.value.trim()) void join()
})
onBeforeUnmount(() => client?.close())

async function join() {
  const who = name.value.trim()
  if (!who || !ring.value || joined.value) return
  try { sessionStorage.setItem(NAME_SLOT, who) } catch { /* kept for this page only */ }
  joined.value = true
  const base = useRuntimeConfig().public.wsUrl || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
  const store = (() => { try { return sessionStorage } catch { return undefined } })()
  client = new PokerClient({ ring: ring.value, name: who, socketBase: base, store, onChange: (v) => { view.value = v } })
  await client.start()
}

async function copy() {
  try { await navigator.clipboard.writeText(shareUrl.value); copied.value = true } catch { copied.value = false }
}

const round = computed(() => view.value?.round ?? null)
const canReveal = computed(() => !!view.value?.moderator && !!round.value && !round.value.revealed && round.value.voted > 0)
const progress = computed(() => (round.value?.revealed ? pt('poker.revealed') : pt('poker.progress', { voted: round.value?.voted ?? 0, total: view.value?.seats.length ?? 0 })))
const locked = computed(() => !round.value || round.value.revealed || view.value?.status === 'full')
</script>

<template>
  <main id="main" class="room" data-testid="poker-room">
    <p v-if="badLink" class="notice" role="alert" data-testid="poker-bad-link">
      {{ pt('poker.error.link') }} <NuxtLink to="/poker" class="btn btn-sm"><Icon name="lucide:arrow-left" /> {{ pt('poker.back') }}</NuxtLink>
    </p>

    <form v-else-if="ring && !joined" class="name" @submit.prevent="join">
      <p class="badge" role="note">{{ pt('poker.demo') }}</p>
      <label for="poker-name">{{ pt('poker.name.label') }}</label>
      <input id="poker-name" v-model="name" type="text" maxlength="24" autocomplete="nickname" data-testid="poker-name">
      <button type="submit" class="btn btn-primary" :disabled="!name.trim()" data-testid="poker-name-join">
        <Icon name="lucide:users" /> {{ pt('poker.name.join') }}
      </button>
    </form>

    <template v-else-if="view">
      <header class="bar">
        <h1 data-testid="poker-round">{{ pt('poker.round', { n: round?.n ?? 1 }) }}</h1>
        <p class="status" role="status" data-testid="poker-status" :data-status="view.status">{{ pt(`poker.status.${view.status}`) }}</p>
      </header>

      <section class="share" :aria-label="pt('poker.share.title')">
        <label for="poker-link">{{ pt('poker.share.label') }}</label>
        <div class="share-row">
          <input id="poker-link" :value="shareUrl" type="text" readonly data-testid="poker-share-url" @focus="($event.target as HTMLInputElement).select()">
          <button type="button" class="btn btn-sm" data-testid="poker-copy" @click="copy"><Icon name="lucide:copy" /> {{ pt(copied ? 'poker.share.copied' : 'poker.share.copy') }}</button>
        </div>
        <p class="hint">{{ pt('poker.share.hint') }}</p>
      </section>

      <section :aria-label="pt('poker.table.title')">
        <h2>{{ pt('poker.table.title') }}</h2>
        <p class="progress" role="status" data-testid="poker-progress">{{ progress }}</p>
        <ul class="seats">
          <li v-for="seat in view.seats" :key="seat.key" class="seat" data-testid="poker-seat" :data-voted="seat.voted" :data-revealed="seat.card !== null">
            <span class="face" aria-hidden="true">
              <span class="flip">
                <span class="back" :data-state="seat.voted ? 'voted' : 'waiting'" />
                <span class="front">{{ seat.card }}</span>
              </span>
            </span>
            <span class="who">
              {{ seat.name }}<span v-if="seat.me"> ({{ pt('poker.seat.you') }})</span>
              <span v-if="seat.moderator" class="tag">{{ pt('poker.seat.moderator') }}</span>
            </span>
            <span class="state" data-testid="poker-seat-state">{{ seat.card !== null ? seat.card : seat.voted ? pt('poker.seat.voted') : pt('poker.seat.waiting') }}</span>
          </li>
        </ul>
      </section>

      <fieldset class="hand" :disabled="locked" data-testid="poker-hand">
        <legend>{{ round?.revealed ? pt('poker.hand.locked') : pt('poker.hand.pick') }}</legend>
        <label v-for="(card, i) in DECK" :key="card" class="pick">
          <input type="radio" name="poker-card" class="sr-only" :value="i" :checked="view.mine === i" :aria-label="pt('poker.hand.card', { card })" :data-testid="`poker-card-${i}`" @change="client?.vote(i)">
          <span>{{ card }}</span>
        </label>
      </fieldset>

      <div v-if="view.moderator" class="actions">
        <button v-if="!round?.revealed" type="button" class="btn btn-primary" :disabled="!canReveal" data-testid="poker-reveal" @click="client?.reveal()">
          <Icon name="lucide:eye" /> {{ pt('poker.reveal') }}
        </button>
        <button v-if="round?.revealed" type="button" class="btn" data-testid="poker-next" @click="client?.nextRound()">
          <Icon name="lucide:rotate-ccw" /> {{ pt('poker.next') }}
        </button>
        <p v-if="!round?.revealed && !canReveal" class="hint">{{ pt('poker.reveal.wait') }}</p>
      </div>
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
.badge, .notice { margin: 0; padding: var(--sp-1) var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-pill); font-size: var(--fs-sm); color: var(--muted); }
.name { display: grid; gap: var(--sp-3); max-width: 24rem; }
.share { display: grid; gap: var(--sp-1); }
.share-row { display: flex; gap: var(--sp-2); }
.share-row input { flex: 1; min-width: 0; }
.seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: var(--sp-3); }
.seat { display: grid; justify-items: center; gap: var(--sp-1); padding: var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); text-align: center; }
.face { perspective: 600px; width: 3.5rem; height: 5rem; }
.flip { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform var(--dur-slow) ease; }
.seat[data-revealed="true"] .flip { transform: rotateY(180deg); }
.back, .front { position: absolute; inset: 0; display: grid; place-items: center; border-radius: var(--r-sm); backface-visibility: hidden; }
.back { border: 2px dashed var(--border); }
.back[data-state="voted"] { border: 2px solid var(--accent); background: var(--accent); }
.front { transform: rotateY(180deg); border: 2px solid var(--accent); background: var(--surface); font-size: var(--fs-2xl); font-weight: 700; }
.who { font-size: var(--fs-sm); overflow-wrap: anywhere; }
.tag { margin-inline-start: var(--sp-1); padding: 0 var(--sp-2); border: 1px solid var(--border); border-radius: var(--r-pill); font-size: var(--fs-xs); }
.state { font-size: var(--fs-xs); color: var(--muted); }
.hand { border: 0; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(3.5rem, 1fr)); gap: var(--sp-2); }
.hand legend { padding: 0; margin-bottom: var(--sp-2); font-size: var(--fs-lg); font-weight: 600; }
.pick { display: block; }
.pick span { display: grid; place-items: center; min-height: 3.5rem; border: 2px solid var(--border); border-radius: var(--r-card); background: var(--surface); font-size: var(--fs-xl); font-weight: 700; cursor: pointer; }
.pick input:checked + span { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
.pick input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }
.hand:disabled .pick span { opacity: .6; cursor: not-allowed; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-3); }
@media (max-width: 480px) { .actions .btn { flex: 1; min-height: 48px; justify-content: center; } }
@media (prefers-reduced-motion: reduce) { .flip { transition: none; } }
</style>
