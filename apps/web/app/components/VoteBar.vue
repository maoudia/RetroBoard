<script setup lang="ts">
import { votingState } from '@retroboard/application'
const { t } = useT()
const board = useBoardStore()
const limit = computed(() => board.settings?.voteLimit ?? 0)
const ui = useUiStore()
const vstate = computed(() => (board.snapshot ? votingState(board.snapshot) : 'open'))
const stateText = computed(() => {
  if (vstate.value === 'closed') return t('votebar.stateClosed')
  if (vstate.value === 'overridden') return t('votebar.stateOverridden')
  if (vstate.value === 'phase-closed') return t('votebar.statePhase')
  return t('votebar.stateOpen')
})
const isOpen = computed(() => vstate.value === 'open' || vstate.value === 'overridden')
/** One word for the chip: what is true now. */
const chipText = computed(() => t(isOpen.value ? 'votebar.voteOpen' : vstate.value === 'phase-closed' ? 'votebar.voteWaiting' : 'votebar.voteClosed'))
const chipTitle = computed(() => (board.access.canSteer ? (isOpen.value ? t('votebar.closeAction') : t('votebar.openAction')) : t('roles.askFacilitator')))
function toggleVoting() { if (isOpen.value) board.commands.closeVoting(); else openVoting() }
/** Open voting: reopen after a close, or open it now outside the Vote phase (until the next phase change). */
function openVoting() {
  if (vstate.value === 'closed') board.commands.reopenVoting()
  else if (vstate.value === 'phase-closed') board.commands.openVotingNow(true)
}
const revealing = computed(() => !!board.snapshot?.reveal && board.snapshot.reveal.endsAt > Date.now() + board.skew)
</script>

<template>
  <!-- One calm strip: my votes left, the state of voting as ONE clear chip (a facilitator taps it to open or close), then results and options.
       Publishing all drafts lives in the toolbar. The whole bar only exists when voting is enabled on the board. -->
  <div class="votebar glass" data-testid="votebar">
    <div class="mid" aria-live="polite" :title="t('votebar.votes', { n: limit })">
      <!-- Your tickets: a full ticket is a vote you still have, an empty one is spent. Many votes: one ticket and the count. -->
      <span class="tickets" aria-hidden="true">
        <template v-if="limit <= 8"><Icon v-for="i in limit" :key="i" name="lucide:ticket" class="tk" :class="{ used: i > board.votesLeft }" /></template>
        <Icon v-else name="lucide:ticket" class="tk" />
      </span>
      <span data-testid="votes-left"><strong class="mono">{{ board.votesLeft }}</strong><span class="of mono">/{{ limit }}</span><span class="sr-only"> {{ t('votebar.left', { n: board.votesLeft, limit }) }}</span></span>
    </div>
    <span v-if="board.locked" class="pill lock" :title="t('votebar.locked')"><Icon name="lucide:lock" /><span class="sr-only">{{ t('votebar.locked') }}</span></span>
    <div class="right">
      <button
        type="button" class="state" :data-state="vstate" :aria-label="`${chipText}. ${stateText}`" :title="chipTitle ?? stateText"
        :disabled="!board.access.canSteer"
        :data-testid="isOpen ? 'close-voting' : 'voting-open'" data-voting-state-chip @click="toggleVoting"
      >
        <Icon :name="isOpen ? 'lucide:lock-open' : vstate === 'phase-closed' ? 'lucide:clock' : 'lucide:lock'" />
        <span class="lbl">{{ chipText }}</span>
        <span v-if="board.votingClosed" data-testid="voting-closed" class="sr-only" />
      </button>
      <span class="state-text" role="status" data-testid="voting-state-text">{{ stateText }}</span>
      <button v-if="board.votingClosed" class="btn btn-sm ico-btn" type="button" :title="t('votebar.results')" data-testid="open-ranking" @click="ui.open('ranking')">
        <Icon name="lucide:trophy" /><span class="sr-only">{{ t('votebar.results') }}</span>
      </button>
      <!-- Facilitator-only controls grouped in one menu (change facilitator-controls-v2). -->
      <Dropdown v-if="board.access.canSteer" menu>
        <template #trigger="{ toggle, open }">
          <button class="btn btn-sm ico-btn" type="button" aria-haspopup="menu" :aria-expanded="open" :title="t('votebar.more')" data-testid="votebar-more" @click="toggle">
            <Icon name="lucide:sliders-horizontal" /><span class="sr-only">{{ t('votebar.more') }}</span>
          </button>
        </template>
        <template #default="{ close }">
          <ToggleSwitch :model-value="board.secretVoting" icon="lucide:eye-off" :label="t('votebar.secret')" data-testid="secret-toggle" @update:model-value="(on: boolean) => { board.commands.updateSettings({ secretVoting: on }); close() }" />
          <button class="dd-item" type="button" role="menuitem" :disabled="board.locked || revealing" :title="t('votebar.reveal.title')" data-testid="reveal-all" @click="board.commands.revealDrafts(); close()">
            <Icon name="lucide:sparkles" /> {{ t('votebar.reveal') }}
          </button>
          <ToggleSwitch :model-value="true" icon="lucide:vote" :label="t('votebar.enabled')" data-testid="voting-disable" @update:model-value="close(); board.commands.updateSettings({ votingEnabled: false })" />
        </template>
      </Dropdown>
    </div>
  </div>
