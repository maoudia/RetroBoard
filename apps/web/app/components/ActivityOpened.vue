<script setup lang="ts">
/** Rendered only while the panel is open: tells the feed that the participant has seen it. */
const emit = defineEmits<{ opened: [] }>()
onMounted(() => emit('opened'))
</script>

<template><span hidden /></template>
