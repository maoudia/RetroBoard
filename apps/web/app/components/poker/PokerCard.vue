<script setup lang="ts">
// The one playing card of a poker room (change poker-design-v2, K4): the hand, the seats and, later, the distribution draw the same card.
// It is decoration: whoever places it names it (the radio of the hand, the seat), so it is hidden from assistive technology.
import { type ValueTier, valueTier } from '~/poker/card'

const props = defineProps<{
  /** A face shows its value, a back shows the pattern of the theme and no text, a slot is the empty place of a card that is not played yet. */
  variant: 'face' | 'back' | 'slot'
  value?: string
  /** The card of the hand that this person played: lifted, ringed and checked (shape, not only colour). */
  chosen?: boolean
}>()

const tier = computed<ValueTier>(() => valueTier(props.value ?? ''))
</script>

<template>
  <span class="pcard" :class="[variant, `t-${tier}`, { chosen }]" aria-hidden="true" data-testid="poker-card-art" :data-variant="variant">
    <template v-if="variant === 'face' && value !== undefined">
      <span class="corner tl">{{ value }}</span>
      <span class="value">{{ value }}</span>
      <span class="corner br">{{ value }}</span>
    </template>
    <Icon v-else-if="variant === 'slot'" class="clock" name="lucide:clock" />
    <Icon v-if="chosen" class="check" name="lucide:check" />
  </span>
</template>

<style scoped>
/* Size: the parent sets --poker-card-w (46 px in a hand on a phone, 36 px on a seat); the ratio is 5:7. The radius follows the size, never a pill. */
.pcard {
  --w: var(--poker-card-w, 46px);
  --k: var(--poker-card-k, .45);
  position: relative; display: grid; place-items: center; flex: none; inline-size: var(--w); aspect-ratio: 5 / 7; container-type: inline-size;
  border: 2px solid var(--muted); border-radius: calc(var(--r-card) * var(--k)); background: var(--surface); color: var(--text);
  font-family: var(--f-display); font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; user-select: none;
  transition: transform var(--dur-fast);
}
.value { font-size: var(--fluid-2xl); letter-spacing: -.02em; }
.t-lg .value { font-size: var(--fluid-xl); }
.t-md .value { font-size: var(--fluid-lg); }
.t-sm .value { font-size: var(--fs-xs); letter-spacing: -.06em; }
.corner { position: absolute; font-size: var(--fs-xs); font-weight: 600; letter-spacing: -.04em; }
.tl { inset: 2px auto auto 3px; }
.br { inset: auto 3px 2px auto; transform: rotate(180deg); }
/* On a card under 41 px wide (a seat on a phone, a label of the distribution) the corners would touch the value: the value alone is enough, sized by the card. */
@container (max-width: 40px) {
  .corner { display: none; }
  .value { font-size: calc(min(var(--fs-lg), 50cqw)); }
  .t-lg .value { font-size: calc(min(var(--fs-md), 40cqw)); }
  .t-md .value, .t-sm .value { font-size: calc(min(var(--fs-xs), 30cqw)); }
}

/* Back: a diamond lattice made of the accent and a mix of the accent and the surface, framed by the surface. No text, no image. It follows the theme (the nine
   themes, light and dark) like every other surface of the room. */
.back { background: var(--surface); }
.back::before {
  content: ''; position: absolute; inset: 3px; border-radius: calc(var(--r-card) * var(--k) * .6);
  background:
    repeating-linear-gradient(45deg, var(--accent) 0 2px, transparent 2px 7px),
    repeating-linear-gradient(-45deg, var(--accent) 0 2px, transparent 2px 7px),
    color-mix(in oklab, var(--accent) 60%, var(--surface));
}
/* Empty slot: a dashed edge and a clock, nothing else. */
.slot { border-style: dashed; background: transparent; color: var(--muted); }
.clock { inline-size: 40%; block-size: auto; aspect-ratio: 1; }

/* Chosen: lifted, a ring with a gap, a check badge. The face keeps the colours of a face: the value keeps the contrast of the text on the surface. */
.chosen { transform: translateY(-10px); box-shadow: 0 0 0 2px var(--bg), 0 0 0 5px var(--accent); }
.check {
  position: absolute; inset: -9px -9px auto auto; box-sizing: content-box; inline-size: 12px; block-size: 12px; padding: 2px;
  border-radius: 50%; background: var(--accent); color: var(--accent-ink); border: 2px solid var(--bg);
}

@media (prefers-reduced-motion: reduce) { .pcard { transition: none; } }

/* Forced colours drop gradients and shadows: the edges, the ring of the chosen card and the badge come from system colours. */
@media (forced-colors: active) {
  .pcard { border-color: CanvasText; forced-color-adjust: none; background: Canvas; color: CanvasText; }
  .back::before { background: CanvasText; opacity: .35; }
  .slot { border-color: GrayText; color: GrayText; }
  .chosen { box-shadow: none; outline: 3px solid Highlight; outline-offset: 2px; border-color: Highlight; }
  .check { background: Highlight; color: HighlightText; border-color: Canvas; }
}
</style>
