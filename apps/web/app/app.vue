<template>
  <SkipLink />
  <NuxtPage />
  <ProfileDialog />
  <LazySyncSheet v-if="ui.dialog === 'sync'" />
  <ToastHost />
  <AgentConfirmDialog />
</template>

<script setup lang="ts">
const ui = useUiStore()
</script>
