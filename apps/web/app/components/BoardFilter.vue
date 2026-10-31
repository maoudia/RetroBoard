<script setup lang="ts">
import { isFilterActive, matchesFilter } from '@retroboard/application'
import { NOTE_COLOR_COUNT } from '@retroboard/domain'
const { t } = useT()
const ui = useUiStore()
const board = useBoardStore()

/** My view only: hides notes on my screen, never on the others'. */
const notes = computed(() => board.snapshot?.notes ?? [])
const authors = computed(() => [...new Set(notes.value.map((n) => n.author).filter((a): a is string => !!a))].sort((a, b) => a.localeCompare(b)))
const shown = computed(() => notes.value.filter((n) => matchesFilter(n, ui.filter)).length)
const active = computed(() => isFilterActive(ui.filter))
const input = ref<HTMLInputElement | null>(null)

function toggleColor(c: number) {
  const colors = ui.filter.colors.includes(c) ? ui.filter.colors.filter((x) => x !== c) : [...ui.filter.colors, c]
  ui.filter = { ...ui.filter, colors }
}
function close() { ui.resetFilter(); ui.filterOpen = false }
onMounted(() => input.value?.focus())
</script>

<template>
  <section class="filter glass" role="search" :aria-label="t('filter.title')" data-testid="board-filter">
    <Icon name="lucide:search" class="ico" />
    <input
      ref="input" class="field" type="search" :value="ui.filter.text" :placeholder="t('filter.placeholder')" :aria-label="t('filter.text')"
      data-testid="filter-text" @input="ui.filter = { ...ui.filter, text: ($event.target as HTMLInputElement).value }" @keydown.esc.stop="close"
    />
    <span class="swatches" role="group" :aria-label="t('filter.colors')">
      <button
        v-for="c in NOTE_COLOR_COUNT" :key="c" type="button" class="sw" :class="`c-${c - 1}`" :aria-pressed="ui.filter.colors.includes(c - 1)"
        :aria-label="t('note.colorN', { n: c })" :data-testid="`filter-color-${c - 1}`" @click="toggleColor(c - 1)"
      />
    </span>
    <select
      v-if="authors.length" class="field sel" :value="ui.filter.author ?? ''" :aria-label="t('filter.author')" data-testid="filter-author"
      @change="ui.filter = { ...ui.filter, author: ($event.target as HTMLSelectElement).value || null }"
    >
      <option value="">{{ t('filter.anyAuthor') }}</option>
      <option v-for="a in authors" :key="a" :value="a">{{ a }}</option>
    </select>
    <label class="chk">
      <input type="checkbox" :checked="ui.filter.voted" data-testid="filter-voted" @change="ui.filter = { ...ui.filter, voted: ($event.target as HTMLInputElement).checked }" />
      {{ t('filter.voted') }}
    </label>
    <span class="count muted" role="status" data-testid="filter-count">{{ active ? t('filter.count', { n: shown, total: notes.length }) : '' }}</span>
    <button class="mini-btn" type="button" :aria-label="t('filter.close')" data-testid="filter-close" @click="close"><Icon name="lucide:x" /></button>
  </section>
</template>

<style scoped>
.filter { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin: .5rem 1rem 0; padding: .4rem .6rem; border-radius: var(--r-card); border: 1px solid var(--border); }
.field { min-width: 0; flex: 1 1 12rem; }
.sel { flex: 0 1 12rem; }
.swatches { display: inline-flex; gap: 4px; }
.sw { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; background: var(--c); cursor: pointer; }
.sw[aria-pressed="true"] { border-color: var(--text); box-shadow: 0 0 0 2px var(--surface); }
.chk { display: inline-flex; align-items: center; gap: .3rem; font-size: var(--fs-sm); white-space: nowrap; }
.count { font-size: var(--fs-sm); min-width: 4rem; }
.c-0 { --c: var(--note-0); } .c-1 { --c: var(--note-1); } .c-2 { --c: var(--note-2); } .c-3 { --c: var(--note-3); }
.c-4 { --c: var(--note-4); } .c-5 { --c: var(--note-5); } .c-6 { --c: var(--note-6); } .c-7 { --c: var(--note-7); }
</style>
