<script setup lang="ts">
/**
 * Light or dark, one press: the button of the toolbar of a board, shared by every bar that has it. The variant on screen is read from the root, where the
 * theme writes it (and watched, so a change from the profile dialog follows): importing the theme store here would move shared code into the entry chunk.
 */
const { t } = useT()
const settings = useSettingsStore()
const dark = ref(false)
let watcher: MutationObserver | undefined
const read = () => { dark.value = document.documentElement.dataset.variant === 'dark' }
onMounted(() => {
  read()
  watcher = new MutationObserver(read)
  watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-variant'] })
})
onBeforeUnmount(() => watcher?.disconnect())
</script>

<template>
  <button
    class="icon-btn" type="button" data-testid="btn-variant" :aria-pressed="dark"
    :aria-label="t(dark ? 'toolbar.variant.toLight' : 'toolbar.variant.toDark')"
    @click="settings.patch({ variant: dark ? 'light' : 'dark' })"
  >
    <Icon :name="dark ? 'lucide:sun' : 'lucide:moon'" class="ico" />
  </button>
</template>
