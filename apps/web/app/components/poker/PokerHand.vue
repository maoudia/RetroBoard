<script setup lang="ts">
// The hand of a poker room (changes scrum-poker and poker-design-v2): one radio per card, drawn by PokerCard, in the dock of a phone.
// Up to 14 cards wrap in centred rows; a custom deck of 15 to 24 is one row that snaps sideways. The keys of the keyboard type the name of a card.
import { cardKey, matchTyped, TYPED_MAX, TYPED_RESET_MS } from '@retroboard/application'
import { scrolls } from '~/poker/card'
import { cardLabel, pt } from '~/poker/strings'

const props = defineProps<{ deck: readonly string[]; mine: number | null; /** The hand comes back after a reveal: it rises a little, in 150 ms. */ rise?: boolean }>()
const emit = defineEmits<{ pick: [index: number] }>()

const row = computed(() => scrolls(props.deck.length))
const strip = ref<HTMLElement | null>(null)

let typed = ''
let timer: ReturnType<typeof setTimeout> | undefined

const forget = () => { typed = ''; clearTimeout(timer) }

/** Typed keys that the page itself is not using: not inside a field, a dialog or a menu. */
const onKey = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement | null
  if (e.defaultPrevented || target?.closest('input:not([type="radio"]), textarea, select, [contenteditable], [role="dialog"], [role="menu"]')) return
  const key = cardKey(e)
  if (key === null) return
  typed = `${typed}${key}`.slice(-TYPED_MAX)
  clearTimeout(timer)
  let hit = matchTyped(props.deck, typed)
  // What was typed so far matches nothing: this key alone may start a card.
  if (hit.exact === null && !hit.more && typed !== key) { typed = key; hit = matchTyped(props.deck, typed) }
  if (hit.exact !== null && !hit.more) { emit('pick', hit.exact); return forget() }
  if (hit.exact === null && !hit.more) return forget()
  // A longer card starts with these keys (1 then 3 is 13): wait a moment for the next one, then take the card typed so far.
  timer = setTimeout(() => { const { exact } = matchTyped(props.deck, typed); if (exact !== null) emit('pick', exact); forget() }, TYPED_RESET_MS)
}

/** The chosen card of a sideways row is brought to the middle of it (a reload, a card typed on the keyboard). */
watch(() => props.mine, async () => {
  if (!row.value) return
  await nextTick()
  strip.value?.querySelector<HTMLElement>('input:checked')?.parentElement?.scrollIntoView({ inline: 'center', block: 'nearest' })
}, { immediate: true, flush: 'post' })

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); forget() })
</script>

<template>
  <section class="hand-wrap" :class="{ rise }" :aria-label="pt('poker.hand.title')">
    <fieldset ref="strip" class="hand" :class="{ row }" data-testid="poker-hand">
      <legend class="sr-only">{{ pt('poker.hand.pick') }}</legend>
      <label v-for="(card, i) in deck" :key="card" class="pick">
        <input type="radio" name="poker-card" class="sr-only" :value="i" :checked="mine === i" :aria-label="cardLabel(card)" :data-testid="`poker-card-${i}`" @change="emit('pick', i)">
        <PokerCard variant="face" :value="card" :chosen="mine === i" />
      </label>
    </fieldset>
    <p class="hint keys">{{ pt('poker.hand.keys') }}</p>
  </section>
</template>

<style scoped>
.hand-wrap { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--sp-2); min-width: 0; }
.hand-wrap.rise { animation: rise var(--dur-fast) ease-out; }
@keyframes rise { from { transform: translateY(12px); } }
/* Phone: 46 px cards (44 on a 360 px screen so that seven fit a row), 6 px apart; the rows are 16 px apart and the first has 16 px above it for the lift of the chosen card. */
.hand {
  --poker-card-w: clamp(44px, calc((100vw - 52px) / 7), 46px);
  border: 0; margin: 0; padding: var(--sp-4) 0 0; min-width: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-4) 6px;
}
.hand.row { flex-wrap: nowrap; justify-content: flex-start; overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none; padding-inline: var(--sp-2);
  --fade: linear-gradient(to right, transparent, black 1rem, black calc(100% - 1rem), transparent); -webkit-mask-image: var(--fade); mask-image: var(--fade); }
.hand.row .pick { scroll-snap-align: center; }
.pick { position: relative; display: block; cursor: pointer; border-radius: calc(var(--r-card) * var(--poker-card-k, .45)); transition: transform var(--dur-fast); }
.pick:has(input:focus-visible) :deep(.pcard) { outline: 2px solid var(--text); outline-offset: 6px; }
@media (hover: hover) { .pick:hover { transform: translateY(-2px); } }
.hint { margin: 0; font-size: var(--fs-sm); color: var(--muted); text-align: center; }
/* A phone has no keyboard to type on: the hint is for a device with a fine pointer. */
@media not (pointer: fine) { .keys { display: none; } }
[data-screen="tablet"] .hand { --poker-card-w: 60px; --poker-card-k: .5; }
[data-screen="laptop"] .hand, [data-screen="wide"] .hand, [data-screen="tv"] .hand { --poker-card-w: calc(72px * var(--type-scale)); --poker-card-k: .6; }
@media (prefers-reduced-motion: reduce) { .pick { transition: none; } .pick:hover { transform: none; } .hand-wrap.rise { animation: none; } }
:root[data-motion="reduced"] .hand-wrap.rise { animation: none; }
</style>
