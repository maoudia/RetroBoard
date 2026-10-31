<script setup lang="ts">
import { votingState } from '@retroboard/application'
const { t } = useT()
const board = useBoardStore()
const drafts = useDraftsStore()
const { publish } = usePublish()
const limit = computed(() => board.settings?.voteLimit ?? 0)
const ui = useUiStore()
/** Voting is not available in this phase (agenda rules): the voting buttons say so instead of staying active. */
const gate = computed(() => board.availability('vote.add'))
const votingOffTitle = computed(() => (gate.value.closedBy ? t('gated.vote.closed', { phase: t(`agenda.phase.${gate.value.closedBy}`) }) : undefined))
const vstate = computed(() => (board.snapshot ? votingState(board.snapshot) : 'open'))
const stateText = computed(() => {
  if (vstate.value === 'closed') return t('votebar.stateClosed')
  if (vstate.value === 'overridden') return t('votebar.stateOverridden')
  if (vstate.value === 'phase-closed') return t('votebar.statePhase')
  return t('votebar.stateOpen')
})
/** Open voting: reopen after a close, or open it now outside the Vote phase (until the next phase change). */
function openVoting() {
  if (vstate.value === 'closed') board.commands.reopenVoting()
  else if (vstate.value === 'phase-closed') board.commands.openVotingNow(true)
}
const revealing = computed(() => !!board.snapshot?.reveal && board.snapshot.reveal.endsAt > Date.now() + board.skew)
</script>

<template>
  <div class="votebar glass" data-testid="votebar">
    <div class="left">
      <span class="pill pill-votes"><Icon name="lucide:thumbs-up" /> {{ t('votebar.votes', { n: limit }) }}</span>
      <span v-if="board.locked" class="pill lock"><Icon name="lucide:lock" /> {{ t('votebar.locked') }}</span>
      <span v-if="board.votingClosed" class="pill closed" data-testid="voting-closed"><Icon name="lucide:flag" /> {{ t('votebar.closed') }}</span>
    </div>
    <div class="mid" aria-live="polite">
      <span class="dots" aria-hidden="true">
        <span v-for="i in limit" :key="i" class="d" :class="{ used: i > board.votesLeft }" />
      </span>
      <span data-testid="votes-left"><strong class="mono">{{ board.votesLeft }}</strong> {{ t('votebar.left', { n: board.votesLeft, limit }) }}</span>
    </div>
    <div class="right">
      <!-- Voting state, in words (change facilitator-controls-v2): facilitators switch it, everyone reads it. -->
      <div class="seg" role="group" :aria-label="t('votebar.state')" data-testid="voting-state" :data-state="vstate">
        <button
          type="button" class="segb" :class="{ on: vstate !== 'closed' && vstate !== 'phase-closed' }" :aria-pressed="vstate === 'open' || vstate === 'overridden'"
          :disabled="!board.access.canSteer || vstate === 'open' || vstate === 'overridden'" :title="board.access.canSteer ? undefined : t('roles.askFacilitator')"
          data-testid="voting-open" @click="openVoting"
        ><Icon name="lucide:lock-open" /> {{ t(vstate === 'phase-closed' && board.access.canSteer ? 'votebar.openNow' : 'votebar.open') }}</button>
        <button
          type="button" class="segb" :class="{ on: vstate === 'closed' || vstate === 'phase-closed' }" :aria-pressed="vstate === 'closed' || vstate === 'phase-closed'"
          :disabled="!board.access.canSteer || vstate === 'closed' || vstate === 'phase-closed'" :title="votingOffTitle"
          data-testid="close-voting" @click="board.commands.closeVoting()"
        ><Icon name="lucide:flag" /> {{ t(board.secretVoting && vstate !== 'closed' && vstate !== 'phase-closed' ? 'votebar.closeReveal' : 'votebar.closedSeg') }}</button>
      </div>
      <span class="state-text" role="status" data-testid="voting-state-text">{{ stateText }}</span>
      <button v-if="board.access.canSteer && board.votingClosed" class="btn btn-sm" type="button" data-testid="reopen-voting" @click="board.commands.reopenVoting()">
        <Icon name="lucide:rotate-ccw" /> {{ t('votebar.reopen') }}
      </button>
      <button v-if="board.votingClosed" class="btn btn-sm" type="button" data-testid="open-ranking" @click="ui.open('ranking')">
        <Icon name="lucide:trophy" /> {{ t('votebar.results') }}
      </button>
      <!-- Facilitator-only controls grouped in one menu (change facilitator-controls-v2). -->
      <Dropdown v-if="board.access.canSteer" menu>
        <template #trigger="{ toggle, open }">
          <button class="btn btn-sm" type="button" aria-haspopup="menu" :aria-expanded="open" data-testid="votebar-more" @click="toggle">
            <Icon name="lucide:sliders-horizontal" /> {{ t('votebar.more') }}
          </button>
        </template>
        <template #default="{ close }">
          <button class="dd-item" type="button" role="menuitemcheckbox" :aria-checked="board.secretVoting" data-testid="secret-toggle" @click="board.commands.updateSettings({ secretVoting: !board.secretVoting }); close()">
            <Icon :name="board.secretVoting ? 'lucide:eye-off' : 'lucide:eye'" /> {{ t('votebar.secret', { state: board.secretVoting ? t('votebar.on') : t('votebar.off') }) }}
          </button>
          <button class="dd-item" type="button" role="menuitem" :disabled="board.locked || revealing" :title="t('votebar.reveal.title')" data-testid="reveal-all" @click="board.commands.revealDrafts(); close()">
            <Icon name="lucide:sparkles" /> {{ t('votebar.reveal') }}
          </button>
        </template>
      </Dropdown>
      <button class="btn btn-sm btn-primary" type="button" :disabled="!drafts.count || board.locked" data-testid="publish-all" @click="publish()">
        <Icon name="lucide:send" /> {{ t('votebar.publishAll') }}<span v-if="drafts.count"> ({{ drafts.count }})</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.votebar { display: flex; align-items: center; justify-content: space-between; gap: .75rem 1.5rem; flex-wrap: wrap; padding: .5rem 1rem; border-bottom: 1px solid var(--border); }
