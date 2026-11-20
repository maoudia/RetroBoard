<script setup lang="ts">
import { NOTE_COLOR_COUNT } from '@retroboard/domain'
const { t } = useT()

/** Quick row of the 8 base swatches and a "more shades" entry, shared by the note menu and the cluster panel (change group-colors-menu-and-scope). */
defineProps<{
  /** Colour index to mark as current, null when unknown. */
  current: number | null
  /** Inside a dropdown menu (menu roles) or inline in a panel (plain buttons). */
  menu?: boolean
  /** Test id of a swatch, from its colour index. */
  swatchTestid?: (i: number) => string
  moreTestid?: string
}>()
const emit = defineEmits<{ pick: [color: number]; more: [] }>()
</script>

<template>
  <div class="swatches" role="group" :aria-label="t('note.color')">
    <button
      v-for="i in NOTE_COLOR_COUNT" :key="i" type="button" class="sw" :class="{ on: current === i - 1 }" :style="{ background: `var(--note-${i - 1})` }"
      :role="menu ? 'menuitemradio' : undefined" :aria-checked="menu ? current === i - 1 : undefined" :aria-pressed="menu ? undefined : current === i - 1"
      :aria-label="t('note.colorN', { n: i })" :data-testid="swatchTestid?.(i - 1)" @click="emit('pick', i - 1)"
    />
  </div>
  <button class="dd-item" type="button" :role="menu ? 'menuitem' : undefined" :data-testid="moreTestid" @click="emit('more')"><Icon name="lucide:palette" /> {{ t('note.palette') }}</button>
</template>

<style scoped>
.swatches { display: grid; grid-template-columns: repeat(8, minmax(24px, 1fr)); gap: 5px; padding: .35rem .4rem; }
.sw { aspect-ratio: 1; min-width: 24px; min-height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .15s; }
.sw:hover { transform: scale(1.2); }
.sw.on { border-color: var(--text); }
</style>
