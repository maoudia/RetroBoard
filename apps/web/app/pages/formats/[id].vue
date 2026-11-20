<script setup lang="ts">
const id = String(useRoute().params.id)
</script>

<template>
  <FormatPage :id="id" lang="fr" />
</template>
