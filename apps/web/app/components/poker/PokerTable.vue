<script setup lang="ts">
// The table of a poker room (change scrum-poker): one seat per person, a card face down once they voted, face up only after the reveal.
import type { SeatView } from '~/poker/client'
import { pt } from '~/poker/strings'

defineProps<{ seats: readonly SeatView[] }>()
</script>

<template>
  <ul class="seats" data-testid="poker-seats">
    <li v-for="seat in seats" :key="seat.key" class="seat" data-testid="poker-seat" :data-voted="seat.voted" :data-revealed="seat.card !== null" :data-watching="!seat.voter">
      <span class="face" aria-hidden="true">
        <span class="flip">
          <PokerCard class="side" :class="{ watching: !seat.voter }" :variant="seat.voted ? 'back' : 'slot'" />
          <PokerCard v-if="seat.card !== null" class="side front" variant="face" :value="seat.card" />
        </span>
      </span>
      <span class="who">
        {{ seat.name }}<span v-if="seat.me"> ({{ pt('poker.seat.you') }})</span>
        <span v-if="seat.moderator" class="tag">{{ pt('poker.seat.moderator') }}</span>
      </span>
      <span class="state" data-testid="poker-seat-state">{{ seat.card !== null ? seat.card : !seat.voter ? pt('poker.seat.watching') : seat.voted ? pt('poker.seat.voted') : pt('poker.seat.waiting') }}</span>
    </li>
  </ul>
</template>

<style scoped>
.seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: var(--sp-3); }
.seat { display: grid; justify-items: center; align-content: start; gap: var(--sp-1); padding: var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); text-align: center; min-width: 0; }
.face { perspective: 600px; --poker-card-w: 44px; inline-size: var(--poker-card-w); aspect-ratio: 5 / 7; }
.flip { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform var(--dur-slow) ease; }
.seat[data-revealed="true"] .flip { transform: rotateY(180deg); }
.side { position: absolute; inset: 0; backface-visibility: hidden; }
.front { transform: rotateY(180deg); }
.watching { opacity: .5; }
.who { font-size: var(--fs-sm); overflow-wrap: anywhere; }
.tag { display: inline-block; white-space: nowrap; margin-inline-start: var(--sp-1); padding: 0 var(--sp-2); border: 1px solid var(--border); border-radius: var(--r-pill); font-size: var(--fs-xs); }
.state { font-size: var(--fs-xs); color: var(--muted); }
@media (max-width: 480px) { .seats { grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr)); gap: var(--sp-2); } }
@media (prefers-reduced-motion: reduce) { .flip { transition: none; } }
</style>
