<script setup lang="ts">
import { type ActionStatus, isOpenAction } from '@retroboard/domain'
const { t } = useT()

/**
 * Start of the retro: carried-over actions that are still open, with quick status buttons.
 * Shown once per board and browser tab; the same actions stay in the actions drawer.
 */
const board = useBoardStore()
const ui = useUiStore()
const dismissed = ref(false)
const key = computed(() => `retroboard:review:${board.roomId}`)
watch(key, (k) => { try { dismissed.value = sessionStorage.getItem(k) === '1' } catch { dismissed.value = false } }, { immediate: true })

const carried = computed(() => board.actions.filter((a) => a.carriedFrom !== null))
const pending = computed(() => carried.value.filter(isOpenAction))
const open = computed({
  // Waits for other dialogs (name, set-up) so it never stacks on top of them.
  get: () => !dismissed.value && board.ready && carried.value.length > 0 && ui.dialog === null && board.settings?.initialized === true,
  set: (v) => { if (!v) dismiss() },
})
function dismiss() {
  dismissed.value = true
  try { sessionStorage.setItem(key.value, '1') } catch { /* memory only */ }
}
const QUICK: ActionStatus[] = ['done', 'doing', 'blocked', 'dropped']
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('review.title')" width="640px">
    <p class="muted">{{ t('review.intro') }}</p>
    <ul class="list" data-testid="review-list">
      <li v-for="a in carried" :key="a.id" :data-status="a.status" :data-testid="`review-${a.id}`">
        <span class="txt"><strong>{{ a.text }}</strong><small class="muted">{{ a.owner || t('common.anonymous') }} · {{ t(`actions.status.${a.status}`) }}</small></span>
        <span class="quick" role="group" :aria-label="t('actions.statusOf', { text: a.text })">
          <button
            v-for="s in QUICK" :key="s" type="button" class="btn btn-sm" :class="{ on: a.status === s }" :aria-pressed="a.status === s"
            :data-testid="`review-${s}`" @click="board.commands.setActionStatus(a.id, s)"
          >{{ t(`actions.status.${s}`) }}</button>
        </span>
      </li>
    </ul>
    <template #footer>
      <span class="muted" data-testid="review-open">{{ t('review.open', { n: pending.length }) }}</span>
      <button class="btn btn-primary" type="button" data-testid="review-close" @click="dismiss">{{ t('common.close') }}</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
li { display: grid; grid-template-columns: 1fr auto; gap: .6rem; align-items: center; padding: .55rem .6rem; border: 1px solid var(--border); border-radius: 10px; }
.txt { display: grid; min-width: 0; overflow-wrap: anywhere; }
.quick { display: flex; gap: .25rem; flex-wrap: wrap; }
.quick .on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
@media (max-width: 560px) { li { grid-template-columns: 1fr; } }
</style>
