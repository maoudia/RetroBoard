<script setup lang="ts">
const { t } = useT()
const board = useBoardStore()
const n = computed(() => board.hiddenColumns.length)
</script>

<template>
  <!-- Change column-visibility: everyone sees that columns are hidden, facilitators bring them back. -->
  <div class="hidden-cols" data-testid="hidden-columns">
    <Dropdown menu align="start">
      <template #trigger="{ toggle, open }">
        <button class="pill chip" type="button" aria-haspopup="menu" :aria-expanded="open" data-testid="hidden-columns-chip" @click="toggle">
          <Icon name="lucide:eye-off" /> {{ t('column.hidden.chip', { n }) }}
        </button>
      </template>
      <template #default="{ close }">
        <p v-if="!board.access.canSteer" class="dd-note muted">{{ t('column.hidden.ask') }}</p>
        <template v-for="c in board.hiddenColumns" :key="c.id">
          <button v-if="board.access.canSteer" class="dd-item" type="button" role="menuitem" :data-testid="`show-col-${c.id}`" @click="board.commands.showColumn(c.id); close()">
            <Icon name="lucide:eye" /> {{ t('column.show', { title: c.title }) }}
          </button>
          <p v-else class="dd-note">{{ c.title }}</p>
        </template>
        <template v-if="board.access.canSteer && n > 1">
          <div class="dd-sep" />
          <button class="dd-item" type="button" role="menuitem" data-testid="show-all-columns" @click="board.commands.showColumn(null); close()">
            <Icon name="lucide:eye" /> {{ t('column.showAll') }}
          </button>
        </template>
      </template>
    </Dropdown>
  </div>
</template>

<style scoped>
.hidden-cols { display: flex; justify-content: flex-end; padding: .25rem 1rem 0; }
.chip { border: 1px solid var(--border); cursor: pointer; font: inherit; font-size: var(--fs-xs); font-weight: 700; }
.dd-note { margin: 0; padding: .35rem .75rem; font-size: var(--fs-sm); }
</style>
