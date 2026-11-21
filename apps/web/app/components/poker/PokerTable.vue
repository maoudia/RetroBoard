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
          <span class="back" :data-state="seat.voted ? 'voted' : seat.voter ? 'waiting' : 'watching'" />
          <span class="front">{{ seat.card }}</span>
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
.face { perspective: 600px; width: 3.5rem; height: 5rem; }
.flip { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform var(--dur-slow) ease; }
.seat[data-revealed="true"] .flip { transform: rotateY(180deg); }
.back, .front { position: absolute; inset: 0; display: grid; place-items: center; border-radius: var(--r-sm); backface-visibility: hidden; }
.back { border: 2px dashed var(--border); }
.back[data-state="voted"] { border: 2px solid var(--accent); background: var(--accent); }
.back[data-state="watching"] { opacity: .5; }
.front { transform: rotateY(180deg); border: 2px solid var(--accent); background: var(--surface); font-size: var(--fs-2xl); font-weight: 700; }
.who { font-size: var(--fs-sm); overflow-wrap: anywhere; }
.tag { display: inline-block; white-space: nowrap; margin-inline-start: var(--sp-1); padding: 0 var(--sp-2); border: 1px solid var(--border); border-radius: var(--r-pill); font-size: var(--fs-xs); }
.state { font-size: var(--fs-xs); color: var(--muted); }
@media (max-width: 480px) { .seats { grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr)); gap: var(--sp-2); } .face { width: 2.75rem; height: 4rem; } }
@media (prefers-reduced-motion: reduce) { .flip { transition: none; } }
</style>
