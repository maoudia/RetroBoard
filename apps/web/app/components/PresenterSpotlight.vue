<script setup lang="ts">
const { t } = useT()

/**
 * Note spotlight (change presenter-mode-v2): in presenter mode one idea is enlarged and the board is dimmed
 * behind it. Arrow keys move to the previous or next idea of the same column. Local to the presenter tab.
 */
const ui = useUiStore()
const board = useBoardStore()
const siblings = computed(() => {
  const cur = board.snapshot?.notes.find((n) => n.id === ui.spotlightNoteId)
  return cur ? board.snapshot!.notes.filter((n) => n.columnId === cur.columnId) : []
})
const index = computed(() => siblings.value.findIndex((n) => n.id === ui.spotlightNoteId))
const note = computed(() => siblings.value[index.value] ?? null)
const column = computed(() => board.columns.find((c) => c.id === note.value?.columnId))

function step(d: 1 | -1) {
  const next = siblings.value[index.value + d]
  if (next) ui.spotlightNoteId = next.id
}
function close() { ui.spotlightNoteId = null }
function onKey(e: KeyboardEvent) {
  if (ui.spotlightNoteId === null || ui.dialog !== null) return
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); step(1) }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); step(-1) }
  else if (e.key === 'Escape') { e.stopImmediatePropagation(); close() }
}
watch(note, (n) => { if (ui.spotlightNoteId !== null && !n) close() })
onMounted(() => document.addEventListener('keydown', onKey, true))
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey, true); ui.spotlightNoteId = null })
</script>

<template>
  <div v-if="note" class="spot" role="dialog" :aria-label="t('presenter.spotlight.label')" aria-modal="false" data-testid="spotlight">
    <div class="scrim" aria-hidden="true" @click="close" />
    <article class="card" :style="{ '--col': `var(--note-${note.color})` }">
      <span v-if="column" class="muted">{{ column.title }}</span>
      <p class="text" data-testid="spotlight-text">{{ note.text }}</p>
      <footer>
        <button class="btn" type="button" :disabled="index <= 0" :aria-label="t('presenter.spotlight.prev')" data-testid="spotlight-prev" @click="step(-1)"><Icon name="lucide:chevron-left" /></button>
        <span class="muted" role="status">{{ t('presenter.walk.pos', { i: index + 1, n: siblings.length }) }}</span>
        <button class="btn" type="button" :disabled="index >= siblings.length - 1" :aria-label="t('presenter.spotlight.next')" data-testid="spotlight-next" @click="step(1)"><Icon name="lucide:chevron-right" /></button>
        <button class="btn btn-ghost" type="button" data-testid="spotlight-close" @click="close"><Icon name="lucide:x" /> {{ t('presenter.spotlight.close') }}</button>
      </footer>
    </article>
  </div>
</template>

<style scoped>
div.spot.spot { position: fixed; z-index: 65; inset: 0; display: grid; place-items: center; padding: 1rem; }
.scrim { position: absolute; inset: 0; background: rgb(5 5 12 / .62); backdrop-filter: blur(3px); }
.card { position: relative; display: grid; gap: 1rem; width: min(52rem, 100%); padding: 1.6rem 2rem; border-radius: calc(var(--r-card, 12px) * 1.5); background: var(--col); color: var(--note-ink); border: 3px solid var(--col); box-shadow: var(--shadow-2); }
.text { margin: 0; font-size: clamp(1.6rem, 3.2vw, 3rem); line-height: 1.25; font-weight: 600; overflow-wrap: anywhere; white-space: pre-wrap; }
footer { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
</style>
