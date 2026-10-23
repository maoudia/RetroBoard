<script setup lang="ts">
import { NOTE_COLOR_COUNT } from '~~/shared/domain/limits'
import type { SnapshotNote } from '~~/shared/domain/types'
const { t } = useT()

const props = defineProps<{ note: SnapshotNote; inGroup?: boolean }>()
const emit = defineEmits<{ edit: [] }>()
const board = useBoardStore()
const others = computed(() => board.columns.filter((c) => c.id !== props.note.columnId))
</script>

<template>
  <Dropdown width="210px">
    <template #trigger="{ toggle, open }">
      <button class="mini-btn" type="button" :aria-label="t('note.options')" aria-haspopup="menu" :aria-expanded="open" :data-testid="`note-menu-${note.id}`" @click.stop="toggle">
        <Icon name="lucide:ellipsis-vertical" />
      </button>
    </template>
    <template #default="{ close }">
      <div class="swatches" role="group" :aria-label="t('note.color')">
        <button
          v-for="i in NOTE_COLOR_COUNT" :key="i" type="button" class="sw" :class="{ on: note.color === i - 1 }" :style="{ background: `var(--note-${i - 1})` }"
          :aria-label="t('note.colorN', { n: i })" @click="board.send({ t: 'note.color', id: note.id, color: i - 1 }); close()"
        />
      </div>
      <div class="dd-sep" />
      <button v-if="inGroup || note.groupId" class="dd-item" type="button" role="menuitem" :data-testid="`ungroup-${note.id}`" @click="board.send({ t: 'note.ungroup', id: note.id }); close()">
        <Icon name="lucide:ungroup" /> {{ t('note.ungroup') }}
      </button>
      <template v-if="others.length">
        <span class="lbl-sm muted">{{ t('note.moveTo') }}</span>
        <button v-for="c in others" :key="c.id" class="dd-item" type="button" role="menuitem" @click="board.send({ t: 'note.move', id: note.id, columnId: c.id }); close()">
          <Icon :name="`lucide:${c.icon}`" /> {{ c.title }}
        </button>
      </template>
      <template v-if="note.mine">
        <div class="dd-sep" />
        <button class="dd-item" type="button" role="menuitem" @click="emit('edit'); close()"><Icon name="lucide:pencil" /> {{ t('note.edit') }}</button>
        <button class="dd-item danger" type="button" role="menuitem" :data-testid="`delete-${note.id}`" @click="board.send({ t: 'note.delete', id: note.id }); close()">
          <Icon name="lucide:trash" /> {{ t('note.delete') }}
        </button>
      </template>
    </template>
  </Dropdown>
</template>

<style scoped>
.swatches { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; padding: .35rem .4rem; }
.sw { aspect-ratio: 1; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .15s; }
.sw:hover { transform: scale(1.2); }
.sw.on { border-color: var(--text); }
.lbl-sm { font-size: .72rem; font-weight: 700; padding: .3rem .65rem 0; text-transform: uppercase; letter-spacing: .05em; }
</style>
