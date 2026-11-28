import { writingHidden } from '@retroboard/application'
import { agendaRunning, type PhaseKind } from '@retroboard/domain'

/** Phase run whose writing areas this person showed again (in memory; a phase change clears it). */
const shownFor = ref<string | null>(null)

/**
 * Writing areas folded because the agenda went back before Write (change phase-transition-guidance).
 * A view rule over the snapshot: every replica computes the same, and the per-person override is local.
 */
export function useWritingHidden() {
  const board = useBoardStore()
  const phase = computed(() => {
    const a = board.snapshot?.agenda ?? null
    return agendaRunning(a) ? a.phases[a.current] ?? null : null
  })
  const rule = computed(() => !!board.snapshot && writingHidden(board.snapshot))
  const hidden = computed(() => rule.value && shownFor.value !== phase.value?.id)
  const kind = computed<PhaseKind | null>(() => phase.value?.kind ?? null)
  function show() { if (phase.value) shownFor.value = phase.value.id }
  return { hidden, kind, show }
}
