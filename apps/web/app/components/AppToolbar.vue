<script setup lang="ts">
const { t } = useT()
const board = useBoardStore()
const ui = useUiStore()
const theme = useThemeStore()
const settings = useSettingsStore()
</script>

<template>
  <header class="toolbar glass">
    <div class="brand">
      <NuxtLink to="/" class="logo" :aria-label="t('toolbar.home')"><Icon name="lucide:sparkles" /></NuxtLink>
      <button class="title" type="button" :title="t('toolbar.rename')" data-testid="board-title" @click="ui.open('options')">
        <strong>{{ board.settings?.title }}</strong>
        <small class="muted">{{ theme.theme.name }}</small>
      </button>
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
      <button class="icon-btn" type="button" data-testid="btn-presenter" :aria-pressed="ui.presenter" @click="ui.presenter = !ui.presenter"><Icon name="lucide:presentation" class="ico" /><span>{{ t('toolbar.presenter') }}</span></button>
      <button class="icon-btn" type="button" data-testid="btn-share" @click="ui.open('share')"><Icon name="lucide:share-2" class="ico" /><span>{{ t('toolbar.share') }}</span></button>
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
.logo { display: grid; place-items: center; width: 40px; height: 40px; flex: none; font-size: 1.3rem; border-radius: 12px; background: var(--accent); color: var(--accent-ink); text-decoration: none; box-shadow: 0 6px 20px -6px var(--accent); transition: transform .2s var(--ease); }
.logo:hover { transform: rotate(-8deg) scale(1.08); }
.title { display: grid; min-width: 0; padding: .15rem .5rem; text-align: left; border: 0; border-radius: 10px; background: transparent; cursor: pointer; }
.title:hover { background: var(--accent-soft); }
.title strong { font-family: var(--f-display); font-size: 1.35rem; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tools { display: flex; justify-content: flex-end; align-items: center; gap: .1rem; }
.me { margin-left: .5rem; }
@media (max-width: 1100px) {
  .toolbar { grid-template-columns: 1fr auto; }
  .timer-slot { grid-column: 2; grid-row: 1; }
  .tools { grid-column: 1 / -1; justify-content: space-between; }
}
/* Labels stay in the accessibility tree on phones: visually hidden, not display:none (axe button-name). */
@media (max-width: 720px) { .icon-btn span:not(.badge) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } .icon-btn { position: relative; min-width: 44px; } }
</style>
