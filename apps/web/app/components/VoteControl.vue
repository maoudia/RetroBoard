<script setup lang="ts">
import type { VotableKind } from '@retroboard/domain'
import { errorLabel } from '~/utils/labels'
const { t } = useT()

/**
 * Dot-vote control for a note or a cluster.
 * One vote per item: a toggle. Several: "+" adds, "-" takes one back, dots show my votes.
 */
const props = defineProps<{ kind: VotableKind; id: string; votes: number | null; myVotes: number; label: string }>()
const board = useBoardStore()
const { push } = useToasts()
const bumped = ref(false)
const plus = ref(0)

const gate = computed(() => board.availability('vote.add'))
const perItem = computed(() => board.settings?.maxVotesPerItem ?? 1)
const closed = computed(() => board.settings?.votingClosed ?? false)
const single = computed(() => perItem.value <= 1)
const canAdd = computed(() => !board.locked && !closed.value && board.votesLeft > 0 && props.myVotes < perItem.value)
const voted = computed(() => props.myVotes > 0)
const countLabel = computed(() => (props.votes !== null ? ` ${props.votes}` : ''))

function report(r: { ok: boolean; error?: string }) {
  if (!r.ok && r.error && r.error !== 'offline') push(errorLabel(r.error as never), 'warn')
}
function add() { report(board.commands.addVote(props.kind, props.id)) }
function remove() { report(board.commands.removeVote(props.kind, props.id)) }
function main() { if (single.value && voted.value) remove(); else add() }

watch(() => props.votes, (n, o) => {
  if (n === null || o === null || n === o) return
  bumped.value = false
  nextTick(() => { bumped.value = true; if (n > o) plus.value++ })
})
</script>

<template>
  <!-- Closed by the phase: the same greyed look as a closed composer, with the reason for assistive technologies. -->
  <span v-if="gate.closedBy && !gate.allowed" class="vc">
    <button class="vote off gated" type="button" disabled aria-disabled="true" :aria-label="`${t('gated.vote.closed', { phase: t(`agenda.phase.${gate.closedBy}`) })} - ${label}`" :title="t('gated.vote.closed', { phase: t(`agenda.phase.${gate.closedBy}`) })" :data-testid="`gated-vote-${id}`">
      <span class="thumb"><Icon name="lucide:lock" /></span>
    </button>
  </span>
  <span v-else-if="board.allowed('vote.add')" class="vc" :data-testid="`votes-${id}`">
    <button
      v-if="!single && voted && !closed" class="vote undo" type="button"
      :aria-label="t('vote.undo', { label })" :data-testid="`unvote-${id}`" @click="remove"
    >
      <Icon name="lucide:minus" />
    </button>
    <button
      class="vote" type="button"
      :aria-pressed="single ? voted : undefined"
      :aria-label="`${single && voted ? t('note.unvote') : t('note.vote')}${countLabel} - ${label}`"
      :class="{ voted, off: closed || (!canAdd && !(single && voted)) }"
      :data-testid="`vote-${id}`" @click="closed ? report({ ok: false, error: 'voting-closed' }) : main()"
    >
      <span class="thumb" :class="{ 'vote-bump': bumped }" @animationend="bumped = false"><Icon :name="single || !voted ? 'lucide:thumbs-up' : 'lucide:plus'" /></span>
      <span v-if="votes !== null" class="n mono" :class="{ 'vote-bump': bumped }">{{ votes }}</span>
      <span v-for="k in plus" :key="k" class="plus" aria-hidden="true" @animationend="plus = 0">+1</span>
    </button>
    <span v-if="!single && myVotes > 0" class="mine" :data-testid="`my-votes-${id}`" :aria-label="t('vote.mine', { n: myVotes })">
      <i v-for="k in myVotes" :key="k" />
    </span>
  </span>
</template>

<style scoped>
.vc { display: inline-flex; align-items: center; gap: .25rem; }
.vote { position: relative; display: inline-flex; align-items: center; gap: .3rem; min-height: 32px; padding: .2rem .55rem; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); border-radius: 999px; background: transparent; color: inherit; font: inherit; font-weight: 700; cursor: pointer; }
.vote.voted { background: var(--note-ink, currentColor); color: var(--c, #fff); border-color: var(--note-ink, currentColor); }
.vote.off { opacity: .55; cursor: not-allowed; }
.vote.gated { background: var(--gated-bg); border-style: dashed; }
.vote.undo { padding: .2rem .4rem; }
.mine { display: inline-flex; gap: 3px; }
.mine i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.plus { position: absolute; right: -4px; top: -14px; font-size: .75rem; font-weight: 800; animation: rise .8s ease-out forwards; pointer-events: none; }
@keyframes rise { to { transform: translateY(-14px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .plus { display: none; } }
</style>
