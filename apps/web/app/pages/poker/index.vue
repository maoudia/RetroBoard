<script setup lang="ts">
// Scrum Poker start page (change scrum-poker, beta): in every build, a lazy route so the landing page pays nothing for it.
// One decision, the deck, then one button. No account, no name yet: the room asks for the name.
import { type DeckError, DEFAULT_PRESET, parseCustomDeck, PRESETS, type PresetId, presetCards, presetOf } from '@retroboard/application'
import { randomBytes, toBase64Url } from '@retroboard/crypto'
import { formatInvite } from '@retroboard/domain'
import { ideaUrl } from '~/utils/feedback'
import { pt } from '~/poker/strings'

const { t } = useT()

// Kept out of every index whatever the switch says, as before the launch: the public page of the product is task 7.1 of the change.
useHead({ title: computed(() => pt('poker.pageTitle')), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

/** The cards as typed: a preset fills the field, and the field is the one source of the deck. */
const typed = ref(presetCards(DEFAULT_PRESET).join(', '))
const field = ref<HTMLInputElement | null>(null)
const deck = computed(() => parseCustomDeck(typed.value))
const chosen = computed<PresetId | null>(() => (deck.value.ok ? presetOf(deck.value.cards) : null))
const problem = computed(() => (deck.value.ok ? '' : pt(`poker.deck.error.${deck.value.error}` as `poker.deck.error.${DeckError}`)))

const label = (id: PresetId) => pt(`poker.deck.${id}` as const)
function pickPreset(id: PresetId) { typed.value = presetCards(id).join(', ') }

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
    <PokerBar />
    <h1>{{ pt('poker.start.title') }} <BetaTag /></h1>
    <p class="lead">{{ pt('poker.start.lead') }}</p>

    <form class="setup" @submit.prevent="start">
      <fieldset class="decks">
        <legend>{{ pt('poker.deck.legend') }}</legend>
        <div class="chips">
          <label v-for="p in PRESETS" :key="p.id" class="chip">
            <input type="radio" name="poker-deck" :checked="chosen === p.id" :data-testid="`poker-deck-${p.id}`" @change="pickPreset(p.id)">
            {{ label(p.id) }}
          </label>
          <label class="chip">
            <input type="radio" name="poker-deck" :checked="chosen === null" data-testid="poker-deck-custom" @change="field?.focus()">
            {{ pt('poker.deck.custom') }}
          </label>
        </div>
        <label class="typed" for="poker-cards">{{ pt('poker.deck.typed') }}</label>
        <input
          id="poker-cards" ref="field" v-model="typed" class="field" type="text" autocomplete="off" spellcheck="false" :placeholder="pt('poker.deck.placeholder')"
          :aria-invalid="!deck.ok" :aria-describedby="deck.ok ? undefined : 'poker-deck-problem'" data-testid="poker-cards">
        <p v-if="problem" id="poker-deck-problem" class="problem" role="alert" data-testid="poker-deck-problem">{{ problem }}</p>
        <ul v-else-if="deck.ok" class="round-chips" :aria-label="pt('poker.deck.cards')" data-testid="poker-deck-cards">
          <li v-for="card in deck.cards" :key="card" class="round-chip">{{ card }}</li>
        </ul>
      </fieldset>

      <details class="colours">
        <summary>{{ pt('poker.colours.title') }}</summary>
        <p>{{ pt('poker.colours.body') }}</p>
      </details>

      <button type="submit" class="btn btn-primary create" :disabled="!deck.ok" data-testid="poker-start-action">
        <Icon name="lucide:play" /> {{ pt('poker.start.action') }}
      </button>
    </form>
    <p class="private">{{ pt('poker.start.private') }}</p>
    <p class="private" data-testid="poker-beta-note">{{ pt('poker.start.beta') }} <a :href="ideaUrl" target="_blank" rel="noopener">{{ t('feedback.idea') }}</a></p>
  </main>
</template>

<style scoped>
.poker-start { max-width: 36rem; margin: 0 auto; padding: var(--sp-6) var(--sp-4); display: grid; gap: var(--sp-4); justify-items: stretch; }
h1 { margin: 0; font-size: var(--fs-3xl); }
.lead { margin: 0; font-size: var(--fs-lg); }
.private { margin: 0; font-size: var(--fs-sm); color: var(--muted); }
.setup { display: grid; gap: var(--sp-4); }
.decks { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; gap: var(--sp-2); }
.decks legend { padding: 0; margin-bottom: var(--sp-2); font-size: var(--fs-lg); font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.typed { font-size: var(--fs-sm); color: var(--muted); }
.problem { margin: 0; font-size: var(--fs-sm); color: var(--danger); }
.round-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.round-chip { display: grid; place-items: center; min-width: 2.5rem; height: 2.5rem; padding: 0 var(--sp-2); border: 2px solid var(--border); border-radius: 999px; background: var(--surface); font-weight: 700; font-variant-numeric: tabular-nums; }
.colours { border: 1px solid var(--border); border-radius: var(--r-card); padding: var(--sp-2) var(--sp-3); }
.colours summary { cursor: pointer; font-weight: 600; }
.colours p { margin: var(--sp-2) 0 0; font-size: var(--fs-sm); color: var(--muted); }
.create { min-height: 3.5rem; justify-content: center; font-size: var(--fs-lg); }
@media (max-width: 480px) { .create { width: 100%; min-height: 48px; } }
</style>
