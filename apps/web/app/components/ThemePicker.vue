<script setup lang="ts">
import { THEMES, THEME_GROUPS } from '@retroboard/themes'
import { suggestThemeForDate } from '@retroboard/domain'
import { themeReasonLabel } from '~/utils/labels'
const { t } = useT()

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
const suggestion = suggestThemeForDate(new Date())
</script>

<template>
  <div class="themes" role="radiogroup" :aria-label="t('theme.label')">
    <section v-for="g in THEME_GROUPS" :key="g.id" class="group">
      <h4>{{ t(g.id === 'pro' ? 'theme.pro' : 'theme.fun') }} <small class="muted">{{ t(g.id === 'pro' ? 'theme.pro.hint' : 'theme.fun.hint') }}</small></h4>
      <div class="grid">
        <button
          v-for="th in THEMES.filter((x) => x.group === g.id)" :key="th.id" type="button" role="radio" class="theme" :aria-checked="modelValue === th.id"
          :data-testid="`theme-${th.id}`" :class="{ on: modelValue === th.id }" @click="emit('update:modelValue', th.id)"
        >
          <span class="preview" :style="{ background: `linear-gradient(135deg, ${th.tokens.bg}, ${th.tokens.bg2})` }">
            <span v-for="(c, i) in th.noteColors.slice(0, 4)" :key="i" class="chip" :style="{ background: c, rotate: `${(i - 1.5) * 5}deg` }" />
            <span class="dot" :style="{ background: th.tokens.accent }" />
          </span>
          <span class="meta">
            <strong>{{ th.emoji }} {{ th.name }}</strong>
            <small>{{ themeText(th).tagline }}</small>
          </span>
          <span v-if="suggestion.themeId === th.id" class="tip" :title="themeReasonLabel(suggestion.reason)">{{ t('theme.suggested') }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.themes { display: grid; gap: 1.1rem; }
h4 { display: flex; align-items: baseline; gap: .6rem; margin-bottom: .5rem; font-size: 1rem; font-family: var(--f-body); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
h4 small { text-transform: none; letter-spacing: 0; font-weight: 500; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: .75rem; }
.theme {
  position: relative; display: grid; gap: .6rem; align-content: start; padding: .5rem .5rem .75rem; text-align: left; cursor: pointer;
  border: 1.5px solid var(--border); border-radius: var(--r-card); background: var(--surface2); color: var(--text);
  transition: transform .2s var(--ease), border-color .2s, box-shadow .2s;
}
.theme:hover { transform: translateY(-3px); }
.theme.on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.preview { position: relative; display: flex; align-items: center; gap: 6px; height: 64px; padding: 0 12px; border-radius: calc(var(--r-card) - 4px); overflow: hidden; }
.chip { width: 26px; height: 30px; border-radius: 3px; box-shadow: 0 3px 8px rgb(0 0 0 / .25); }
.dot { position: absolute; right: 10px; top: 10px; width: 10px; height: 10px; border-radius: 50%; }
.meta { display: grid; gap: 2px; padding: 0 .35rem; }
.meta small { color: var(--muted); font-size: .78rem; line-height: 1.25; }
.tip { position: absolute; top: 10px; left: 10px; padding: 2px 8px; border-radius: 999px; font-size: .68rem; font-weight: 700; background: var(--accent); color: var(--accent-ink); }
</style>
