<script setup lang="ts">
import { TEMPLATES, type Goal, type Reason, suggestTemplates  } from '@retroboard/domain'
import { GOAL_DEFS, MOOD_VALUES, goalHint, goalLabel, moodLabel, reasonLabel } from '~/utils/labels'
const { t } = useT()

const props = defineProps<{ modelValue: string | null; themeId?: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string]; 'update:minutes': [minutes: number] }>()

const tab = ref<'suggest' | 'all'>('suggest')
const goal = ref<Goal>('fix')
const mood = ref(3)
const minutes = ref(30)
const results = computed(() => suggestTemplates({ goal: goal.value, mood: mood.value, minutes: minutes.value, themeId: props.themeId }))
const TIMES = [15, 30, 45, 60]
const reasonText = (list: Reason[]) => list.map((x) => reasonLabel(x))
</script>

<template>
  <div class="tp">
    <div class="tabs" role="tablist">
      <button type="button" role="tab" :aria-selected="tab === 'suggest'" data-testid="tab-suggest" @click="tab = 'suggest'">
        <Icon name="lucide:wand-sparkles" /> {{ t('tp.suggest') }}
      </button>
      <button type="button" role="tab" :aria-selected="tab === 'all'" data-testid="tab-all" @click="tab = 'all'">
        <Icon name="lucide:layers" /> {{ t('tp.all') }}
      </button>
    </div>

    <div v-if="tab === 'suggest'" class="wizard">
      <fieldset>
        <legend>{{ t('tp.goal') }}</legend>
        <div class="goals">
          <button v-for="g in GOAL_DEFS" :key="g.id" type="button" class="opt" :class="{ on: goal === g.id }" :aria-pressed="goal === g.id" @click="goal = g.id">
            <Icon :name="`lucide:${g.icon}`" /><span><strong>{{ goalLabel(g.id) }}</strong><small>{{ goalHint(g.id) }}</small></span>
          </button>
        </div>
      </fieldset>
      <div class="row">
        <fieldset>
          <legend>{{ t('tp.mood') }}</legend>
          <div class="seg">
            <button v-for="m in MOOD_VALUES" :key="m" type="button" :class="{ on: mood === m }" :aria-pressed="mood === m" :title="moodLabel(m)" @click="mood = m">{{ m }}</button>
          </div>
          <small class="muted">{{ moodLabel(mood) }}</small>
        </fieldset>
        <fieldset>
          <legend>{{ t('tp.time') }}</legend>
          <div class="seg">
            <button v-for="tm in TIMES" :key="tm" type="button" :class="{ on: minutes === tm }" :aria-pressed="minutes === tm" :data-testid="`tp-time-${tm}`" @click="minutes = tm; emit('update:minutes', tm)">{{ t('timer.minutes', { n: tm }) }}</button>
          </div>
        </fieldset>
      </div>
      <ul class="results" data-testid="suggestions">
        <li v-for="(r, i) in results" :key="r.template.id">
          <TemplateCard :template="r.template" :selected="modelValue === r.template.id" :rank="i + 1" :reasons="reasonText(r.reasons)" @pick="emit('update:modelValue', r.template.id)" />
        </li>
      </ul>
    </div>

    <ul v-else class="all" data-testid="all-templates">
      <li v-for="tp in TEMPLATES" :key="tp.id">
        <TemplateCard :template="tp" :selected="modelValue === tp.id" @pick="emit('update:modelValue', tp.id)" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tp { display: grid; gap: 1rem; }
.tabs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; background: var(--surface2); border: 1px solid var(--border); justify-self: start; }
.tabs button { display: inline-flex; align-items: center; gap: .4rem; padding: .4rem .9rem; border: 0; border-radius: 999px; background: transparent; cursor: pointer; font-weight: 600; color: var(--muted); }
.tabs button[aria-selected="true"] { background: var(--accent); color: var(--accent-ink); }
.wizard { display: grid; gap: 1rem; }
fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: .5rem; min-width: 0; }
legend { font-weight: 700; font-size: var(--fs-sm); color: var(--muted); padding: 0; margin-bottom: .4rem; }
.goals { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: .5rem; }
.opt { display: flex; gap: .6rem; align-items: center; padding: .6rem .75rem; text-align: left; cursor: pointer; border: 1.5px solid var(--border); border-radius: var(--r-control); background: var(--surface2); }
.opt :deep(.iconify) { font-size: var(--fs-xl); color: var(--accent); flex: none; }
.opt span { display: grid; }
.opt small { color: var(--muted); font-size: var(--fs-xs); }
.opt.on { border-color: var(--accent); background: var(--accent-soft); }
.row { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.seg { display: inline-flex; border: 1px solid var(--border); border-radius: var(--r-control); overflow: hidden; width: fit-content; }
.seg button { padding: .45rem .85rem; border: 0; border-right: 1px solid var(--border); background: var(--surface2); cursor: pointer; font-weight: 600; }
.seg button:last-child { border-right: 0; }
.seg button.on { background: var(--accent); color: var(--accent-ink); }
.results, .all { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; }
.all { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
</style>
