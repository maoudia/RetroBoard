<script setup lang="ts">
import { NOTE_COLOR_COUNT, NOTE_COLOR_EXTENDED } from '@retroboard/domain'
const { t } = useT()
const ui = useUiStore()
const board = useBoardStore()
const open = computed({ get: () => ui.dialog === 'palette', set: (v) => { if (!v && ui.dialog === 'palette') ui.close() } })
const note = computed(() => (ui.paletteNoteId ? board.noteById(ui.paletteNoteId) : undefined) ?? null)
const group = ref<HTMLElement | null>(null)
/** Advanced mode: tints and shades of the theme colours (no free colour). Opens by itself on a note already in one. */
const advanced = ref(false)
const count = computed(() => (advanced.value ? NOTE_COLOR_EXTENDED : NOTE_COLOR_COUNT))

function pick(i: number) {
  if (note.value) board.commands.recolorNote(note.value.id, i)
  ui.close()
}
/** Arrow keys move through the swatches (radio group), Enter/Space picks. */
function onKey(e: KeyboardEvent, i: number) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!step) return
  e.preventDefault()
  const next = (i + step + count.value) % count.value
  group.value?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
}
watch(open, (v) => { if (v) advanced.value = (note.value?.color ?? 0) >= NOTE_COLOR_COUNT })
watch(open, (v) => { if (v) void nextTick(() => group.value?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()) })
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('note.palette')" width="420px">
    <div ref="group" class="grid" role="radiogroup" :aria-label="t('note.color')" data-testid="palette">
      <button
        v-for="i in count" :key="i" type="button" role="radio" class="sw" :class="{ on: note?.color === i - 1 }"
        :aria-checked="note?.color === i - 1" :tabindex="note?.color === i - 1 || (note == null && i === 1) ? 0 : -1"
        :style="{ background: `var(--note-${i - 1})` }" :aria-label="t('note.colorN', { n: i })" :data-testid="`palette-${i - 1}`"
        @click="pick(i - 1)" @keydown="onKey($event, i - 1)"
      >
        <Icon v-if="note?.color === i - 1" name="lucide:check" />
      </button>
    </div>
    <button class="more" type="button" :aria-pressed="advanced" data-testid="palette-more" @click="advanced = !advanced">
      <Icon :name="advanced ? 'lucide:chevrons-up' : 'lucide:chevrons-down'" /> {{ t(advanced ? 'note.palette.less' : 'note.palette.more') }}
    </button>
  </BaseDialog>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; justify-items: center; padding: .5rem 0; }
.more { display: flex; align-items: center; gap: .4rem; margin: .5rem auto 0; padding: 0 1rem; min-height: 44px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--text); font: inherit; font-weight: 600; cursor: pointer; }
.more:hover { background: var(--accent-soft); }
.sw {
  display: grid; place-items: center; width: 68px; height: 68px; border-radius: 50%; cursor: pointer; color: var(--note-ink); font-size: var(--fs-2xl);
  border: 3px solid transparent; box-shadow: 0 0 0 1px var(--border), var(--shadow-1);
  transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), box-shadow .2s;
}
.sw:hover { transform: scale(1.1); }
.sw:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.sw.on { border-color: var(--text); transform: scale(1.12); }
@media (prefers-reduced-motion: reduce) { .sw, .sw:hover, .sw.on { transition: none; transform: none; } }
</style>
