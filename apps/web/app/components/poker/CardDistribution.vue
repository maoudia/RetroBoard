<script setup lang="ts">
// The distribution of a revealed round (change poker-design-v2, K7): one column per chosen card, in deck order, its count above, its height
// proportional to the count and the card as a small face below. It is a list; the count is text in the picture, never only a colour or a height.
import type { CardCount } from '@retroboard/application'
import { pt } from '~/poker/strings'

const props = defineProps<{ counts: readonly CardCount[] }>()
const top = computed(() => Math.max(1, ...props.counts.map((c) => c.votes)))
const said = (c: CardCount) => (c.votes === 1 ? pt('poker.results.votes.one', { card: c.card }) : pt('poker.results.votes.other', { card: c.card, n: c.votes }))
</script>

<template>
  <ul class="dist" :aria-label="pt('poker.results.distribution')" data-testid="poker-distribution">
    <li v-for="c in counts" :key="c.card" class="item" :style="{ '--share': c.votes / top }" :data-card="c.card" :data-votes="c.votes" data-testid="poker-distribution-item">
      <span class="sr-only">{{ said(c) }}</span>
      <span class="n" aria-hidden="true">{{ c.votes }}</span>
      <span class="bar" aria-hidden="true" />
      <PokerCard class="mini" variant="face" :value="c.card" />
    </li>
  </ul>
</template>

<style scoped>
/* Columns are at least 24 px wide and 4 px apart; their height is at most 24 px on a short phone (the room fits 360x640 with both outliers), 40 px on a tall one and 56 px from the tablet, and 4 px at least for one vote of many. */
.dist { --bar-max: 24px; list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-end; gap: var(--sp-1); }
.item { flex: 0 1 calc(36px * var(--type-scale, 1)); min-inline-size: calc(24px * var(--type-scale, 1)); display: grid; justify-items: center; gap: 2px; }
.n { font-size: calc(var(--fs-sm) * var(--type-scale, 1)); font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
.bar { inline-size: calc(20px * var(--type-scale, 1)); block-size: max(4px, calc(var(--bar-max) * var(--share))); border-radius: var(--r-xs); background: var(--accent); }
.mini { --poker-card-w: calc(24px * var(--type-scale, 1)); --poker-card-k: .3; }
@media (min-height: 760px) { .dist { --bar-max: 40px; } }
[data-screen="tablet"] .dist, [data-screen="laptop"] .dist, [data-screen="wide"] .dist, [data-screen="tv"] .dist { --bar-max: calc(56px * var(--type-scale, 1)); }
@media (forced-colors: active) { .bar { forced-color-adjust: none; background: Highlight; } }
</style>
