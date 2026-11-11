<script setup lang="ts">
/** One value of a JSON document in the file preview: objects and arrays fold, the first level starts open. */
defineOptions({ name: 'JsonNode' })
const props = withDefaults(defineProps<{ value: unknown, name?: string, depth?: number }>(), { name: '', depth: 0 })
const entries = computed<[string, unknown][] | null>(() => {
  const v = props.value
  if (Array.isArray(v)) return v.map((x, i) => [String(i), x])
  return v && typeof v === 'object' ? Object.entries(v) : null
})
const summary = computed(() => (Array.isArray(props.value) ? `[${entries.value?.length ?? 0}]` : `{${entries.value?.length ?? 0}}`))
const scalar = computed(() => JSON.stringify(props.value))
</script>

<template>
  <details v-if="entries" class="jn" :open="depth < 1">
    <summary><span v-if="name" class="k">{{ name }}:</span> <span class="muted">{{ summary }}</span></summary>
    <div class="kids"><JsonNode v-for="[k, v] in entries" :key="k" :name="k" :value="v" :depth="depth + 1" /></div>
  </details>
  <div v-else class="jn leaf"><span v-if="name" class="k">{{ name }}:</span> <span class="v">{{ scalar }}</span></div>
</template>

<style scoped>
.jn { font-family: var(--f-mono, monospace); font-size: var(--fs-sm); overflow-wrap: anywhere; }
.kids { margin-left: var(--sp-4); border-left: 1px solid var(--border); padding-left: var(--sp-2); }
.k { font-weight: 600; }
summary { cursor: pointer; }
</style>
