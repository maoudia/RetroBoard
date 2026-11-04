<script setup lang="ts">
/**
 * The one tick-box of the app (change feedback-wave-7): a rounded pill with a check mark, filled when on.
 * The real checkbox stays in the pill (invisible, covering it) so keyboard, screen readers and tests talk to it.
 * Attributes (data-testid, @change, ...) land on the input.
 */
defineOptions({ inheritAttrs: false })
defineProps<{ label: string; icon?: string }>()
const model = defineModel<boolean | undefined>({ default: undefined })
function onChange(e: Event) { model.value = (e.target as HTMLInputElement).checked }
</script>

<template>
  <span class="pill-check" :class="{ on: model }">
    <input v-bind="$attrs" :checked="model" type="checkbox" @change="onChange">
    <Icon :name="icon ?? 'lucide:check'" class="tick" aria-hidden="true" />
    <span class="lbl">{{ label }}</span>
  </span>
</template>

<style scoped>
.pill-check { position: relative; display: inline-flex; align-items: center; gap: .4rem; min-block-size: 32px; padding: .25rem .8rem; border: 1.5px solid var(--border); border-radius: var(--r-pill); background: var(--surface); color: var(--text); font-size: var(--fs-sm); font-weight: 600; transition: background-color .12s, border-color .12s; }
.pill-check:hover { background: var(--surface2); }
.pill-check input { position: absolute; inset: 0; margin: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.pill-check .tick { flex: none; width: 1.1em; height: 1.1em; border-radius: 50%; border: 1.5px solid var(--muted); color: transparent; padding: 1px; box-sizing: content-box; }
.pill-check.on { background: color-mix(in srgb, var(--accent) 16%, var(--surface)); border-color: var(--accent); }
.pill-check.on .tick { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.pill-check:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.lbl { min-width: 0; overflow-wrap: anywhere; }
</style>
