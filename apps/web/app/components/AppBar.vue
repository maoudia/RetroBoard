<script setup lang="ts">
// The bar of a page of the application that is not a board (change poker-design-v2, the Scrum Poker pages): the same header as the toolbar of a board
// (the glass bar, the mark of RetroBoard that leads home, the tools at the right in the same order, the light or dark button and the profile button
// at the end). The profile dialog behind the avatar holds the name, the language, the theme, the settings and the help and guide links, as on every page.
// The board's own toolbar keeps its extra tools and its measuring; the pieces both share (BrandLogo, VariantToggle, ProfileButton) are components.
defineProps<{ toolsLabel: string }>()
</script>

<template>
  <header class="appbar glass" data-testid="app-bar">
    <BrandLogo />
    <div class="title"><slot name="title" /></div>
    <nav class="tools" :aria-label="toolsLabel">
      <slot />
      <VariantToggle />
      <ProfileButton class="me" />
    </nav>
  </header>
</template>

<style scoped>
.appbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: .75rem; min-height: var(--toolbar-h); padding: .35rem 1rem; border-bottom: 1px solid var(--border); }
.title { flex: 1; min-width: 0; }
.tools { display: flex; align-items: center; gap: .1rem; }
.tools > *, .tools :deep(.icon-btn) { flex: none; }
.me { margin-left: .5rem; }
/* A phone: the toolbar's own measures (a 34 px mark, .5rem gaps) and icon-only buttons of 44 px, so that the title keeps room (the label stays for assistive technology). */
@media (max-width: 720px) {
  .tools :deep(.icon-btn) { min-width: 44px; min-height: 44px; padding-inline: .25rem; }
  .tools :deep(.icon-btn span:not(.badge)) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
}
@media (max-width: 520px) { .appbar { gap: .5rem; padding-inline: .5rem; } .me { margin-left: .25rem; } }
</style>
