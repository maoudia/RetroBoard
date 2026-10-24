<script setup lang="ts">
import type { Column } from '@retroboard/domain'
import type { SortMode } from '@retroboard/application'
const { t } = useT()

const props = defineProps<{ column: Column; index: number; total: number }>()
const board = useBoardStore()
const ui = useUiStore()
const theme = useThemeStore()
const sort = ref<SortMode>('time')
const { over, bind } = useColumnDrop(() => props.column.id)

const items = computed(() => board.itemsFor(props.column.id, board.countsHidden ? 'time' : sort.value))
const noteCount = computed(() => board.snapshot?.notes.filter((n) => n.columnId === props.column.id).length ?? 0)
const openGroup = computed(() => items.value.find((i) => i.kind === 'group' && i.group.id === ui.openGroupId) as Extract<(typeof items.value)[number], { kind: 'group' }> | undefined)
const colorIndex = computed(() => props.index % 8)
const hasClusters = computed(() => items.value.some((i) => i.kind === 'group'))
const expanded = computed(() => ui.expandedColumns.has(props.column.id))
</script>

<template>
  <section class="col" :class="{ over }" :style="{ '--col': `var(--note-${colorIndex})` }" :data-testid="`column-${column.id}`" :aria-label="column.title" v-bind="bind">
    <header>
      <span class="badge-ico"><Icon :name="`lucide:${column.icon}`" /></span>
      <div class="titles">
        <h2 :title="column.title" data-testid="column-title">{{ column.title }}</h2>
        <p v-if="column.subtitle" class="muted">{{ column.subtitle }}</p>
      </div>
      <span class="count mono" :title="t('column.count', { n: noteCount })">{{ noteCount }}</span>
      <button
        class="mini-btn" type="button" :aria-pressed="sort === 'votes'" :disabled="board.countsHidden" :title="board.countsHidden ? t('column.sortUnavailable') : t('column.sortVotes')"
        :aria-label="sort === 'votes' ? t('column.sortTime') : t('column.sortVotes')" :class="{ on: sort === 'votes' }" @click="sort = sort === 'votes' ? 'time' : 'votes'"
      >
        <Icon name="lucide:arrow-up-down" />
      </button>
 <button
        v-if="hasClusters" class="mini-btn" type="button" :aria-pressed="expanded" :data-testid="`expand-${column.id}`"
        :aria-label="expanded ? t('cluster.collapseAll') : t('cluster.expandAll')" :title="expanded ? t('cluster.collapseAll') : t('cluster.expandAll')" @click="ui.toggleExpanded(column.id)"
      >
        <Icon :name="expanded ? 'lucide:fold-vertical' : 'lucide:unfold-vertical'" />
      </button>
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

    <PrivateSection :column="column" :color-index="colorIndex" />
    <GroupPanel v-if="openGroup" :item="openGroup" />
  </section>
</template>

<style scoped>
.col {
  --note-w: 150px; position: relative; display: flex; flex-direction: column; min-height: 0; height: 100%; flex: 1 1 340px; min-width: min(340px, 86vw); max-width: 520px;
  background: color-mix(in oklab, var(--surface) 88%, transparent); border: 1px solid var(--border); border-radius: var(--r-card); box-shadow: var(--shadow-1);
  border-top: 3px solid var(--col); transition: border-color .2s, box-shadow .2s, background .2s;
}
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
