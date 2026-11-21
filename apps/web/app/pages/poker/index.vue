<script setup lang="ts">
// Scrum Poker start page (change scrum-poker, beta; look from change poker-design-v2, K10): in every build, a lazy route so the landing page pays nothing
// for it. One decision, the deck, then one button. No account, no name yet: the room asks for the name.
import { type DeckError, DEFAULT_PRESET, parseCustomDeck, PRESETS, type PresetId, presetCards } from '@retroboard/application'
import { randomBytes, toBase64Url } from '@retroboard/crypto'
import { CARD_HUES, formatInvite } from '@retroboard/domain'
import PokerCard from '~/components/poker/PokerCard.vue'
import PokerStep from '~/components/poker/PokerStep.vue'
import { backColour } from '~/poker/card'
import { pt, type PokerKey } from '~/poker/strings'

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
/** The hue of the card backs of the room, or null for the colours of the theme. */
const hue = ref<number | null>(null)
const back = computed(() => backColour(hue.value))

/** The word for a hue, or for the theme's own colours. */
const hueName = (h: number | null) => pt(h === null ? 'poker.colours.theme' : (`poker.colours.hue.${h}` as PokerKey))
const label = (id: PresetId) => pt(`poker.deck.${id}` as const)
function pickPreset(id: PresetId) { picked.value = id; custom.value = false; typed.value = presetCards(id).join(', ') }
async function pickCustom() { custom.value = true; await nextTick(); field.value?.focus() }

/** A room is made here, in the browser: its id, its key and the moderator secret never leave this tab except in the link. */
function start() {
  if (!deck.value.ok) return
  const part = () => toBase64Url(randomBytes(16))
  const ring = { roomId: part(), roomKey: part(), facilitatorSecret: part() }
  // The deck and the hue wait in this tab for the room page: the moderator writes them into the room before the first round.
  try {
    sessionStorage.setItem(`retroboard:poker:deck:${ring.roomId}`, JSON.stringify(deck.value.cards))
    if (hue.value !== null) sessionStorage.setItem(`retroboard:poker:hue:${ring.roomId}`, JSON.stringify(hue.value))
  } catch { /* the room starts with the default deck and the colours of the theme */ }
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

      <details class="colours" data-testid="poker-colours">
        <summary>{{ pt('poker.colours.title') }}</summary>
        <div class="swatches">
          <div class="pick">
            <fieldset class="hues">
              <legend class="sr-only">{{ pt('poker.colours.group') }}</legend>
              <label class="dot" :class="{ on: hue === null }" :title="hueName(null)">
                <input type="radio" name="poker-hue" :checked="hue === null" :aria-label="hueName(null)" data-testid="poker-hue-theme" @change="hue = null">
                <span class="disc theme" />
              </label>
              <label v-for="h in CARD_HUES" :key="h" class="dot" :class="{ on: hue === h }" :title="hueName(h)">
                <input type="radio" name="poker-hue" :checked="hue === h" :aria-label="hueName(h)" :data-testid="`poker-hue-${h}`" @change="hue = h">
                <span class="disc" :style="{ background: backColour(h)! }" />
              </label>
            </fieldset>
            <p class="picked" data-testid="poker-hue-name">{{ hueName(hue) }}</p>
          </div>
          <span class="preview" role="img" :aria-label="pt('poker.colours.preview')" data-testid="poker-hue-preview" :data-hue="hue ?? 'theme'">
            <PokerCard variant="back" :style="back ? { '--poker-back': back } : undefined" />
          </span>
        </div>
      </details>

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
.colours { border: 1px solid var(--border); border-radius: var(--r-card); padding: var(--sp-1) var(--sp-3); }
.colours summary { display: flex; align-items: center; min-block-size: 44px; cursor: pointer; font-weight: 600; }
.swatches { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding-block: var(--sp-2) var(--sp-3); }
.pick { display: grid; gap: var(--sp-1); }
.hues { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; grid-template-columns: repeat(3, 44px); gap: var(--sp-2); }
.picked { margin: 0; font-size: var(--fs-sm); color: var(--muted); }
.dot { position: relative; display: inline-grid; place-items: center; min-block-size: 44px; min-inline-size: 44px; border-radius: 999px; cursor: pointer; }
.dot input { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; margin: 0; opacity: 0; cursor: pointer; }
.disc { inline-size: 28px; block-size: 28px; border-radius: 50%; }
/* The Theme swatch is half the accent and half the surface of the page: the colours the card back has when nobody picks a hue. */
.disc.theme { background: linear-gradient(135deg, var(--accent) 50%, var(--surface) 50%); border: 2px solid var(--muted); box-sizing: border-box; }
.dot.on { box-shadow: 0 0 0 2px var(--text); }
.dot:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 3px; }
.preview { flex: none; padding: var(--sp-1); --poker-card-w: 56px; }
@media (forced-colors: active) { .dot.on { outline: 2px solid Highlight; } .disc { forced-color-adjust: none; } }
</style>
