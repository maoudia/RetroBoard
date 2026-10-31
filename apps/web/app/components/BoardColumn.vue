<script setup lang="ts">
import type { Column } from '@retroboard/domain'
import { filterItems, SORT_MODES, type SortMode } from '@retroboard/application'
import { COLUMN_SIZES } from '~/stores/ui'
const { t } = useT()

const props = defineProps<{ column: Column; index: number; total: number }>()
const board = useBoardStore()
const ui = useUiStore()
const live = useLiveStore()
const theme = useThemeStore()
const sort = ref<SortMode>('time')
const size = computed(() => ui.columnSizes[props.column.id] ?? 'normal')
onMounted(() => { if (props.index === 0) ui.loadColumnSizes(board.roomId) })
const icon = { narrow: 'lucide:minimize-2', normal: 'lucide:square', wide: 'lucide:maximize-2', full: 'lucide:expand' } as const
const onSizeKey = (e: KeyboardEvent) => {
  if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
  e.preventDefault()
  const i = COLUMN_SIZES.indexOf(size.value) + (e.key === 'ArrowRight' ? 1 : -1)
  const next = COLUMN_SIZES[Math.min(COLUMN_SIZES.length - 1, Math.max(0, i))]!
  ui.setColumnSize(board.roomId, props.column.id, next)
}
const { over, bind } = useColumnDrop(() => props.column.id)

const items = computed(() => filterItems(board.itemsFor(props.column.id, board.countsHidden && sort.value === 'votes' ? 'time' : sort.value), ui.filter))
const noteCount = computed(() => board.snapshot?.notes.filter((n) => n.columnId === props.column.id).length ?? 0)
const openGroup = computed(() => items.value.find((i) => i.kind === 'group' && i.group.id === ui.openGroupId) as Extract<(typeof items.value)[number], { kind: 'group' }> | undefined)
const colorIndex = computed(() => props.column.color ?? props.index % 8)
const hasClusters = computed(() => items.value.some((i) => i.kind === 'group'))
const expanded = computed(() => ui.expandedColumns.has(props.column.id))
</script>

