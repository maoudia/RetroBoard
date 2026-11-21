<script setup lang="ts">
// The table of a poker room (changes scrum-poker and poker-design-v2): one seat per person, a compact grid on a phone.
// Alone, a ghost seat invites the team: it opens the same sheet as the Invite button of the bar.
import type { SeatView } from '~/poker/client'
import { pt } from '~/poker/strings'

defineProps<{ seats: readonly SeatView[]; revealed: boolean }>()
const emit = defineEmits<{ invite: [event: Event] }>()
</script>

<template>
  <ul class="seats" :class="{ many: seats.length >= 9 }" data-testid="poker-seats">
    <PokerSeat v-for="(seat, i) in seats" :key="seat.key" :seat="seat" :revealed="revealed" :index="i" />
    <li v-if="seats.length <= 1" class="ghost-item">
      <button type="button" class="ghost" data-testid="poker-ghost" @click="emit('invite', $event)">
        <Icon name="lucide:plus" class="plus" />
        <span>{{ pt('poker.invite') }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
/* A seat is about 83x96 px on a 390 px phone: four to a row; nine voters or more use the smaller name size. */
.seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: var(--sp-2); }
.seats.many :deep(.name) { font-size: var(--fs-xs); }
.ghost-item { display: grid; }
.ghost {
  display: grid; place-items: center; align-content: center; gap: var(--sp-1); min-block-size: 44px; padding: var(--sp-1);
  border: 2px dashed var(--muted); border-radius: var(--r-sm); background: transparent; color: var(--muted); font-size: var(--fs-sm); font-weight: 600; cursor: pointer;
}
.ghost:hover { border-color: var(--accent); color: var(--text); }
.plus { font-size: var(--fs-2xl); }
@media (forced-colors: active) { .ghost { border-color: CanvasText; color: CanvasText; } }
</style>
