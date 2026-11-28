<script setup lang="ts">
import type { ColumnItem } from '@retroboard/application'
const { t } = useT()

/** Three-dot menu on the group stack, same look and keyboard behaviour as the note menu; reads the same action list as the panel footer (change group-colors-menu-and-scope). */
const props = defineProps<{ item: Extract<ColumnItem, { kind: 'group' }> }>()
const acts = useGroupActions(() => props.item)
const id = computed(() => props.item.group.id)
const clip = (s: string) => (s.length > 48 ? `${s.slice(0, 48)}...` : s)
</script>

<template>
  <div class="gmenu">
    <Dropdown width="210px" menu>
      <template #trigger="{ toggle, open }">
        <button class="mini-btn" type="button" :aria-label="t('group.options')" aria-haspopup="menu" :aria-expanded="open" :data-testid="`gmenu-menu-${id}`" @click.stop="toggle">
          <Icon name="lucide:ellipsis-vertical" />
        </button>
      </template>
      <template #default="{ close }">
        <button class="dd-item" type="button" role="menuitem" :data-testid="`gmenu-open-${id}`" @click="acts.open(); close()">
          <Icon name="lucide:layers" /> {{ t('group.open') }}
        </button>
        <button v-if="acts.has('rename')" class="dd-item" type="button" role="menuitem" :data-testid="`gmenu-rename-${id}`" @click="acts.rename(); close()">
          <Icon name="lucide:pencil" /> {{ t('group.rename') }}
        </button>
        <ColorPicker
          v-if="acts.has('recolor')" menu :current="item.notes[0]?.color ?? null" :swatch-testid="`gmenu-color-${id}`" :more-testid="`gmenu-palette-${id}`"
          @pick="acts.recolor($event); close()" @more="acts.morePalette(); close()"
        />
        <button v-if="acts.has('toAction')" class="dd-item" type="button" role="menuitem" :disabled="!!acts.actionTitle.value" :title="acts.actionTitle.value" :data-testid="`gmenu-action-${id}`" @click="acts.toAction(); close()">
          <Icon name="lucide:list-checks" /> {{ t('note.toAction') }}
        </button>
        <button v-if="acts.has('pin')" class="dd-item" type="button" role="menuitem" :data-testid="`gmenu-pin-${id}`" @click="acts.togglePin(); close()">
          <Icon :name="item.group.pinned ? 'lucide:pin-off' : 'lucide:pin'" /> {{ item.group.pinned ? t('note.unpin') : t('note.pin') }}
        </button>
        <button v-if="acts.has('freeze')" class="dd-item" type="button" role="menuitem" :data-testid="`gmenu-freeze-${id}`" @click="acts.toggleFreeze(); close()">
          <Icon :name="item.group.frozen ? 'lucide:flame' : 'lucide:snowflake'" /> {{ item.group.frozen ? t('note.unfreeze') : t('note.freeze') }}
        </button>
        <template v-if="acts.has('moveTo')">
          <span class="lbl-sm muted">{{ t('note.moveTo') }}</span>
          <button v-for="c in acts.otherColumns.value" :key="c.id" class="dd-item" type="button" role="menuitem" :data-testid="`gmenu-move-${id}-${c.id}`" @click="acts.moveTo(c.id); close()">
            <Icon :name="`lucide:${c.icon}`" /> {{ c.title }}
          </button>
        </template>
        <template v-if="acts.has('mergeInto')">
          <span class="lbl-sm muted">{{ t('cluster.mergeInto') }}</span>
          <button v-for="o in acts.mergeTargets.value" :key="o.group.id" class="dd-item" type="button" role="menuitem" :data-testid="`gmenu-merge-${id}-${o.group.id}`" @click="acts.mergeInto(o.group.id); close()">
            <Icon name="lucide:combine" /> {{ clip(o.title) }} ({{ o.notes.length }})
          </button>
        </template>
        <template v-if="acts.has('dissolve')">
          <div class="dd-sep" />
          <button class="dd-item danger" type="button" role="menuitem" :disabled="item.group.frozen" :title="item.group.frozen ? t('error.frozen') : undefined" :data-testid="`gmenu-dissolve-${id}`" @click="acts.dissolve(); close()">
            <Icon name="lucide:ungroup" /> {{ t('group.dissolve') }}
          </button>
        </template>
      </template>
    </Dropdown>
    <ConfirmDialog v-model:open="acts.dissolveAsk.value" danger :title="t('group.dissolve.title')" :message="t('group.dissolve.voted')" :confirm-label="t('group.dissolve')" confirm-icon="lucide:ungroup" @confirm="acts.doDissolve" />
  </div>
</template>

<style scoped>
/* Top right of the face (the note menu sits in the note footer, the stack has none): always there on touch, on hover and focus with a pointer. */
.gmenu { position: absolute; top: var(--sp-1); inset-inline-end: var(--sp-1); z-index: 3; color: var(--note-ink); }
@media (hover: hover) and (pointer: fine) {
  .gmenu { opacity: 0; transition: opacity .15s; }
  .cluster:hover .gmenu, .gmenu:focus-within { opacity: 1; }
}
.lbl-sm { font-size: var(--fs-xs); font-weight: 700; padding: .3rem .65rem 0; text-transform: uppercase; letter-spacing: .05em; }
</style>
