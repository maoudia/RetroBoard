<script setup lang="ts">
const { t } = useT()
const board = useBoardStore()
const ui = useUiStore()
const theme = useThemeStore()
const settings = useSettingsStore()

// The toolbar can wrap on narrow screens: keep the scroll padding (WCAG 2.4.11) equal to its real height.
const el = useTemplateRef<HTMLElement>('toolbarEl')
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!el.value || typeof ResizeObserver === 'undefined') return
  const root = document.documentElement
  observer = new ResizeObserver(() => root.style.setProperty('--toolbar-actual', `${Math.ceil(el.value?.getBoundingClientRect().height ?? 0)}px`))
  observer.observe(el.value)
})
const recents = useRecentsStore()
const otherBoards = computed(() => recents.items.some((r) => r.id !== board.roomId))
onBeforeUnmount(() => { observer?.disconnect(); document.documentElement.style.removeProperty('--toolbar-actual') })
</script>

<template>
  <header ref="toolbarEl" class="toolbar glass">
    <div class="brand">
      <NuxtLink to="/" class="logo" :aria-label="t('toolbar.home')"><Icon name="lucide:sparkles" /></NuxtLink>
      <button class="title" type="button" :title="t('toolbar.rename')" data-testid="board-title" @click="ui.open('options')">
        <strong>{{ board.settings?.title }}</strong>
        <small class="muted">{{ theme.theme.name }}</small>
      </button>
      <!-- Switch board: the recent boards of this device, one click away (change recent-boards-visible). -->
      <Dropdown align="start" width="260px">
        <template #trigger="{ toggle, open: menuOpen }">
          <button class="mini-btn boards-btn" type="button" aria-haspopup="true" :aria-expanded="menuOpen" :aria-label="t('toolbar.boards')" :title="t('toolbar.boards')" data-testid="btn-boards" @click="toggle">
            <Icon name="lucide:chevrons-up-down" />
          </button>
        </template>
        <template #default="{ close }">
          <span class="boards-head muted">{{ t('toolbar.boards') }}</span>
          <RecentBoards :exclude="board.roomId ?? undefined" :limit="8" testid="boards-menu" @open="close()" />
          <p v-if="!otherBoards" class="boards-none muted">{{ t('toolbar.boards.none') }}</p>
        </template>
      </Dropdown>
    </div>

    <!-- With an agenda, the phase ring is the shared countdown; otherwise the plain timer. -->
    <AgendaRing v-if="board.snapshot?.agenda" class="timer-slot" />
    <TimerWidget v-else class="timer-slot" />

    <nav class="tools" :aria-label="t('toolbar.tools')">
      <ParticipantsMenu />
      <button class="icon-btn" type="button" data-testid="btn-actions" @click="ui.open('actions')">
        <Icon name="lucide:list-checks" class="ico" /><span>{{ t('toolbar.actions') }}</span>
        <span v-if="board.openActions" class="badge" data-testid="actions-count">{{ board.openActions }}</span>
      </button>
      <ExportMenu />
      <ActivityFeed />
      <button class="icon-btn" type="button" data-testid="btn-filter" :aria-pressed="ui.filterOpen" @click="ui.filterOpen ? (ui.resetFilter(), ui.filterOpen = false) : (ui.filterOpen = true)"><Icon name="lucide:search" class="ico" /><span>{{ t('toolbar.filter') }}</span><KeyCap k="/" /></button>
      <button class="icon-btn" type="button" data-testid="btn-presenter" :aria-pressed="ui.presenter" @click="ui.presenter = !ui.presenter"><Icon name="lucide:presentation" class="ico" /><span>{{ t('toolbar.presenter') }}</span><KeyCap k="P" /></button>
      <button class="icon-btn" type="button" data-testid="btn-share" @click="ui.open('share')"><Icon name="lucide:share-2" class="ico" /><span>{{ t('toolbar.share') }}</span><KeyCap k="S" /></button>
      <button class="icon-btn" type="button" data-testid="btn-options" @click="ui.open('options')"><Icon name="lucide:settings" class="ico" /><span>{{ t('toolbar.options') }}</span></button>
      <button
        class="icon-btn" type="button" data-testid="btn-variant" :aria-pressed="theme.variant === 'dark'"
        :aria-label="t(theme.variant === 'dark' ? 'toolbar.variant.toLight' : 'toolbar.variant.toDark')"
        @click="settings.patch({ variant: theme.variant === 'dark' ? 'light' : 'dark' })"
      >
        <Icon :name="theme.variant === 'dark' ? 'lucide:sun' : 'lucide:moon'" class="ico" />
      </button>
      <ProfileButton class="me" />
    </nav>
  </header>
</template>

<style scoped>
.toolbar { position: sticky; top: 0; z-index: 30; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; min-height: var(--toolbar-h); padding: .35rem 1rem; border-bottom: 1px solid var(--border); }
.brand { display: flex; align-items: center; gap: .75rem; min-width: 0; }
.logo { display: grid; place-items: center; width: 40px; height: 40px; flex: none; font-size: var(--fs-xl); border-radius: var(--r-card); background: var(--accent); color: var(--accent-ink); text-decoration: none; box-shadow: 0 6px 20px -6px var(--accent); transition: transform .2s var(--ease); }
.logo:hover { transform: rotate(-8deg) scale(1.08); }
.boards-head { display: block; padding: .3rem .5rem; font-size: var(--fs-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.boards-none { margin: 0; padding: .3rem .5rem .5rem; font-size: var(--fs-sm); }
.title { display: grid; min-width: 0; padding: .15rem .5rem; text-align: left; border: 0; border-radius: var(--r-control); background: transparent; cursor: pointer; }
.title:hover { background: var(--accent-soft); }
.title strong { font-family: var(--f-display); font-size: var(--fs-xl); line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tools { display: flex; justify-content: flex-end; align-items: center; gap: .1rem; }
.me { margin-left: .5rem; }
@media (max-width: 1100px) {
  .toolbar { grid-template-columns: 1fr auto; }
  .timer-slot { grid-column: 2; grid-row: 1; }
  /* One row that slides sideways instead of wrapping: the columns keep their space (change toolbar-mobile-scroll). */
  .tools {
    grid-column: 1 / -1; justify-content: flex-start; flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x proximity; scrollbar-width: none;
    padding-inline: 1rem; margin-inline: -1rem;
    mask-image: linear-gradient(to right, transparent 0, #000 .9rem, #000 calc(100% - .9rem), transparent 100%);
  }
  .tools::-webkit-scrollbar { display: none; }
  .tools > * { flex: none; scroll-snap-align: center; }
}
@media (prefers-reduced-motion: no-preference) { .tools { scroll-behavior: smooth; } }
/* Labels stay in the accessibility tree on phones: visually hidden, not display:none (axe button-name). */
@media (max-width: 720px) { .icon-btn span:not(.badge) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } .icon-btn { position: relative; min-width: 44px; } .toolbar { padding-inline: 1rem; row-gap: .15rem; } }
</style>
