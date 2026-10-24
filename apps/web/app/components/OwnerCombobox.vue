<script setup lang="ts">
import { suggestOwners } from '@retroboard/application'
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

const options = computed(() => suggestOwners(
  model.value,
  board.peers.map((p) => p.name).filter((n): n is string => !!n),
  team.profile.owners,
))
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
      <li
        v-for="(o, i) in options" :id="`${listId}-${i}`" :key="`${o.source}-${o.name}`" role="option" :aria-selected="i === active"
        :class="[o.source, { active: i === active }]" :data-testid="`owner-option-${o.source}`" @mousedown.prevent="pick(i)"
      >
        <Icon :name="o.source === 'present' ? 'lucide:circle-dot' : o.source === 'history' ? 'lucide:history' : 'lucide:user-plus'" />
        <span>{{ label(o) }}</span>
        <small v-if="o.source === 'present'" class="muted">{{ t('owner.present') }}</small>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.combo { position: relative; min-width: 0; }
.list { position: absolute; z-index: 5; inset: calc(100% + 4px) 0 auto; margin: 0; padding: .25rem; list-style: none; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); box-shadow: var(--shadow-2); max-height: 240px; overflow: auto; }
li { display: flex; align-items: center; gap: .5rem; padding: .4rem .5rem; border-radius: 8px; cursor: pointer; }
li small { margin-left: auto; }
li.active, li:hover { background: var(--accent-soft); }
li.custom { border-top: 1px solid var(--border); font-style: italic; }
</style>
