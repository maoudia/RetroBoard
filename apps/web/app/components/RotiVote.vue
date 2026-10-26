<script setup lang="ts">
import { errorLabel } from '~/utils/labels'
/**
 * ROTI vote (change retro-report): five buttons, one score per person, anonymous. Shown at the top
 * of the report. The phase rules open it in the close phase; facilitators may always rate.
 */
const { t } = useT()
const board = useBoardStore()
const { push } = useToasts()
const mine = computed(() => board.snapshot?.roti?.mine ?? null)
function rate(n: number) {
  const r = board.commands.setRoti(n)
  if (!r.ok) push(r.error === 'offline' ? t('board.connecting') : errorLabel(r.error), 'warn')
}
</script>

<template>
  <section class="roti" data-testid="roti-vote">
    <p class="ask">{{ t('roti.ask') }}</p>
    <div class="scores" role="group" :aria-label="t('roti.ask')">
      <button
        v-for="n in 5" :key="n" type="button" class="btn" :class="{ 'btn-primary': mine === n }" :aria-pressed="mine === n"
        :aria-label="t('roti.score', { n })" :data-testid="`roti-${n}`" @click="rate(n)"
      >{{ n }}</button>
    </div>
    <p v-if="mine" class="muted small" role="status" data-testid="roti-mine">{{ t('roti.mine', { n: mine }) }}</p>
  </section>
</template>

<style scoped>
.roti { display: grid; gap: .5rem; padding: .75rem; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 1rem; }
.ask { margin: 0; font-weight: 600; }
.scores { display: flex; gap: .4rem; flex-wrap: wrap; }
.small { margin: 0; font-size: .85rem; }
</style>
