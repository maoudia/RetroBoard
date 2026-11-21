<script setup lang="ts">
// The hand of a poker room (change scrum-poker): one radio per card, thumb-sized on a phone, and the keys of the keyboard type the name of a card.
import { cardKey, matchTyped, TYPED_MAX, TYPED_RESET_MS } from '@retroboard/application'
import { cardLabel, pt } from '~/poker/strings'

const props = defineProps<{ deck: readonly string[]; mine: number | null; locked: boolean; watching: boolean }>()
const emit = defineEmits<{ pick: [index: number] }>()

let typed = ''
let timer: ReturnType<typeof setTimeout> | undefined

const forget = () => { typed = ''; clearTimeout(timer) }

/** Typed keys that the page itself is not using: not inside a field, a dialog or a menu. */
const onKey = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement | null
  if (props.locked || props.watching || e.defaultPrevented || target?.closest('input:not([type="radio"]), textarea, select, [contenteditable], [role="dialog"], [role="menu"]')) return
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

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); forget() })
</script>

<template>
  <section class="hand-wrap" :class="{ locked }" :aria-label="pt('poker.hand.title')">
    <p v-if="watching" class="hint" data-testid="poker-watching">{{ pt('poker.hand.watching') }}</p>
    <fieldset v-else class="hand" :disabled="locked" data-testid="poker-hand">
      <legend>{{ locked ? pt('poker.hand.locked') : pt('poker.hand.pick') }}</legend>
      <label v-for="(card, i) in deck" :key="card" class="pick">
        <input type="radio" name="poker-card" class="sr-only" :value="i" :checked="mine === i" :aria-label="cardLabel(card)" :data-testid="`poker-card-${i}`" @change="emit('pick', i)">
        <span aria-hidden="true">{{ card }}</span>
      </label>
    </fieldset>
    <p v-if="!watching && !locked" class="hint">{{ pt('poker.hand.keys') }}</p>
  </section>
</template>

<style scoped>
.hand-wrap { display: grid; gap: var(--sp-2); }
.hand { border: 0; margin: 0; padding: 0; min-width: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(3.5rem, 1fr)); gap: var(--sp-2); }
.hand legend { padding: 0; margin-bottom: var(--sp-2); font-size: var(--fs-lg); font-weight: 600; }
.pick { display: block; }
.pick span { display: grid; place-items: center; min-height: 3.5rem; border: 2px solid var(--border); border-radius: var(--r-card); background: var(--surface); font-size: var(--fs-xl); font-weight: 700; cursor: pointer; transition: transform var(--dur-fast), background-color var(--dur-fast), border-color var(--dur-fast); }
.pick:hover span { border-color: var(--accent); transform: translateY(-2px); }
.pick input:checked + span { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
.pick input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }
.hand:disabled .pick span { opacity: .6; cursor: not-allowed; transform: none; }
.hint { margin: 0; font-size: var(--fs-sm); color: var(--muted); }
/* Phone: the hand is the thumb's: cards at least 56 px high, the hand pinned to the foot of the screen. */
@media (max-width: 480px) {
  .hand-wrap:not(.locked) { position: sticky; bottom: 0; z-index: 2; padding: var(--sp-2) 0; background: var(--bg); border-top: 1px solid var(--border); }
  .hand { grid-template-columns: repeat(auto-fit, minmax(2.75rem, 1fr)); gap: var(--sp-1); }
  .hand legend { font-size: var(--fs-md); margin-bottom: var(--sp-1); }
  .pick span { min-height: 3rem; font-size: var(--fs-lg); }
}
@media (prefers-reduced-motion: reduce) { .pick span { transition: none; } .pick:hover span { transform: none; } }
</style>
