<script setup lang="ts">
import { ownerChoices } from '@retroboard/application'
import { LIMITS } from '@retroboard/domain'
const { t } = useT()

/**
 * Owner field: WAI-ARIA combobox (list autocomplete). Connected participants first, then owners
 * used by the team before, then "Use '<typed>'" last. Free text is always accepted.
 */
const model = defineModel<string>({ required: true })
const props = defineProps<{ inputId?: string }>()
const board = useBoardStore()
const team = useTeamStore()
const uid = useId()
const listId = `${uid}-owners`
const open = ref(false)
const active = ref(-1)

type Option = { name: string; source: 'present' | 'history' | 'custom' }
const MAX_USED = 6
const options = computed<Option[]>(() => {
  const { connected, used } = ownerChoices({ peers: board.peers, actions: board.actions }, model.value, team.profile.owners)
  const list: Option[] = [...connected.map((name) => ({ name, source: 'present' as const })), ...used.slice(0, MAX_USED).map((name) => ({ name, source: 'history' as const }))]
  const typed = model.value.trim().slice(0, LIMITS.actionOwner)
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
  if (typed && !list.some((o) => fold(o.name) === fold(typed))) list.push({ name: typed, source: 'custom' })
  return list
})
watch(model, () => { active.value = -1 })

function pick(i: number) {
  const o = options.value[i]
  if (!o) return
  model.value = o.name
  open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { open.value = true; active.value = Math.min(active.value + 1, options.value.length - 1); e.preventDefault() }
  else if (e.key === 'ArrowUp') { active.value = Math.max(active.value - 1, 0); e.preventDefault() }
  else if (e.key === 'Enter' && open.value && active.value >= 0) { pick(active.value); e.preventDefault() }
  else if (e.key === 'Escape' && open.value) { open.value = false; e.stopPropagation(); e.preventDefault() }
}
const label = (o: { name: string; source: string }) => (o.source === 'custom' ? t('owner.use', { name: o.name }) : o.name)
</script>

<template>
  <div class="combo">
    <input
      :id="props.inputId" v-model="model" class="field" type="text" role="combobox" autocomplete="off"
      :maxlength="LIMITS.actionOwner" :placeholder="t('actions.owner')" :aria-label="t('actions.owner')"
      aria-autocomplete="list" :aria-expanded="open && options.length > 0" :aria-controls="listId"
      :aria-activedescendant="open && active >= 0 ? `${listId}-${active}` : undefined" data-testid="owner-input"
      @focus="open = true" @input="open = true" @keydown="onKey" @blur="open = false"
    />
    <ul v-show="open && options.length" :id="listId" class="list" role="listbox" :aria-label="t('owner.suggestions')" data-testid="owner-options">
      <template v-for="(o, i) in options" :key="`${o.source}-${o.name}`">
        <li v-if="i === 0 ? o.source !== 'custom' : o.source !== options[i - 1]!.source && o.source !== 'custom'" role="presentation" class="sec" :data-testid="`owner-section-${o.source}`">
          {{ t(o.source === 'present' ? 'owner.connected' : 'owner.used') }}
        </li>
        <li
          :id="`${listId}-${i}`" role="option" :aria-selected="i === active"
          :class="[o.source, { active: i === active }]" :data-testid="`owner-option-${o.source}`" @mousedown.prevent="pick(i)"
        >
          <Icon :name="o.source === 'present' ? 'lucide:circle-dot' : o.source === 'history' ? 'lucide:history' : 'lucide:user-plus'" />
          <span>{{ label(o) }}</span>
        </li>
      </template>
    </ul>
  </div>
</template>

<style scoped>
.combo { position: relative; min-width: 0; }
.list { position: absolute; z-index: 5; inset: calc(100% + 4px) 0 auto; margin: 0; padding: .25rem; list-style: none; border: 1px solid var(--border); border-radius: var(--r-control); background: var(--surface); box-shadow: var(--shadow-2); max-height: 240px; overflow: auto; }
li { display: flex; align-items: center; gap: .5rem; padding: .4rem .5rem; border-radius: var(--r-sm); cursor: pointer; }
li small { margin-left: auto; }
li.active, li:hover { background: var(--accent-soft); }
li.sec { padding: .35rem .5rem .1rem; font-size: var(--fs-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); cursor: default; }
li.sec:hover { background: none; }
li.custom { border-top: 1px solid var(--border); font-style: italic; }
</style>