.left, .mid, .right { display: flex; align-items: center; gap: .6rem; }
.right { flex-wrap: wrap; }
.mid { font-size: var(--fs-md); }
.dots { display: inline-flex; gap: 5px; }
.d { width: 11px; height: 11px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px color-mix(in oklab, var(--accent) 60%, transparent); transition: transform .3s var(--ease), background .3s, box-shadow .3s; }
.d.used { background: var(--border); box-shadow: none; transform: scale(.75); }
.closed { background: var(--accent-soft); color: var(--accent); }
.lock { background: color-mix(in oklab, var(--danger) 18%, transparent); color: var(--danger); }
.seg { display: inline-flex; flex: none; border: 1px solid var(--control, var(--border)); border-radius: 999px; overflow: hidden; }
.segb { display: inline-flex; align-items: center; gap: .3rem; min-height: 32px; padding: .2rem .75rem; border: 0; background: transparent; color: var(--text); font: inherit; font-size: var(--fs-sm); font-weight: 600; cursor: pointer; }
.segb:hover:not(:disabled) { background: color-mix(in oklab, var(--accent) 12%, transparent); }
.segb.on { background: var(--accent-soft); color: var(--accent); }
.segb:disabled { cursor: default; }
.segb:disabled:not(.on) { opacity: .6; }
.state-text { font-size: var(--fs-sm); color: var(--muted); }
/* Phone: the bar stays two short rows. The pill repeats the dots, the state text stays for screen readers. */
@media (max-width: 720px) {
  .votebar { gap: .35rem 1rem; padding: .4rem .75rem; }
  .pill-votes { display: none; }
  .state-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
}
.btn[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
</style>
