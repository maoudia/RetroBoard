<script setup lang="ts" generic="T extends string">
/**
 * One size control for the app (change hotfix-ux-wave8): the writing area (S, M, L) and the column width (narrow to full)
 * share this component, so both look and behave the same. Outlined rectangles, the selected one filled, equal cells.
 */
defineProps<{
  modelValue: T
  options: readonly T[]
  label: string
  optionLabel: (o: T) => string
  testid: (o: T) => string
  /** Inside a menu (the column popover): radio semantics instead of pressed buttons. */
  menu?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <span class="pick-seg seg-rects size-pick" role="group" :aria-label="label">
    <button
      v-for="o in options" :key="o" type="button" :role="menu ? 'menuitemradio' : undefined" :class="{ on: modelValue === o }"
      :aria-pressed="menu ? undefined : modelValue === o" :aria-checked="menu ? modelValue === o : undefined"
      :aria-label="optionLabel(o)" :title="optionLabel(o)" :data-testid="testid(o)" @click="emit('update:modelValue', o)"
    ><i class="rect" :class="o" aria-hidden="true" /></button>
  </span>
</template>
