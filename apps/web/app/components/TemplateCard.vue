<script setup lang="ts">
import { type RetroTemplate, localizeTemplate } from '@retroboard/domain'

const props = defineProps<{ template: RetroTemplate; selected: boolean; rank?: number; reasons?: string[] }>()
const { t, locale } = useT()
const tpl = computed(() => localizeTemplate(props.template, locale.value))
defineEmits<{ pick: [] }>()
</script>

<template>
  <button type="button" class="tc" :class="{ on: selected }" :aria-pressed="selected" :data-testid="`template-${template.id}`" @click="$emit('pick')">
    <span v-if="rank === 1" class="best"><Icon name="lucide:sparkles" /> {{ t('tp.best') }}</span>
    <span class="name">{{ tpl.name }}</span>
    <span class="desc">{{ tpl.description }}</span>
    <span class="cols">
      <span v-for="(c, i) in tpl.columns" :key="c.title" class="col" :style="{ '--c': `var(--note-${i % 8})` }">
        <Icon :name="`lucide:${c.icon}`" />{{ c.title }}
      </span>
    </span>
    <span v-if="reasons?.length" class="why"><Icon name="lucide:check" /> {{ reasons.join(' · ') }}</span>
  </button>
</template>

<style scoped>
.tc {
  position: relative; display: grid; gap: .5rem; width: 100%; padding: .85rem 1rem; text-align: left; cursor: pointer;
  border: 1.5px solid var(--border); border-radius: var(--r-card); background: var(--surface2); color: var(--text);
  transition: transform .2s var(--ease), border-color .2s, box-shadow .2s;
}
.tc:hover { transform: translateY(-2px); border-color: color-mix(in oklab, var(--accent) 55%, var(--border)); }
.tc.on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: color-mix(in oklab, var(--accent) 8%, var(--surface2)); }
.name { font-family: var(--f-display); font-size: 1.2rem; font-weight: 600; }
.desc { color: var(--muted); font-size: .88rem; }
.cols { display: flex; flex-wrap: wrap; gap: 6px; }
.col { display: inline-flex; align-items: center; gap: .35rem; padding: .2rem .6rem; border-radius: 999px; font-size: .78rem; font-weight: 700; background: var(--c); color: var(--note-ink); }
.why { display: flex; align-items: center; gap: .4rem; color: var(--success); font-size: .8rem; font-weight: 600; }
.best { position: absolute; top: -10px; right: 12px; display: inline-flex; gap: .3rem; align-items: center; padding: 2px 10px; border-radius: 999px; font-size: .72rem; font-weight: 800; background: var(--accent2); color: var(--accent-ink); }
</style>
