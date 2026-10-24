<script setup lang="ts">
import { AGENDA_PRESETS, LIMITS, type PhaseInput, presetPhases } from '@retroboard/domain'
const { t } = useT()

export interface AgendaDraft { enabled: boolean; phases: PhaseInput[]; rules: boolean; autoPublish: boolean }

/** Board creation: the time-boxed agenda (presets 30/45/60/90, reorder, durations, rules). */
const model = defineModel<AgendaDraft>({ required: true })
const PRESETS = Object.keys(AGENDA_PRESETS).map(Number) as (keyof typeof AGENDA_PRESETS)[]
const total = computed(() => model.value.phases.reduce((n, p) => n + p.minutes, 0))
const phaseName = (kind: string) => t(`agenda.phase.${kind}` as never)

const patch = (p: Partial<AgendaDraft>) => { model.value = { ...model.value, ...p } }
const usePreset = (n: keyof typeof AGENDA_PRESETS) => patch({ phases: presetPhases(n) })
function setMinutes(i: number, raw: string) {
  const m = Math.min(LIMITS.maxPhaseMinutes, Math.max(1, Math.round(Number(raw) || 1)))
  patch({ phases: model.value.phases.map((p, k) => (k === i ? { ...p, minutes: m } : p)) })
}
function move(i: number, by: -1 | 1) {
  const list = [...model.value.phases]
  const j = i + by
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j]!, list[i]!]
  patch({ phases: list })
}
const remove = (i: number) => patch({ phases: model.value.phases.filter((_, k) => k !== i) })
</script>

<template>
  <section class="agenda" data-testid="agenda-editor">
    <label class="head">
      <span><strong>{{ t('agenda.use') }}</strong><small class="muted">{{ t('agenda.use.hint') }}</small></span>
      <input type="checkbox" role="switch" class="switch" :checked="model.enabled" data-testid="agenda-enabled" @change="patch({ enabled: ($event.target as HTMLInputElement).checked })" />
    </label>
    <template v-if="model.enabled">
      <div class="presets" role="group" :aria-label="t('agenda.title')">
        <button v-for="n in PRESETS" :key="n" type="button" class="btn btn-sm" :class="{ on: total === n && model.phases.length === 8 }" :data-testid="`agenda-preset-${n}`" @click="usePreset(n)">{{ t('agenda.preset', { n }) }}</button>
      </div>
      <ol class="list">
        <li v-for="(p, i) in model.phases" :key="`${p.kind}-${i}`" :data-testid="`agenda-row-${i}`">
          <span class="nm">{{ phaseName(p.kind) }}</span>
          <input class="field mins" type="number" min="1" :max="LIMITS.maxPhaseMinutes" :value="p.minutes" :aria-label="t('agenda.minutes', { phase: phaseName(p.kind) })" :data-testid="`agenda-minutes-${i}`" @change="setMinutes(i, ($event.target as HTMLInputElement).value)" />
          <button class="mini-btn" type="button" :disabled="i === 0" :aria-label="t('agenda.up', { phase: phaseName(p.kind) })" @click="move(i, -1)"><Icon name="lucide:arrow-up" /></button>
          <button class="mini-btn" type="button" :disabled="i === model.phases.length - 1" :aria-label="t('agenda.down', { phase: phaseName(p.kind) })" @click="move(i, 1)"><Icon name="lucide:arrow-down" /></button>
          <button class="mini-btn" type="button" :disabled="model.phases.length <= 1" :aria-label="t('agenda.remove', { phase: phaseName(p.kind) })" @click="remove(i)"><Icon name="lucide:x" /></button>
        </li>
      </ol>
      <p class="muted" data-testid="agenda-total">{{ t('agenda.totalPlanned', { n: total }) }}</p>
      <label class="opt"><input type="checkbox" :checked="model.rules" data-testid="agenda-rules" @change="patch({ rules: ($event.target as HTMLInputElement).checked })" /> {{ t('agenda.rules') }}</label>
      <label class="opt"><input type="checkbox" :checked="model.autoPublish" data-testid="agenda-autopublish" @change="patch({ autoPublish: ($event.target as HTMLInputElement).checked })" /> {{ t('agenda.autoPublish') }}</label>
    </template>
  </section>
</template>

<style scoped>
.agenda { display: grid; gap: .6rem; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.head > span { display: grid; }
.presets { display: flex; gap: .35rem; flex-wrap: wrap; }
.presets .on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.list { margin: 0; padding: 0; list-style: none; display: grid; gap: .25rem; }
li { display: grid; grid-template-columns: 1fr 5.5rem auto auto auto; gap: .35rem; align-items: center; }
.mins { padding: .3rem .5rem; }
.opt { display: flex; gap: .5rem; align-items: center; }
</style>
