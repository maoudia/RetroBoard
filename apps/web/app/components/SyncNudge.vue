<script setup lang="ts">
import { safeStorage } from '~/utils/storage'
import { NUDGE_KEY, canRememberHere, dismissNudge, nudgeDismissed, phaseRunning, shouldNudgeSync } from '~/utils/sync-nudge'

/**
 * Once, after the first board is created (change sync-ux, group 3): a dismissible line under the toolbar that offers to keep boards on
 * other devices. Never a dialog, never during a running phase, and "Not now" is remembered on this device.
 */
const { t } = useT()
const board = useBoardStore()
const vault = useVaultStore()
const ui = useUiStore()
const library = useLibraryStore()

const dismissed = ref(true)
const canRemember = ref(false)
// Read in the browser only: prerendering has no storage.
onMounted(() => { dismissed.value = nudgeDismissed(); canRemember.value = canRememberHere() })

/** Only the tab that created this board holds the mark `new.vue` leaves: a visit, a link or a reload of an old board never nudges. */
const creator = computed(() => {
  if (!board.roomId || !import.meta.client) return false
  try { return sessionStorage.getItem(`${NUDGE_KEY}:${board.roomId}`) !== null } catch { return false }
})
const others = computed(() => library.entries.filter((e) => e.boardId !== board.roomId).length)
/** A quiet moment first, so the line never lands on the first notes (lowered by the e2e suite, like the board file proposal). */
const quiet = ref(false)
let quietTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { quietTimer = setTimeout(() => { quiet.value = true }, safeStorage.get('retroboard:sync-nudge-delay', 20_000)) })
onBeforeUnmount(() => clearTimeout(quietTimer))
const shown = computed(() => quiet.value && shouldNudgeSync({
  creator: creator.value, connected: vault.connected, dismissed: dismissed.value, canRemember: canRemember.value,
  phaseRunning: phaseRunning(board.snapshot?.agenda), dialogOpen: ui.dialog !== null, presenter: ui.presenter, otherBoards: others.value,
}))

function later() { dismissNudge(); dismissed.value = true }
function go() { later(); ui.open('sync') }
</script>

<template>
  <aside v-if="shown" class="sync-nudge" role="region" :aria-label="t('sync.nudge.label')" data-testid="sync-nudge">
    <p><Icon name="lucide:shield" aria-hidden="true" /> {{ t('sync.nudge.text') }}</p>
    <div class="row">
      <button class="btn btn-sm btn-primary" type="button" data-testid="sync-nudge-go" @click="go"><Icon name="lucide:shield-check" /> {{ t('sync.nudge.go') }}</button>
      <button class="btn btn-sm" type="button" data-testid="sync-nudge-later" @click="later"><Icon name="lucide:x" /> {{ t('sync.nudge.later') }}</button>
    </div>
  </aside>
</template>

<style scoped>
.sync-nudge { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--sp-2); padding: var(--sp-2) var(--sp-4); border-bottom: 1px solid var(--border); background: var(--surface2); color: var(--text); font-size: var(--fs-sm); }
p { margin: 0; display: flex; gap: var(--sp-2); align-items: center; font-weight: 600; }
.row { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
</style>
