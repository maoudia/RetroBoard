<script setup lang="ts">
import { LIMITS } from '~~/shared/domain/limits'
import { confetti } from '~/utils/fx'
const { t } = useT()

const ui = useUiStore()
const board = useBoardStore()
const theme = useThemeStore()
const identity = useIdentityStore()
const open = computed({ get: () => ui.dialog === 'actions', set: (v) => { if (!v && ui.dialog === 'actions') ui.close() } })
const text = ref('')
const owner = ref('')
watch(open, (v) => { if (v && !owner.value) owner.value = identity.name })

function add() {
  if (!text.value.trim()) return
  board.send({ t: 'action.add', text: text.value, owner: owner.value })
  text.value = ''
}
function toggle(id: string, done: boolean, e: Event) {
  board.send({ t: 'action.toggle', id, done })
  if (done) {
    const r = (e.target as HTMLElement).getBoundingClientRect()
    confetti(r.left + r.width / 2, r.top + r.height / 2, theme.theme.noteColors, 36)
  }
}
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('actions.title')" width="580px">
    <form class="add" data-testid="action-form" @submit.prevent="add">
      <input v-model="text" class="field" :maxlength="LIMITS.actionText" :placeholder="t('actions.placeholder')" :aria-label="t('actions.newLabel')" data-testid="action-text" />
      <input v-model="owner" class="field who" :maxlength="LIMITS.actionOwner" :placeholder="t('actions.owner')" :aria-label="t('actions.owner')" />
      <button class="btn btn-primary" type="submit" data-testid="action-add"><Icon name="lucide:plus" /> {{ t('actions.add') }}</button>
    </form>
    <p v-if="!board.actions.length" class="muted empty">{{ t('actions.empty') }}</p>
    <ul v-else class="list" data-testid="actions">
      <li v-for="a in board.actions" :key="a.id" :class="{ done: a.done }">
        <input type="checkbox" :checked="a.done" :aria-label="t('actions.done', { text: a.text })" @change="toggle(a.id, ($event.target as HTMLInputElement).checked, $event)" />
        <span class="txt">{{ a.text }}</span>
        <span v-if="a.owner" class="pill">{{ a.owner }}</span>
        <button class="mini-btn" type="button" :aria-label="t('actions.delete')" @click="board.send({ t: 'action.delete', id: a.id })"><Icon name="lucide:trash" /></button>
      </li>
    </ul>
  </BaseDialog>
</template>

<style scoped>
.add { display: grid; grid-template-columns: 1fr 150px auto; gap: .5rem; }
.list { list-style: none; margin: 0; padding: 0; display: grid; }
li { display: grid; grid-template-columns: auto 1fr auto auto; gap: .7rem; align-items: center; padding: .6rem 0; border-top: 1px solid var(--border); animation: pop-in .25s var(--ease); }
li input { width: 20px; height: 20px; accent-color: var(--accent); }
.txt { overflow-wrap: anywhere; }
.done .txt { text-decoration: line-through; color: var(--muted); }
.empty { text-align: center; padding: 1rem; }
@media (max-width: 560px) { .add { grid-template-columns: 1fr; } }
</style>
