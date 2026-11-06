<script setup lang="ts">
// Links shared before change short-links-and-join keep opening the board: same hash, no extra history entry.
definePageMeta({ redirect: (to) => ({ path: '/boards', hash: to.hash, replace: true }) })
</script>

<template><div /></template>
