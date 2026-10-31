<script setup lang="ts">
import { buildRanking } from '@retroboard/application'
const { t } = useT()

/**
 * Voted ideas walk-through (change presenter-mode-v2): in presenter mode, step through the ranking with
 * the arrow keys; the idea in turn is enlarged and the board is dimmed behind it. Local to the presenter tab.
 */
const ui = useUiStore()
const board = useBoardStore()
const ranking = computed(() => (board.snapshot ? buildRanking(board.snapshot) : null))
const voted = computed(() => (ranking.value ?? []).filter((r) => r.votes > 0))
const at = computed(() => (ui.walkIndex === null ? null : voted.value[Math.min(ui.walkIndex, voted.value.length - 1)] ?? null))
const column = computed(() => board.columns.find((c) => c.id === at.value?.columnId))

function step(d: 1 | -1) {
  if (!voted.value.length) return
  const i = ui.walkIndex ?? (d > 0 ? -1 : voted.value.length)
  ui.walkIndex = Math.min(voted.value.length - 1, Math.max(0, i + d))
}
function stop() { ui.walkIndex = null }
function onKey(e: KeyboardEvent) {
  if (ui.walkIndex === null || ui.dialog !== null) return
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); step(1) }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); step(-1) }
  else if (e.key === 'Escape') { e.stopImmediatePropagation(); stop() }
}
onMounted(() => document.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey, true); ui.walkIndex = null })
</script>

<template>
  <button
    v-if="voted.length && ui.walkIndex === null" class="start btn btn-sm btn-primary" type="button" data-testid="walk-start"
    @click="step(1)"
  ><Icon name="lucide:trophy" /> {{ t('presenter.walk.start') }}</button>
  <div v-if="at" class="walk" role="dialog" :aria-label="t('presenter.walk.label')" aria-modal="false" data-testid="walk">
    <div class="scrim" aria-hidden="true" @click="stop" />
    <article class="card" :style="{ '--col': column ? `var(--note-${column.color ?? 0})` : 'var(--accent)' }">
      <header>
        <span class="rank mono" data-testid="walk-rank">#{{ at.rank }}</span>
        <span class="votes" data-testid="walk-votes"><Icon name="lucide:thumbs-up" /> {{ t('presenter.walk.votes', { n: at.votes }) }}</span>
        <span v-if="column" class="muted">{{ column.title }}</span>
      </header>
      <p class="text" data-testid="walk-text">{{ at.title }}</p>
      <footer>
        <button class="btn" type="button" :disabled="ui.walkIndex === 0" :aria-label="t('presenter.walk.prev')" data-testid="walk-prev" @click="step(-1)"><Icon name="lucide:chevron-left" /></button>
        <span class="muted" role="status">{{ t('presenter.walk.pos', { i: (ui.walkIndex ?? 0) + 1, n: voted.length }) }}</span>
        <button class="btn" type="button" :disabled="(ui.walkIndex ?? 0) >= voted.length - 1" :aria-label="t('presenter.walk.next')" data-testid="walk-next" @click="step(1)"><Icon name="lucide:chevron-right" /></button>
        <button class="btn btn-ghost" type="button" data-testid="walk-stop" @click="stop">{{ t('presenter.walk.stop') }}</button>
      </footer>
    </article>
  </div>
</template>

<style scoped>
div.walk.walk { position: fixed; z-index: 65; inset: 0; display: grid; place-items: center; padding: 1rem; }
.scrim { position: absolute; inset: 0; background: rgb(5 5 12 / .62); backdrop-filter: blur(3px); }
.card { position: relative; display: grid; gap: 1rem; width: min(52rem, 100%); padding: 1.6rem 2rem; border-radius: calc(var(--r-card, 12px) * 1.5); background: var(--surface2); color: var(--text); border: 3px solid var(--col); box-shadow: var(--shadow-2); }
header { display: flex; align-items: center; gap: .9rem; flex-wrap: wrap; }
.rank { font-size: var(--fs-3xl); font-weight: 800; color: var(--accent); }
.votes { display: inline-flex; gap: .35rem; align-items: center; padding: .2rem .7rem; border-radius: 999px; background: var(--accent-soft); color: var(--text); font-weight: 700; }
.text { margin: 0; font-size: clamp(1.6rem, 3.2vw, 3rem); line-height: 1.25; font-weight: 600; overflow-wrap: anywhere; }
footer { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
button.start.start { position: fixed; z-index: 60; left: 16px; bottom: 16px; }
</style>
