<script setup lang="ts">
// The table of a poker room (changes scrum-poker and poker-design-v2, K3): one seat per person. A phone shows a compact grid of seats; from 600 px the
// seats sit on an ellipse around the table, the person at the bottom centre and the others clockwise in join order, by CSS alone (cos() and sin());
// the DOM stays a list in join order, so the reading order and the tab order do not depend on the picture. Where the browser cannot place by
// trigonometric functions the grid is kept. Alone, a ghost seat opposite invites the team: it opens the same sheet as the Invite button of the bar.
// The middle of the table (a slot) holds the round and its primary action on the oval.
import type { SeatView } from '~/poker/client'
import { pt } from '~/poker/strings'

const props = defineProps<{ seats: readonly SeatView[]; revealed: boolean }>()
const emit = defineEmits<{ invite: [event: Event] }>()

const alone = computed(() => props.seats.length <= 1)
/** Places around the table, the ghost seat included. */
const places = computed(() => props.seats.length + (alone.value ? 1 : 0))
/** The place of a seat counted from the person's own, clockwise: the person is at the bottom (0), the next to join follows. A person with no seat watches from outside the count. */
const mine = computed(() => Math.max(0, props.seats.findIndex((s) => s.me)))
const offset = (i: number) => (i - mine.value + places.value) % places.value
/** The seat size by count (K3): 96 px up to 8 places, 80 up to 14, 64 beyond. */
const size = computed(() => (places.value <= 8 ? 'l' : places.value <= 14 ? 'm' : 's'))
</script>

<template>
  <div class="stage" :data-size="size" :style="{ '--n': places }" data-testid="poker-stage">
    <ul class="seats" :class="{ many: seats.length >= 9 }" data-testid="poker-seats">
      <PokerSeat v-for="(seat, i) in seats" :key="seat.key" :seat="seat" :revealed="revealed" :index="i" :style="{ '--k': offset(i) }" />
      <li v-if="alone" class="ghost-item" :style="{ '--k': 1 }">
        <button type="button" class="ghost" data-testid="poker-ghost" @click="emit('invite', $event)">
          <Icon name="lucide:plus" class="plus" />
          <span>{{ pt('poker.invite') }}</span>
        </button>
      </li>
    </ul>
    <div class="felt" data-testid="poker-felt"><slot name="center" /></div>
  </div>
</template>

<style scoped>
/* Phone: a seat is about 83x97 px on a 390 px phone, four to a row; nine voters or more use the smaller name size. */
.seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: var(--sp-2); }
.felt { display: none; }
@media (max-width: 599px) { .seats.many :deep(.name) { font-size: var(--fs-xs); } }
.ghost-item { display: grid; }
.ghost {
  display: grid; place-items: center; align-content: center; gap: var(--sp-1); min-block-size: 44px; padding: var(--sp-1);
  border: 2px dashed var(--muted); border-radius: var(--r-sm); background: transparent; color: var(--muted); font-size: var(--fs-sm); font-weight: 600; cursor: pointer;
}
.ghost:hover { border-color: var(--accent); color: var(--text); }
.plus { font-size: var(--fs-2xl); }
@media (forced-colors: active) { .ghost { border-color: CanvasText; color: CanvasText; } }

/* The oval, from the tablet, where cos() and sin() exist. The stage fills the room of the table: the ellipse is the stage less
   half a seat on each side (percentages of the stage: container units would read a height of 0 on a stage held at its minimum), and a stage never gets smaller than the count needs, so no two seats overlap (the middle region scrolls instead). The
   sizes are those of K3 and grow with the type scale of a wide screen and a TV. */
@supports (width: calc(cos(45deg) * 1px)) {
  @media (min-width: 600px) {
    .stage {
      --scale: var(--type-scale, 1);
      --seat-w: calc(96px * var(--scale)); --seat-h: calc(120px * var(--scale)); --stage-min: calc(480px * var(--scale));
      position: relative; inline-size: 100%; block-size: 100%; min-block-size: var(--stage-min);
    }
    .stage[data-size="m"] { --seat-w: calc(80px * var(--scale)); --seat-h: calc(104px * var(--scale)); --stage-min: calc(660px * var(--scale)); }
    .stage[data-size="s"] { --seat-w: calc(64px * var(--scale)); --seat-h: calc(92px * var(--scale)); --stage-min: calc(800px * var(--scale)); }
    .seats { display: block; position: absolute; inset: 0; --seat-card: calc(var(--seat-w) / 2); }
    .seats > :deep(li) {
      --a: calc(90deg + 360deg * var(--k) / var(--n));
      position: absolute; inline-size: var(--seat-w); translate: -50% -50%;
      inset-inline-start: calc(50% + cos(var(--a)) * (50% - var(--seat-w) / 2 - 4px)); inset-block-start: calc(50% + sin(var(--a)) * (50% - var(--seat-h) / 2 - 4px));
    }
    .seats > .ghost-item { block-size: calc(var(--seat-h) * .8); }
    .stage[data-size="s"] :deep(.name) { font-size: calc(var(--fs-xs) * var(--scale)); }
    /* The table itself: an oval of the surface in the middle of the stage, holding the round and the primary action. */
    .felt {
      position: absolute; inset: calc(var(--seat-h) + 8px) calc(var(--seat-w) + 8px); border-radius: 50%; border: 1px solid var(--border); background: var(--surface2);
      display: grid; place-content: center; justify-items: center; gap: var(--sp-2); padding: var(--sp-3); text-align: center;
    }
    @media (forced-colors: active) { .felt { border-color: CanvasText; } }
  }
}
</style>
