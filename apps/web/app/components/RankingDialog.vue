<script setup lang="ts">
import { buildRanking, podium, type RankedItem } from '@retroboard/application'
import { errorLabel } from '~/utils/labels'
const { t } = useT()
const ui = useUiStore()
const board = useBoardStore()
const { push } = useToasts()
const open = computed({ get: () => ui.dialog === 'ranking', set: (v) => { if (!v && ui.dialog === 'ranking') ui.close() } })

const ranking = computed(() => (board.snapshot ? buildRanking(board.snapshot) : null))
const top = computed(() => (ranking.value ? podium(ranking.value) : []))
/** Podium order on screen: 2nd, 1st, 3rd (the classic stand), ties grouped on their step. */
const steps = computed(() => [2, 1, 3].map((rank) => ({ rank, items: top.value.filter((i) => i.rank === rank) })).filter((s) => s.items.length))
const columnTitle = (id: string) => board.columns.find((c) => c.id === id)?.title ?? ''
const done = ref(new Set<string>())

function toAction(item: RankedItem) {
  const r = board.commands.addAction(item.title.slice(0, 200), '')
  if (!r.ok) return push(r.error === 'offline' ? t('board.connecting') : errorLabel(r.error), 'warn')
  done.value = new Set([...done.value, item.id])
  push(t('ranking.actionCreated'), 'ok')
}
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('ranking.title')" width="760px">
    <p v-if="!ranking" class="muted">{{ t('ranking.hidden') }}</p>
    <template v-else>
      <p v-if="!top.length" class="muted" data-testid="ranking-empty">{{ t('ranking.empty') }}</p>
      <ol v-else class="podium" :aria-label="t('ranking.podium')" data-testid="podium">
        <li v-for="s in steps" :key="s.rank" class="step" :class="`r${s.rank}`" :data-rank="s.rank">
          <ul class="on-step">
            <li v-for="it in s.items" :key="it.id" class="winner" :data-testid="`podium-${it.id}`">
              <strong class="ttl">{{ it.title }}</strong>
              <small class="muted">{{ t('ranking.votes', { n: it.votes }) }}</small>
            </li>
          </ul>
          <span class="block" aria-hidden="true">{{ s.rank }}</span>
          <span class="visually-hidden">{{ t('ranking.rank', { n: s.rank }) }}</span>
        </li>
      </ol>

      <h3 class="list-h">{{ t('ranking.all') }}</h3>
      <ol class="list" data-testid="ranking-list">
        <li v-for="it in ranking" :key="it.id" :data-testid="`rank-${it.id}`" :data-rank="it.rank">
          <span class="rank mono" :aria-label="t('ranking.rank', { n: it.rank })">{{ it.rank }}</span>
          <span class="what">
            <span class="ttl">{{ it.title }}</span>
            <small class="muted">{{ columnTitle(it.columnId) }}<template v-if="it.kind === 'cluster'"> · {{ t('ranking.cluster', { n: it.size }) }}</template></small>
          </span>
          <span class="n mono">{{ it.votes }}</span>
          <button
            v-if="board.access.canSteer" class="btn btn-sm" type="button" :disabled="done.has(it.id)"
            :aria-label="`${t(done.has(it.id) ? 'ranking.toAction.done' : 'ranking.toAction')} - ${it.title}`" :data-testid="`to-action-${it.id}`" @click="toAction(it)"
          >
            <Icon :name="done.has(it.id) ? 'lucide:check' : 'lucide:list-plus'" /> {{ t(done.has(it.id) ? 'ranking.toAction.done' : 'ranking.toAction') }}
          </button>
        </li>
      </ol>
    </template>
  </BaseDialog>
</template>

<style scoped>
.podium { display: flex; justify-content: center; align-items: flex-end; gap: .75rem; margin: .5rem 0 1rem; padding: 0; list-style: none; }
.step { display: grid; justify-items: center; gap: .5rem; width: min(33%, 220px); }
.on-step { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; width: 100%; }
.winner { display: grid; gap: .1rem; padding: .5rem .6rem; border-radius: 10px; background: var(--surface2); text-align: center; animation: rise .6s var(--ease) both; }
.ttl { overflow-wrap: anywhere; }
.block { display: grid; place-items: center; width: 100%; border-radius: 10px 10px 0 0; background: var(--accent); color: var(--accent-ink); font-size: 1.6rem; font-weight: 800; }
.r1 .block { height: 110px; } .r2 .block { height: 80px; } .r3 .block { height: 56px; }
.r1 .winner { animation-delay: .3s; } .r2 .winner { animation-delay: .15s; }
@keyframes rise { from { opacity: 0; transform: translateY(16px); } }
@media (prefers-reduced-motion: reduce) { .winner { animation: none; } }
.list-h { margin: 0; font-size: 1rem; }
.list { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; }
.list li { display: grid; grid-template-columns: 2.2rem 1fr auto auto; align-items: center; gap: .6rem; padding: .45rem .6rem; border: 1px solid var(--border); border-radius: 10px; }
.rank { font-weight: 800; text-align: center; }
.what { display: grid; min-width: 0; }
.n { font-weight: 800; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (max-width: 560px) { .list li { grid-template-columns: 2rem 1fr auto; } .list .btn { grid-column: 2 / -1; justify-self: start; } }
</style>
