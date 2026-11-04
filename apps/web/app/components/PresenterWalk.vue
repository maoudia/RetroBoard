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
/** The idea in turn is shown where it lives: the board slides to it and a ring marks it; nothing is dimmed or hidden. */
function mark(id: string | null) {
  document.querySelectorAll('[data-walk]').forEach((e) => e.removeAttribute('data-walk'))
  if (!id) return
  const el = document.querySelector<HTMLElement>(`[data-source-id="${CSS.escape(id)}"]`)
  if (!el) return
  el.setAttribute('data-walk', '')
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center', inline: 'center' })
}
watch(() => at.value?.id ?? null, (id) => void nextTick(() => mark(id)), { flush: 'post' })
function onKey(e: KeyboardEvent) {
  if (ui.walkIndex === null || ui.dialog !== null) return
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); step(1) }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); step(-1) }
  else if (e.key === 'Escape') { e.stopImmediatePropagation(); stop() }
}
onMounted(() => document.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey, true); mark(null); ui.walkIndex = null })
</script>

<template>
  <button
    v-if="voted.length && ui.walkIndex === null" class="start btn btn-sm btn-primary" type="button" :aria-label="t('presenter.walk.start')" :title="t('presenter.walk.start')" data-testid="walk-start"
    @click="step(1)"
  ><Icon name="lucide:trophy" /> <span class="lbl">{{ t('presenter.walk.start') }}</span></button>
  <div v-if="at" class="walk" role="dialog" :aria-label="t('presenter.walk.label')" aria-modal="false" data-testid="walk">
    <article class="card" :style="{ '--col': column ? `var(--note-${column.color ?? 0})` : 'var(--accent)' }">
      <header>
        <span class="rank mono" data-testid="walk-rank">#{{ at.rank }}</span>
        <span class="votes" data-testid="walk-votes"><Icon name="lucide:thumbs-up" /> {{ t('presenter.walk.votes', { n: at.votes }) }}</span>
        <span v-if="column" class="muted">{{ column.title }}</span>
      </header>
      <p class="text" data-testid="walk-text">{{ at.title }}</p>
      <footer>
        <button class="btn" type="button" :disabled="ui.walkIndex === 0" :aria-label="t('presenter.walk.top')" :title="t('presenter.walk.top')" data-testid="walk-top" @click="ui.walkIndex = 0"><Icon name="lucide:chevrons-up" /></button>
        <button class="btn" type="button" :disabled="ui.walkIndex === 0" :aria-label="t('presenter.walk.prev')" data-testid="walk-prev" @click="step(-1)"><Icon name="lucide:chevron-left" /></button>
        <span class="muted" role="status">{{ t('presenter.walk.pos', { i: (ui.walkIndex ?? 0) + 1, n: voted.length }) }}</span>
        <button class="btn" type="button" :disabled="(ui.walkIndex ?? 0) >= voted.length - 1" :aria-label="t('presenter.walk.next')" data-testid="walk-next" @click="step(1)"><Icon name="lucide:chevron-right" /></button>
        <button class="btn btn-ghost" type="button" data-testid="walk-stop" @click="stop"><Icon name="lucide:square" /> {{ t('presenter.walk.stop') }}</button>
      </footer>
    </article>
  </div>
</template>

<style scoped>
/* A dock at the bottom: the board stays fully visible and the idea in turn is ringed in place. */
div.walk.walk { position: fixed; z-index: 65; left: 0; right: 0; bottom: 76px; display: grid; justify-items: center; padding: 0 1rem; pointer-events: none; }
.card { pointer-events: auto; position: relative; display: grid; gap: .5rem; width: min(52rem, 100%); padding: .8rem 1.2rem; border-radius: calc(var(--r-card, 12px) * 1.5); background: var(--surface2); color: var(--text); border: 3px solid var(--col); box-shadow: var(--shadow-2); }
header { display: flex; align-items: center; gap: .9rem; flex-wrap: wrap; }
.rank { font-size: var(--fs-2xl); font-weight: 800; color: var(--accent); }
.votes { display: inline-flex; gap: .35rem; align-items: center; padding: .2rem .7rem; border-radius: 999px; background: var(--accent-soft); color: var(--text); font-weight: 700; }
.text { margin: 0; font-size: clamp(1.1rem, 1.6vw, 1.6rem); line-height: 1.3; font-weight: 600; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
footer { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
button.start.start { position: fixed; z-index: 60; left: 16px; bottom: 16px; }
/* Phones: icon only, above the focus bar, so the presenter controls never overlap (change ux-irritants-wave-2). */
@media (max-width: 600px) {
  button.start.start { bottom: 72px; width: 44px; height: 44px; padding: 0; justify-content: center; border-radius: 50%; }
  button.start .lbl { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
}
</style>
