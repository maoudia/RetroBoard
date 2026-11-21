<script setup lang="ts">
// The results line of a revealed round (change scrum-poker): every figure is a word and a number, nothing is told by colour alone.
import type { Statistics } from '@retroboard/application'
import { pt } from '~/poker/strings'

const props = defineProps<{ stats: Statistics; unreadable: number }>()

/** A figure with at most two decimals and no trailing zero: 5.25, 5, 3.67. */
const num = (n: number) => String(Math.round(n * 100) / 100)
const share = computed(() => Math.round(props.stats.consensus * 100))
</script>

<template>
  <section class="results" aria-labelledby="poker-results-title" data-testid="poker-results">
    <h2 id="poker-results-title">{{ pt('poker.results.title') }}</h2>
    <dl v-if="stats.counted > 0" class="line">
      <div v-if="stats.average !== null"><dt>{{ pt('poker.results.average') }}</dt><dd data-testid="poker-average">{{ num(stats.average) }}</dd></div>
      <div v-if="stats.median !== null"><dt>{{ pt('poker.results.median') }}</dt><dd data-testid="poker-median">{{ num(stats.median) }}</dd></div>
      <div><dt>{{ pt('poker.results.mode') }}</dt><dd data-testid="poker-mode">{{ stats.mode.join(', ') }}</dd></div>
      <div v-if="stats.spread"><dt>{{ pt('poker.results.spread') }}</dt><dd data-testid="poker-spread">{{ pt('poker.results.spreadValue', { low: stats.spread.low, high: stats.spread.high }) }}</dd></div>
      <div>
        <dt>{{ pt('poker.results.agreement') }}</dt>
        <dd data-testid="poker-agreement">{{ pt('poker.results.agreementValue', { share }) }}<template v-if="stats.unanimous"> ({{ pt('poker.results.unanimous') }})</template></dd>
      </div>
      <div v-if="stats.suggestion"><dt>{{ pt('poker.results.suggestion') }}</dt><dd class="suggest" data-testid="poker-suggestion">{{ stats.suggestion }}</dd></div>
    </dl>
    <p v-else class="hint" data-testid="poker-no-numbers">{{ pt('poker.results.noNumbers') }}</p>
    <p class="counts" data-testid="poker-counts"><span class="label">{{ pt('poker.results.counts') }}</span> <span v-for="c in stats.counts" :key="c.card" class="count">{{ c.card }} &times; {{ c.votes }}</span></p>
    <p v-if="unreadable > 0" class="hint" role="status" data-testid="poker-unreadable">{{ pt('poker.results.unreadable') }}</p>
  </section>
</template>

<style scoped>
.results { display: grid; gap: var(--sp-2); padding: var(--sp-3) var(--sp-4); border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); }
h2 { margin: 0; font-size: var(--fs-lg); }
.line { margin: 0; display: flex; flex-wrap: wrap; gap: var(--sp-2) var(--sp-5); }
.line div { display: grid; gap: 0; }
dt { font-size: var(--fs-sm); color: var(--muted); }
dd { margin: 0; font-size: var(--fs-xl); font-weight: 700; font-variant-numeric: tabular-nums; }
.suggest { padding: 0 var(--sp-2); border: 2px solid var(--accent); border-radius: var(--r-sm); }
.counts { margin: 0; display: flex; flex-wrap: wrap; gap: var(--sp-1) var(--sp-3); font-size: var(--fs-sm); }
.label { color: var(--muted); }
.count { font-variant-numeric: tabular-nums; }
.hint { margin: 0; font-size: var(--fs-sm); color: var(--muted); }
</style>
