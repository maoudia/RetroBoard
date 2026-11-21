<script setup lang="ts">
// Scrum Poker start page (change scrum-poker, beta; look from change poker-design-v2, K10): in every build, a lazy route so the landing page pays nothing
// for it. One decision, the deck, then one button. No account, no name yet: the room asks for the name.
import { type DeckError, DEFAULT_PRESET, parseCustomDeck, PRESETS, type PresetId, presetCards } from '@retroboard/application'
import { randomBytes, toBase64Url } from '@retroboard/crypto'
import { formatInvite } from '@retroboard/domain'
import PokerStep from '~/components/poker/PokerStep.vue'
import { pt } from '~/poker/strings'

// Kept out of every index whatever the switch says, as before the launch: the public page of the product is task 7.1 of the change.
useHead({ title: computed(() => pt('poker.pageTitle')), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

/** The cards as typed: a preset fills them, and they are the one source of the deck. The field shows only for Custom. */
const typed = ref(presetCards(DEFAULT_PRESET).join(', '))
const custom = ref(false)
const field = ref<HTMLInputElement | null>(null)
const deck = computed(() => parseCustomDeck(typed.value))
/** The preset chip that is lit: the last one picked, or Custom. */
const picked = ref<PresetId>(DEFAULT_PRESET)
const chosen = computed<PresetId | 'custom'>(() => (custom.value ? 'custom' : picked.value))
const problem = computed(() => (deck.value.ok ? '' : pt(`poker.deck.error.${deck.value.error}` as `poker.deck.error.${DeckError}`)))
// The avatar of the bar is the profile of this browser, as on every page.
onMounted(() => useIdentityStore().load())

const label = (id: PresetId) => pt(`poker.deck.${id}` as const)
function pickPreset(id: PresetId) { picked.value = id; custom.value = false; typed.value = presetCards(id).join(', ') }
async function pickCustom() { custom.value = true; await nextTick(); field.value?.focus() }

/** A room is made here, in the browser: its id, its key and the moderator secret never leave this tab except in the link. */
function start() {
  if (!deck.value.ok) return
  const part = () => toBase64Url(randomBytes(16))
  const ring = { roomId: part(), roomKey: part(), facilitatorSecret: part() }
  // The deck waits in this tab for the room page: the moderator writes it into the room before the first round.
  try { sessionStorage.setItem(`retroboard:poker:deck:${ring.roomId}`, JSON.stringify(deck.value.cards)) } catch { /* the room starts with the default deck */ }
  void navigateTo({ path: '/poker/room', hash: `#${formatInvite(ring, 'facilitator')}` })
}
</script>

<template>
  <main id="main" class="poker-start" data-testid="poker-start">
    <PokerStep @submit="start">
      <h1>{{ pt('poker.start.title') }} <BetaTag /></h1>
      <p class="lead">{{ pt('poker.start.lead') }}</p>

      <fieldset class="decks">
        <legend class="sr-only">{{ pt('poker.deck.legend') }}</legend>
        <div class="chips">
          <label v-for="p in PRESETS" :key="p.id" class="chip">
            <input type="radio" name="poker-deck" :checked="chosen === p.id" :data-testid="`poker-deck-${p.id}`" @change="pickPreset(p.id)">
            {{ label(p.id) }}
          </label>
          <label class="chip">
            <input type="radio" name="poker-deck" :checked="chosen === 'custom'" data-testid="poker-deck-custom" @change="pickCustom">
            {{ pt('poker.deck.custom') }}
          </label>
        </div>
        <ul v-if="deck.ok" class="round-chips" :aria-label="pt('poker.deck.cards')" data-testid="poker-deck-cards">
          <li v-for="card in deck.cards" :key="card" class="round-chip">{{ card }}</li>
        </ul>
        <template v-if="custom">
          <label class="typed" for="poker-cards">{{ pt('poker.deck.typed') }}</label>
          <input
            id="poker-cards" ref="field" v-model="typed" class="field" type="text" autocomplete="off" spellcheck="false" :placeholder="pt('poker.deck.placeholder')"
            :aria-invalid="!deck.ok" :aria-describedby="deck.ok ? undefined : 'poker-deck-problem'" data-testid="poker-cards">
          <p v-if="problem" id="poker-deck-problem" class="problem" role="alert" data-testid="poker-deck-problem">{{ problem }}</p>
        </template>
      </fieldset>

      <p class="private">{{ pt('poker.start.private') }}</p>

      <template #foot>
        <button type="submit" class="btn btn-primary primary" :disabled="!deck.ok" data-testid="poker-start-action">
          <Icon name="lucide:play" /> {{ pt('poker.start.action') }}
        </button>
      </template>
    </PokerStep>
  </main>
</template>

<style scoped>
h1 { margin: 0; font-size: var(--fs-3xl); line-height: 1.1; }
.lead { margin: 0; font-size: var(--fs-lg); }
.private { margin: 0; font-size: var(--fs-sm); color: var(--muted); }
.decks { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: var(--sp-3); }
.chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.chip { min-block-size: 44px; }
.typed { font-size: var(--fs-sm); color: var(--muted); }
.problem { margin: 0; font-size: var(--fs-sm); color: var(--danger); }
.round-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.round-chip { display: grid; place-items: center; min-width: 2.5rem; height: 2.5rem; padding: 0 var(--sp-2); border: 2px solid var(--border); border-radius: 999px; background: var(--surface); font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
