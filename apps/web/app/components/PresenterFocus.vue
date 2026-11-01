<script setup lang="ts">
const { t } = useT()
const ui = useUiStore()
const board = useBoardStore()
/** Indexes of the columns on screen: hidden ones are skipped (change column-visibility). */
const shown = computed(() => board.columns.flatMap((c, i) => (c.hidden ? [] : [i])))
const label = computed(() => (ui.focusColumn === null ? t('presenter.focus.all') : board.columns[ui.focusColumn]?.title ?? ''))
function step(d: 1 | -1) {
  const list = shown.value
  if (!list.length) return
  const at = ui.focusColumn === null ? -1 : list.indexOf(ui.focusColumn)
  ui.focusColumn = at < 0 ? (d > 0 ? list[0]! : list[list.length - 1]!) : list[(at + d + list.length) % list.length]!
}
</script>

<template>
  <div class="pfocus glass" role="group" :aria-label="t('presenter.focus.label')" data-testid="presenter-focus">
    <button class="mini-btn" type="button" :aria-label="t('presenter.focus.prev')" data-testid="focus-prev" @click="step(-1)"><Icon name="lucide:chevron-left" /></button>
    <span class="cur" role="status" data-testid="focus-current">{{ label }}</span>
    <button class="mini-btn" type="button" :aria-label="t('presenter.focus.next')" data-testid="focus-next" @click="step(1)"><Icon name="lucide:chevron-right" /></button>
    <span class="sep" aria-hidden="true" />
    <button class="mini-btn" type="button" :aria-pressed="ui.focusStyle === 'centre'" :aria-label="t('presenter.focus.centre')" :title="t('presenter.focus.centre')" data-testid="focus-centre" :class="{ on: ui.focusStyle === 'centre' }" @click="ui.focusStyle = 'centre'"><Icon name="lucide:focus" /></button>
    <button class="mini-btn" type="button" :aria-pressed="ui.focusStyle === 'accordion'" :aria-label="t('presenter.focus.accordion')" :title="t('presenter.focus.accordion')" data-testid="focus-accordion" :class="{ on: ui.focusStyle === 'accordion' }" @click="ui.focusStyle = 'accordion'"><Icon name="lucide:columns-3" /></button>
    <button class="mini-btn" type="button" :aria-label="t('presenter.focus.all')" :title="t('presenter.focus.all')" :disabled="ui.focusColumn === null" data-testid="focus-all" @click="ui.focusColumn = null"><Icon name="lucide:maximize" /></button>
  </div>
</template>

<style scoped>
div.pfocus.glass { position: fixed; z-index: 60; left: 50%; bottom: 16px; translate: -50% 0; display: flex; align-items: center; gap: .35rem; padding: .3rem .5rem; border: 1px solid var(--border); border-radius: 999px; box-shadow: var(--shadow-2); }
.cur { min-width: 8ch; max-width: 22ch; padding: 0 .5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; font-weight: 700; }
.sep { width: 1px; height: 20px; background: var(--border); margin: 0 .15rem; }
.mini-btn.on { background: var(--accent-soft); color: var(--accent); }
</style>