<template>
  <section tabindex="-1" class="col" :class="{ over }" :data-focused="ui.presenter && ui.focusColumn === index ? '' : undefined" :style="{ '--col': `var(--note-${colorIndex})` }" :data-testid="`column-${column.id}`" :data-anchor="column.id" data-anchor-kind="column" :aria-label="column.title" :data-size="size" v-bind="bind" @keydown="onSizeKey">
    <header>
      <span class="badge-ico"><Icon :name="`lucide:${column.icon}`" /></span>
      <div class="titles">
        <h2 :title="column.title" data-testid="column-title">{{ column.title }}</h2>
        <p v-if="column.subtitle" class="muted">{{ column.subtitle }}</p>
      </div>
      <LiveMarkers :peers="live.inColumn.get(column.id)" :testid="`live-column-${column.id}`" />
      <span class="count mono" :title="t('column.count', { n: noteCount })">{{ noteCount }}</span>
      <Dropdown menu>
        <template #trigger="{ toggle, open }">
          <button class="mini-btn" :class="{ on: sort !== 'time' }" type="button" aria-haspopup="menu" :aria-expanded="open" :aria-label="t('column.sort')" :title="t('column.sort')" :data-testid="`col-sort-${column.id}`" @click="toggle">
            <Icon name="lucide:arrow-up-down" />
          </button>
        </template>
        <template #default="{ close }">
          <button
            v-for="m in SORT_MODES" :key="m" class="dd-item" type="button" role="menuitemradio" :aria-checked="sort === m" :disabled="m === 'votes' && board.countsHidden"
            :title="m === 'votes' && board.countsHidden ? t('column.sortUnavailable') : undefined" :data-testid="`sort-${m}-${column.id}`" @click="sort = m; close()"
          >
            <Icon :name="sort === m ? 'lucide:check' : 'lucide:minus'" /> {{ t(`column.sort.${m}` as never) }}
          </button>
        </template>
      </Dropdown>
 <button
        v-if="hasClusters" class="mini-btn" type="button" :aria-pressed="expanded" :data-testid="`expand-${column.id}`"
        :aria-label="expanded ? t('cluster.collapseAll') : t('cluster.expandAll')" :title="expanded ? t('cluster.collapseAll') : t('cluster.expandAll')" @click="ui.toggleExpanded(column.id)"
      >
        <Icon :name="expanded ? 'lucide:fold-vertical' : 'lucide:unfold-vertical'" />
      </button>
      <Dropdown menu>
        <template #trigger="{ toggle, open }">
          <button class="mini-btn" :class="{ on: size !== 'normal' }" type="button" aria-haspopup="menu" :aria-expanded="open" :aria-label="t('column.size')" :title="t('column.size')" :data-testid="`col-size-${column.id}`" @click="toggle">
            <Icon :name="icon[size]" />
          </button>
        </template>
        <template #default="{ close }">
          <button v-for="z in COLUMN_SIZES" :key="z" class="dd-item" type="button" role="menuitemradio" :aria-checked="size === z" :data-testid="`size-${z}-${column.id}`" @click="ui.setColumnSize(board.roomId, column.id, z); close()">
            <Icon :name="size === z ? 'lucide:check' : 'lucide:minus'" /> {{ t(`column.size.${z}` as never) }}
          </button>
        </template>
      </Dropdown>
      <ColumnMenu :column="column" :index="index" :count="total" :note-count="noteCount" />
    </header>

    <div class="notes">
      <TransitionGroup name="note" tag="div" class="grid">
        <template v-for="it in items" :key="it.key">
          <NoteCard v-if="it.kind === 'note'" :note="it.note" />
          <GroupCard v-else :item="it" :secret="board.countsHidden" :expanded="expanded" />
        </template>
      </TransitionGroup>
      <p v-if="!items.length" class="empty muted">{{ themeText(theme.theme).emptyColumn }}</p>
    </div>

    <!-- Presenter mode is shown to the room: my private drafts stay off screen. -->
    <PrivateSection v-show="!ui.presenter" :column="column" :color-index="colorIndex" />
    <GroupPanel v-if="openGroup" :item="openGroup" />
  </section>
</template>

<style scoped>
.col {
  --note-w: 150px; position: relative; display: flex; flex-direction: column; min-height: 0; height: 100%; flex: 1 1 340px; min-width: min(340px, 86vw); max-width: 520px;
  background: color-mix(in oklab, var(--surface) 88%, transparent); border: 1px solid var(--border); border-radius: var(--r-card); box-shadow: var(--shadow-1);
  border-top: 3px solid var(--col); transition: border-color .2s, box-shadow .2s, background .2s;
}
.col[data-size="narrow"] { flex-basis: 240px; min-width: min(240px, 86vw); max-width: 300px; }
.col[data-size="wide"] { flex-basis: 560px; min-width: min(560px, 92vw); max-width: 760px; }
.col[data-size="full"] { flex: 0 0 100%; min-width: 0; max-width: none; }
.col.over { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft), var(--shadow-1); background: color-mix(in oklab, var(--accent) 6%, var(--surface)); }
header { display: flex; align-items: center; gap: .5rem; padding: .8rem .8rem .5rem; }
.badge-ico { display: grid; place-items: center; width: 38px; height: 38px; flex: none; font-size: 1.2rem; border-radius: 12px; background: var(--col); color: var(--note-ink); }
.titles { flex: 1; min-width: 0; display: grid; }
h2 { font-size: 1.3rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.titles p { font-size: .78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.count { padding: .1rem .55rem; border-radius: 999px; background: var(--surface2); border: 1px solid var(--border); font-size: .8rem; font-weight: 700; }
.mini-btn.on { color: var(--accent); background: var(--accent-soft); }
.notes { position: relative; flex: 1; min-height: 120px; overflow-y: auto; overflow-x: hidden; padding: .6rem .8rem 1rem; scrollbar-width: thin; }
.grid { position: relative; display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--note-w), 1fr)); gap: .9rem; align-items: start; }
.empty { text-align: center; padding: 1.5rem .5rem; font-style: italic; }
</style>