</template>

<style scoped>
.votebar { display: flex; align-items: center; gap: .6rem 1rem; padding: .4rem 1rem; border-bottom: 1px solid var(--border); }
.right { display: flex; align-items: center; gap: .5rem; margin-inline-start: auto; }
.mid { display: flex; align-items: center; gap: .5rem; font-size: var(--fs-md); }
.tickets { display: inline-flex; gap: 3px; font-size: var(--fs-lg); }
.tk { color: var(--accent); transition: transform .3s var(--ease), color .3s, opacity .3s; }
.tk.used { color: var(--muted); opacity: .45; transform: scale(.85) rotate(-8deg); }
.of { color: var(--muted); font-size: var(--fs-sm); }
.lock { background: color-mix(in oklab, var(--danger) 18%, transparent); color: var(--danger); }
/* The state of voting as one chip: colour says it (green open, neutral closed, dashed waiting), one word says it too. */
.state { --tone: var(--success); display: inline-flex; align-items: center; gap: .4rem; min-height: 36px; padding: 0 .9rem 0 .75rem; border-radius: 999px; border: 1px solid color-mix(in oklab, var(--tone) 55%, var(--border)); background: color-mix(in oklab, var(--tone) 14%, transparent); color: var(--text); font: inherit; font-size: var(--fs-sm); font-weight: 700; cursor: pointer; }
.state:disabled { cursor: default; }
.state:hover:not(:disabled) { background: color-mix(in oklab, var(--tone) 24%, transparent); }
.state[data-state="closed"] { --tone: var(--muted); }
.state[data-state="phase-closed"] { --tone: var(--muted); border-style: dashed; }
.state-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } /* the chip already says it: read by assistive technology only */
.right .btn { min-height: 36px; }
.ico-btn { width: 36px; padding: 0; justify-content: center; }
/* Phone: one row that slides sideways like the toolbar, votes left as a pill at the start. */
@media (max-width: 720px) { .votebar { gap: .35rem .6rem; padding: .35rem .75rem; } }
@media (max-width: 600px) {
  .votebar { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .votebar::-webkit-scrollbar { display: none; }
  .mid, .right { flex: none; white-space: nowrap; }
  .mid { gap: .4rem; padding: .15rem .6rem; border-radius: var(--r-pill); background: var(--accent-soft); font-size: var(--fs-sm); }
}
</style>
