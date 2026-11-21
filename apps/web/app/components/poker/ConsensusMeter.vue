<script setup lang="ts">
// The consensus of a revealed round (change poker-design-v2, K7): the verdict in words at the left, a bar filled to the share of the cards on
// the most chosen card, the share at the right. It is a meter whose text is its words; the bar is decoration, nothing is told by colour alone.
import type { ConsensusLevel } from '@retroboard/application'
import { pt } from '~/poker/strings'

const props = defineProps<{ level: ConsensusLevel; /** Whole percent, 0 to 100. */ share: number }>()
const words = computed(() => pt(`poker.verdict.${props.level}`))
const shareText = computed(() => pt('poker.results.share', { share: props.share }))
</script>

<template>
  <div class="meter" role="meter" :aria-label="pt('poker.results.meter')" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="share" :aria-valuetext="`${words}, ${shareText}`" :data-level="level" data-testid="poker-meter">
    <span class="words">{{ words }}</span>
    <span class="track" aria-hidden="true"><span class="fill" :style="{ inlineSize: `${share}%` }" /></span>
    <span class="share">{{ shareText }}</span>
  </div>
</template>

<style scoped>
.meter { display: grid; grid-template-columns: auto minmax(2rem, 1fr) auto; align-items: center; gap: var(--sp-2); min-block-size: 28px; font-size: calc(var(--fs-sm) * var(--type-scale, 1)); }
.words { font-weight: 700; min-inline-size: 0; }
.share { font-variant-numeric: tabular-nums; color: var(--muted); }
.track { display: block; block-size: 10px; border-radius: 999px; background: var(--surface2); border: 1px solid var(--border); overflow: hidden; }
.fill { display: block; block-size: 100%; border-radius: 999px; background: var(--accent); }
@media (forced-colors: active) { .track { border-color: CanvasText; } .fill { forced-color-adjust: none; background: Highlight; } }
</style>
