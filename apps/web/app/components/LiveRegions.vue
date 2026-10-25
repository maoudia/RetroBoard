<script setup lang="ts">
/** The two shared live regions (see useLiveAnnouncer): mounted once on the board page. */
const { politeText, assertiveText } = useLiveAnnouncer()
</script>

<template>
  <div class="visually-hidden">
    <div aria-live="polite" aria-atomic="true" data-testid="live-polite">{{ politeText }}</div>
    <div aria-live="assertive" aria-atomic="true" data-testid="live-assertive">{{ assertiveText }}</div>
  </div>
</template>
