<script setup lang="ts">
import { type ActionItem, type ActionStatus, isOpenAction, LIMITS } from '@retroboard/domain'
import { confetti } from '~/utils/fx'
const { t } = useT()

const ui = useUiStore()
const board = useBoardStore()
const theme = useThemeStore()
const identity = useIdentityStore()
const team = useTeamStore()
const { push } = useToasts()
const jumper = useJumpToSource()
const open = computed({ get: () => ui.dialog === 'actions', set: (v) => { if (!v && ui.dialog === 'actions') ui.close() } })
const text = ref('')
const owner = ref('')
const due = ref('')
/** Note or group the next action comes from (set by the note and group menus). */
const source = ref<{ sourceId: string; text: string } | null>(null)
watch(open, (v) => {
  if (!v) { ui.focusSource = null; return }
  const from = ui.actionFrom
  if (from) {
    text.value = from.text.slice(0, LIMITS.actionText)
    owner.value = from.owner
    source.value = { sourceId: from.sourceId, text: from.text }
    ui.actionFrom = null
    return
  }
  if (!owner.value) owner.value = identity.name
}, { immediate: true, flush: 'post' })

const gate = computed(() => board.availability('action.add'))
const STATUSES: ActionStatus[] = ['todo', 'doing', 'done', 'blocked', 'dropped']
const workflow = computed(() => board.settings?.actionMode === 'workflow')
const carried = computed(() => board.actions.filter((a) => a.carriedFrom !== null))
const fresh = computed(() => board.actions.filter((a) => a.carriedFrom === null))

