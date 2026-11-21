<script setup lang="ts">
// The results of a revealed round (change poker-design-v2, K7): the average and the median as two large numbers, the consensus meter with its
// words, the distribution, the outliers as lines with an icon and words, and the suggested card, an action for the moderator ("Use 5").
// Every figure is a word and a number: nothing is told by colour alone, and no number appears twice.
import type { ConsensusLevel, Outliers, Statistics } from '@retroboard/application'
import CardDistribution from '~/components/poker/CardDistribution.vue'
import ConsensusMeter from '~/components/poker/ConsensusMeter.vue'
import { figure } from '~/poker/room-view'
import { pt } from '~/poker/strings'

const props = defineProps<{
  stats: Statistics; verdict: ConsensusLevel | null; outliers: Outliers | null; unreadable: number
  /** The estimate the moderator kept, shown to everybody. */
  decided: string | null
  /** The moderator can keep the suggestion; a voter reads it as text. */
  moderator: boolean
}>()
const emit = defineEmits<{ use: [card: string] }>()

const share = computed(() => Math.round(props.stats.consensus * 100))
/** An ordinal deck has no average: its median is a card, the one the room suggests. */
const median = computed(() => (props.stats.median !== null ? figure(props.stats.median) : props.stats.ordinal ? props.stats.suggestion : null))
const far = computed(() => [
  { kind: 'highest', icon: 'lucide:arrow-up-to-line', key: 'poker.results.highest', found: props.outliers?.highest },
  { kind: 'lowest', icon: 'lucide:arrow-down-to-line', key: 'poker.results.lowest', found: props.outliers?.lowest },
] as const)
</script>

<template>
  <section class="results" :aria-label="pt('poker.results.title')" data-testid="poker-results">
    <dl v-if="stats.counted > 0" class="numbers">
      <div v-if="stats.average !== null"><dt>{{ pt('poker.results.average') }}</dt><dd data-testid="poker-average">{{ figure(stats.average) }}</dd></div>
      <div v-if="median !== null"><dt>{{ pt('poker.results.median') }}</dt><dd data-testid="poker-median">{{ median }}</dd></div>
    </dl>
    <p v-else class="muted" data-testid="poker-no-numbers">{{ pt('poker.results.noNumbers') }}</p>
    <ConsensusMeter v-if="verdict" :level="verdict" :share="share" />
    <CardDistribution class="distribution" :counts="stats.counts" />
    <ul v-if="outliers && (outliers.highest || outliers.lowest)" class="far">
      <template v-for="o in far" :key="o.kind">
        <li v-if="o.found" :data-testid="`poker-outlier-${o.kind}`"><Icon :name="o.icon" /> {{ pt(o.key, { card: o.found.card, names: o.found.voters.join(', ') }) }}</li>
      </template>
    </ul>
    <p v-if="decided !== null" class="estimate" data-testid="poker-estimate"><Icon name="lucide:check" /> {{ pt('poker.results.estimate', { card: decided }) }}</p>
    <template v-else-if="stats.suggestion">
      <button v-if="moderator" type="button" class="btn use" data-testid="poker-use" @click="emit('use', stats.suggestion)">
        <Icon name="lucide:check" /> {{ pt('poker.results.use', { card: stats.suggestion }) }}
      </button>
      <p v-else class="muted" data-testid="poker-suggestion">{{ pt('poker.results.suggested', { card: stats.suggestion }) }}</p>
    </template>
    <p v-if="unreadable > 0" class="muted" role="status" data-testid="poker-unreadable">{{ pt('poker.results.unreadable') }}</p>
  </section>
</template>

<style scoped>
/* The sizes of the content grow with the type scale of a wide screen and a TV (1.125, 1.5); the buttons keep their size. */
.results { --scale: var(--type-scale, 1); display: grid; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); box-shadow: var(--shadow-1); }
.numbers { margin: 0; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: var(--sp-3); text-align: center; }
.numbers div { display: grid; gap: 0; }
dt { font-size: calc(var(--fs-sm) * var(--scale)); color: var(--muted); line-height: 1.2; }
dd { margin: 0; font-family: var(--f-display); font-size: var(--fluid-3xl); font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.1; }
.far { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; font-size: calc(var(--fs-sm) * var(--scale)); }
.far li { display: flex; align-items: center; gap: var(--sp-1); min-inline-size: 0; overflow-wrap: anywhere; }
.estimate { margin: 0; display: flex; align-items: center; justify-content: center; gap: var(--sp-1); min-block-size: 44px; font-size: calc(var(--fs-md) * var(--scale)); font-weight: 700; }
.use { justify-self: center; min-block-size: 44px; }
.muted { margin: 0; font-size: calc(var(--fs-sm) * var(--scale)); color: var(--muted); text-align: center; }
/* A tablet in portrait: the results sit under the table in two columns, the numbers, the meter and the outliers at the left, the distribution at the right. */
@media (min-width: 600px) and (max-width: 1023px) {
  .results { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: var(--sp-4); align-items: center; padding: var(--sp-3) var(--sp-4); }
  .results > * { grid-column: 1; }
  .results > .distribution { grid-column: 2; grid-row: 1 / span 4; align-self: center; }
}
@media (forced-colors: active) { .results { border-color: CanvasText; } }
</style>
