<script setup lang="ts">
import { ANNOUNCE_WINDOW_MS } from '@retroboard/application'
const { t } = useT()

/** One banner for the board when the writing areas are folded because the agenda went back (change phase-transition-guidance). */
const { hidden, kind, show } = useWritingHidden()
const announcer = useLiveAnnouncer()
const button = ref<HTMLButtonElement | null>(null)
const phaseName = computed(() => (kind.value ? t(`agenda.phase.${kind.value}` as never) : ''))

// Before the DOM folds (flush pre): focus that sits in a writing area moves to the banner button.
watch(hidden, async (on, was) => {
  if (!on || was) return
  const inWriting = !!document.activeElement?.closest('[data-writing-area]')
  // After the merged phase-change message of the room, which would otherwise replace this one.
  setTimeout(() => announcer.polite(t('writing.hidden.announce', { phase: phaseName.value })), ANNOUNCE_WINDOW_MS + 300)
  if (!inWriting) return
  await nextTick()
  button.value?.focus()
}, { flush: 'pre' })
</script>

<template>
  <div v-if="hidden" class="wh" role="status" data-testid="writing-hidden">
    <Icon name="lucide:pencil-off" class="ico" aria-hidden="true" />
    <span class="txt">{{ t('writing.hidden.banner', { phase: phaseName }) }}</span>
    <button ref="button" class="btn btn-sm" type="button" data-testid="writing-hidden-show" @click="show"><Icon name="lucide:pencil" /> {{ t('writing.hidden.show') }}</button>
  </div>
</template>

<style scoped>
.wh { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: var(--sp-2) var(--sp-3); padding: var(--sp-1) var(--sp-3); border-bottom: 1px solid var(--border); background: color-mix(in oklab, var(--accent) 8%, var(--surface)); font-size: var(--fs-sm); }
.ico { color: var(--accent); }
.txt { min-width: 0; overflow-wrap: anywhere; }
</style>
