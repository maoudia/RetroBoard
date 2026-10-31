<script setup lang="ts">
const { t } = useT()

/** First tab stop on every page: jumps to the main landmark (hash links would fight the router). */
function skip(e: Event) {
  e.preventDefault()
  const main = document.querySelector<HTMLElement>('main')
  if (!main) return
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1')
  main.focus()
}
</script>

<template>
  <a class="skip-link" href="#main" data-testid="skip-link" @click="skip">{{ t('a11y.skip') }}</a>
</template>

<style scoped>
.skip-link { position: fixed; z-index: 100; top: .5rem; left: .5rem; padding: .6rem 1rem; border-radius: var(--r-sm); background: var(--accent, #0066cc); color: var(--accent-ink, #fff); font-weight: 700; transform: translateY(-200%); }
.skip-link:focus { transform: none; }
</style>