function add() {
  if (!text.value.trim() || !gate.value.allowed) return
  board.commands.addAction(text.value, owner.value, due.value || undefined, source.value?.sourceId)
  team.rememberOwner(owner.value)
  text.value = ''
  due.value = ''
  source.value = null
}
function celebrate(e: Event) {
  const r = (e.target as HTMLElement).getBoundingClientRect()
  confetti(r.left + r.width / 2, r.top + r.height / 2, theme.theme.noteColors, 36)
}
function toggle(a: ActionItem, done: boolean, e: Event) {
  board.commands.setActionDone(a.id, done)
  if (done) celebrate(e)
}
function setStatus(a: ActionItem, status: ActionStatus, e: Event) {
  board.commands.setActionStatus(a.id, status)
  if (status === 'done') celebrate(e)
}
function saveForNextTime() {
  team.saveActions(board.settings?.title ?? '', board.actions)
  push(t('actions.saved', { n: board.actions.filter(isOpenAction).length }), 'ok')
}
const clip = (s: string) => (s.length > 60 ? `${s.slice(0, 60)}...` : s)
const statusLabel = (s: ActionStatus) => t(`actions.status.${s}`)
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('actions.title')" width="640px">
    <form class="add" data-testid="action-form" @submit.prevent="add">
      <input v-model="text" class="field" :maxlength="LIMITS.actionText" :placeholder="t('actions.placeholder')" :aria-label="t('actions.newLabel')" data-testid="action-text" />
      <OwnerCombobox v-model="owner" />
      <input v-model="due" class="field due" type="date" :aria-label="t('actions.due')" :title="t('actions.due')" data-testid="action-due" />
      <p v-if="source" class="src" data-testid="action-source">
        <Icon name="lucide:sticky-note" aria-hidden="true" />
        <span>{{ t('actions.fromNote', { text: source.text.length > 80 ? `${source.text.slice(0, 80)}...` : source.text }) }}</span>
        <button class="mini-btn" type="button" :aria-label="t('actions.detach')" data-testid="action-source-clear" @click="source = null"><Icon name="lucide:x" /></button>
      </p>
      <GatedHint :availability="gate" what="gated.actions" testid="gated-actions" />
      <button class="btn btn-primary" type="submit" :disabled="!gate.allowed" data-testid="action-add"><Icon name="lucide:plus" /> {{ t('actions.add') }}</button>
    </form>

    <p v-if="!board.actions.length" class="muted empty">{{ t('actions.empty') }}</p>

    <template v-for="section in [{ key: 'carried', items: carried }, { key: 'fresh', items: fresh }]" :key="section.key">
      <section v-if="section.items.length" class="sec" :data-testid="`actions-${section.key}`">
        <h3 v-if="carried.length" class="sec-h">
          <Icon :name="section.key === 'carried' ? 'lucide:history' : 'lucide:sparkles'" />
          {{ t(section.key === 'carried' ? 'actions.previous' : 'actions.thisRetro') }}
        </h3>
        <ul class="list" :data-testid="section.key === 'fresh' ? 'actions' : undefined">
          <li v-for="a in section.items" :key="a.id" :class="[`s-${a.status}`, { done: a.status === 'done' || a.status === 'dropped', hl: !!ui.focusSource && a.sourceNote === ui.focusSource }]" :data-testid="`action-${a.id}`" :data-status="a.status">
            <input
              v-if="!workflow" type="checkbox" :checked="a.done" :aria-label="t('actions.done', { text: a.text })"
              @change="toggle(a, ($event.target as HTMLInputElement).checked, $event)"
            />
            <select
              v-else class="field status" :value="a.status" :aria-label="t('actions.statusOf', { text: a.text })" data-testid="action-status"
              @change="setStatus(a, ($event.target as HTMLSelectElement).value as ActionStatus, $event)"
            >
              <option v-for="s in STATUSES" :key="s" :value="s">{{ statusLabel(s) }}</option>
            </select>
            <span class="txt">
              {{ a.text }}
              <button v-if="a.sourceNote && jumper.sourceText(a.sourceNote) !== null" class="srclink" type="button" :data-testid="`action-from-${a.id}`" @click="jumper.jump(a.sourceNote)">
                <Icon name="lucide:sticky-note" aria-hidden="true" /> {{ t('actions.fromLink', { text: clip(jumper.sourceText(a.sourceNote) ?? '') }) }}
              </button>
              <small v-else-if="a.sourceNote" class="muted from">{{ t('actions.fromGone') }}</small>
              <small v-if="a.carriedFrom !== null" class="muted from">{{ a.carriedFrom ? t('actions.from', { title: a.carriedFrom }) : t('actions.carried') }}</small>
            </span>
            <span class="meta">
              <span v-if="a.owner" class="pill">{{ a.owner }}</span>
              <span v-if="a.due" class="pill due-pill"><Icon name="lucide:calendar" /> {{ a.due }}</span>
            </span>
            <button class="mini-btn" type="button" :aria-label="t('actions.delete')" @click="board.commands.deleteAction(a.id)"><Icon name="lucide:trash" /></button>
          </li>
        </ul>
      </section>
    </template>

    <template #footer>
      <button v-if="board.actions.length && board.access.canSteer" class="btn" type="button" data-testid="actions-save-team" :title="t('actions.saveHint')" @click="saveForNextTime">
        <Icon name="lucide:archive" /> {{ t('actions.save') }}
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.add { display: grid; grid-template-columns: 1fr 150px 150px auto; gap: .5rem; }
.src { grid-column: 1 / -1; margin: 0; display: flex; gap: .4rem; align-items: center; font-size: .85rem; color: var(--muted); }
.sec { display: grid; gap: .25rem; margin-top: .75rem; }
.sec-h { display: flex; gap: .4rem; align-items: center; margin: 0; font-size: .85rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
.list { list-style: none; margin: 0; padding: 0; display: grid; }
li { display: grid; grid-template-columns: auto 1fr auto auto; gap: .7rem; align-items: center; padding: .6rem 0; border-top: 1px solid var(--border); animation: pop-in .25s var(--ease); }
li input[type="checkbox"] { width: 20px; height: 20px; accent-color: var(--accent); }
.status { padding: .25rem .4rem; font-size: .85rem; }
.txt { display: grid; overflow-wrap: anywhere; }
.from { font-size: .78rem; }
.srclink { justify-self: start; display: inline-flex; gap: .3rem; align-items: center; padding: 0; border: 0; background: none; color: var(--accent); font: inherit; font-size: .78rem; text-align: left; cursor: pointer; text-decoration: underline; }
li.hl { background: var(--accent-soft); border-radius: 8px; }
.meta { display: inline-flex; gap: .3rem; flex-wrap: wrap; justify-content: flex-end; }
.due-pill { display: inline-flex; gap: .25rem; align-items: center; }
.done .txt { text-decoration: line-through; color: var(--muted); }
.s-blocked .status { border-color: var(--danger); }
.empty { text-align: center; padding: 1rem; }
@media (max-width: 640px) { .add { grid-template-columns: 1fr 1fr; } .add .field:first-child, .add .btn { grid-column: 1 / -1; } li { grid-template-columns: auto 1fr auto; } .meta { grid-column: 2 / -1; justify-content: flex-start; } }
</style>
