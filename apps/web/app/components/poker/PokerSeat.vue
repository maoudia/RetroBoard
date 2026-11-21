<script setup lang="ts">
// One seat of the poker table (change poker-design-v2, K3): the card slot, the avatar, the name on one line, the role and the state as icons.
// Everything that is a picture is hidden from assistive technology and the words are said once, in reading order: "Ann, voted".
// The value of a card is not in the page before the reveal: the face is only rendered once the ballot is open.
import type { SeatView } from '~/poker/client'
import { cardLabel, pt } from '~/poker/strings'
import { hueBg, nameHue } from '~/utils/avatar'

const props = defineProps<{ seat: SeatView; revealed: boolean; /** Place in join order: the cards of a table turn one after the other, 10 ms apart. */ index?: number }>()

const initial = computed(() => [...props.seat.name.trim()][0]?.toUpperCase() ?? '?')
/** What the seat is, for the words and the icon: a card face, nothing played in a revealed round, a card back, an empty slot, or a watcher. */
const kind = computed(() => (!props.seat.voter ? 'watching' : props.seat.card !== null ? 'card' : props.revealed ? 'none' : props.seat.voted ? 'voted' : 'waiting'))
const word = computed(() => (kind.value === 'card' ? cardLabel(props.seat.card!) : pt(`poker.seat.${kind.value}`)))
</script>

<template>
  <li class="seat" :class="{ me: seat.me }" :style="{ '--i': index ?? 0 }" data-testid="poker-seat" :data-voted="seat.voted" :data-revealed="seat.card !== null" :data-watching="!seat.voter" :data-outlier="seat.outlier ?? undefined" :title="seat.name">
    <span class="name">{{ seat.name }}</span>
    <span v-if="seat.me" class="sr-only">, {{ pt('poker.seat.you') }}</span>
    <span class="top">
      <span class="av" aria-hidden="true" :style="hueBg(nameHue(seat.name))">{{ initial }}</span>
      <span v-if="seat.moderator" class="crown"><Icon name="lucide:crown" /><span class="sr-only">, {{ pt('poker.seat.moderator') }}</span></span>
      <Icon v-if="seat.outlier" class="far" :name="seat.outlier === 'highest' ? 'lucide:arrow-up-to-line' : 'lucide:arrow-down-to-line'" aria-hidden="true" data-testid="poker-outlier" />
    </span>
    <span class="sr-only" data-testid="poker-seat-state">, {{ word }}</span>
    <span v-if="seat.outlier" class="sr-only">, {{ pt(`poker.seat.${seat.outlier}`) }}</span>
    <span class="slot" aria-hidden="true">
      <Icon v-if="kind === 'watching'" class="eye" name="lucide:eye" />
      <span v-else class="face">
        <span class="flip">
          <PokerCard class="side" :variant="seat.voted ? 'back' : 'slot'" />
          <PokerCard v-if="seat.card !== null" class="side front" variant="face" :value="seat.card" />
        </span>
      </span>
      <Icon v-if="kind === 'voted'" class="tick" name="lucide:check" />
    </span>
  </li>
</template>

<style scoped>
.seat {
  --av: 20px;
  display: grid; grid-template-areas: "top" "slot" "name"; justify-items: center; align-content: start; gap: 2px; min-width: 0;
  padding: 2px var(--sp-1); border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface);
}
.name { grid-area: name; max-inline-size: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--fs-sm); line-height: 1.2; }
.top { grid-area: top; display: flex; align-items: center; gap: var(--sp-1); }
.av {
  display: grid; place-items: center; inline-size: var(--av); block-size: var(--av); border-radius: 50%;
  color: var(--note-ink); font-size: var(--fs-xs); font-weight: 700; line-height: 1;
}
/* "You": a ring of the accent around the avatar, with a gap, plus the hidden word. */
.me .av { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.crown, .far { display: grid; place-items: center; color: var(--text); font-size: calc(var(--fs-sm) * var(--type-scale, 1)); }
.slot { grid-area: slot; position: relative; display: grid; place-items: center; --poker-card-w: var(--seat-card, 36px); inline-size: var(--poker-card-w); aspect-ratio: 5 / 7; }
.face { perspective: 600px; inline-size: 100%; block-size: 100%; }
/* The flip: 280 ms, eased out, the cards of a table starting 10 ms apart up to 60 ms, so the last one lands at 340 ms, before 400. Its own constant: no token is this long. */
.flip { --flip: 280ms; position: relative; display: block; inline-size: 100%; block-size: 100%; transform-style: preserve-3d; transition: transform var(--flip) ease-out calc(min(var(--i, 0) * 10ms, 60ms)); }
.seat[data-revealed="true"] .flip { transform: rotateY(180deg); }
.side { position: absolute; inset: 0; backface-visibility: hidden; }
.front { transform: rotateY(180deg); }
.eye { color: var(--muted); font-size: var(--fs-xl); }
.tick {
  position: absolute; inset: auto -6px -4px auto; box-sizing: content-box; inline-size: 10px; block-size: 10px; padding: 2px;
  border-radius: 50%; background: var(--accent); color: var(--accent-ink); border: 2px solid var(--surface);
}
/* From the tablet the table is an oval and a seat has the size its table gives it (--seat-card is half its width); the content scales on a wide screen and a TV. */
[data-screen="tablet"] .seat, [data-screen="laptop"] .seat, [data-screen="wide"] .seat, [data-screen="tv"] .seat { --av: calc(24px * var(--type-scale, 1)); }
[data-screen="tablet"] .name, [data-screen="laptop"] .name, [data-screen="wide"] .name, [data-screen="tv"] .name { font-size: calc(var(--fs-sm) * var(--type-scale, 1)); }
@media (forced-colors: active) { .seat { border-color: CanvasText; } .av { border: 1px solid CanvasText; forced-color-adjust: none; } .tick { forced-color-adjust: none; background: Highlight; color: HighlightText; } }
@media (prefers-reduced-motion: reduce) { .flip { transition: none; } }
:root[data-motion="reduced"] .flip { transition: none; }
</style>
