<script setup lang="ts">
/** The "Beta" mark next to a Scrum Poker entry (change scrum-poker): a word, never a colour alone. */
const { t } = useT()
</script>

<template>
  <span class="beta" data-testid="beta-tag">{{ t('poker.entry.beta') }}</span>
</template>

<style scoped>
.beta { display: inline-block; padding: 0 var(--sp-2); border: 1px solid currentColor; border-radius: var(--r-pill); font-size: var(--fs-xs); font-weight: 700; line-height: 1.5; letter-spacing: .02em; text-transform: uppercase; vertical-align: middle; }
</style>
