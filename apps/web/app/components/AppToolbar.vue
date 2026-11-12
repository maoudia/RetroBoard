<script setup lang="ts">
import { type CloneKind, cloneSpec } from '@retroboard/application'
import { CLONE_KEY } from '~/utils/clone'
const { t } = useT()
const runUndo = useUndo()
const router = useRouter()
function clone(kind: CloneKind) {
  if (!board.snapshot) return
  try { sessionStorage.setItem(CLONE_KEY, JSON.stringify(cloneSpec(board.snapshot, kind, t('clone.copy')))) } catch { /* the form simply opens empty */ }
  void router.push({ path: '/new', query: { clone: kind } })
}
const board = useBoardStore()
const ui = useUiStore()
const chat = useChatStore()
const layout = useLayoutStore()
/** The size every writing area shares, or null when columns differ (some have their own). */
const theme = useThemeStore()
const settings = useSettingsStore()
const drafts = useDraftsStore()
const { publish } = usePublish()
/** Publishing is closed by the phase for me (facilitators are never blocked): the button says so instead of failing (#275). */
const publishGate = computed(() => board.availability('note.addMany'))
const publishClosed = computed(() => !publishGate.value.allowed && !!publishGate.value.closedBy)
const publishOffTitle = computed(() => (publishClosed.value ? t('gated.publish.closed', { phase: t(`agenda.phase.${publishGate.value.closedBy}` as never) }) : undefined))

// The toolbar can wrap on narrow screens: keep the scroll padding (WCAG 2.4.11) equal to its real height.
const el = useTemplateRef<HTMLElement>('toolbarEl')
const toolsEl = useTemplateRef<HTMLElement>('toolsEl')
/** Room kept for the logo, a few letters of the board title, the shield and the board switch when the tools sit next to them. */
const MIN_BRAND_PX = 170
/** The toolbar padding (2 x 1rem) and its three column gaps (1rem each). */
const BAR_SPACING_PX = 32 + 48
const stacked = typeof window === 'undefined' ? null : window.matchMedia('(max-width: 1100px)')
/**
 * Labels show while they fit; when they do not, the buttons turn icon-only (`data-compact`) and keep their name as tooltip
 * (the accessible name never leaves: the label is visually hidden, not removed). Measured with the labels on and in one
 * frame, so nothing flashes (change responsive-and-i18n-hardening).
 */
function fit() {
  const bar = el.value
  const tools = toolsEl.value
  if (!bar || !tools) return
  bar.removeAttribute('data-compact')
  // At 1100 px and under the tools have their own row; above, they share the row with the brand and the clock.
  const room = stacked?.matches ? tools.clientWidth : bar.clientWidth - BAR_SPACING_PX - (bar.querySelector<HTMLElement>('.timer-slot')?.offsetWidth ?? 0) - (bar.querySelector<HTMLElement>('.chrome-toggle')?.offsetWidth ?? 0) - MIN_BRAND_PX
  const compact = tools.scrollWidth > room + 1
  bar.toggleAttribute('data-compact', compact)
  for (const b of tools.querySelectorAll<HTMLElement>('.icon-btn')) {
    if (compact && !b.title) { b.title = b.querySelector(':scope > span:not(.badge)')?.textContent?.trim() ?? ''; b.dataset.fitTitle = '' } else if (!compact && 'fitTitle' in b.dataset) { b.removeAttribute('title'); delete b.dataset.fitTitle }
  }
}
let observer: ResizeObserver | undefined
let content: MutationObserver | undefined
let fitFrame = 0
const fitSoon = () => { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fit) }
onMounted(() => {
  if (!el.value || typeof ResizeObserver === 'undefined') return
  const root = document.documentElement
  observer = new ResizeObserver(() => { root.style.setProperty('--toolbar-actual', `${Math.ceil(el.value?.getBoundingClientRect().height ?? 0)}px`); fitSoon() })
  observer.observe(el.value)
  // Buttons come and go (undo, publish all) and labels change with the language: measure again.
  if (toolsEl.value) { content = new MutationObserver(fitSoon); content.observe(toolsEl.value, { childList: true, subtree: true, characterData: true }) }
  fit()
})
const recents = useRecentsStore()
const otherBoards = computed(() => recents.items.some((r) => r.id !== board.roomId))
onBeforeUnmount(() => { observer?.disconnect(); content?.disconnect(); cancelAnimationFrame(fitFrame); document.documentElement.style.removeProperty('--toolbar-actual') })
</script>

<template>
  <header ref="toolbarEl" class="toolbar glass" :data-folded="ui.chromeHidden ? '' : undefined">
    <div class="brand">
      <NuxtLink to="/" class="logo" :aria-label="t('toolbar.home')"><Icon name="lucide:sparkles" /></NuxtLink>
      <button class="title" type="button" :title="t('toolbar.rename')" data-testid="board-title" @click="ui.open('options')">
        <strong>{{ board.settings?.title }}</strong>
        <small class="muted">{{ theme.theme.name }}</small>
      </button>
      <EncryptionBadge />
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
          <NuxtLink to="/new" class="boards-new" data-testid="boards-new" @click="close()"><Icon name="lucide:plus" /> {{ t('toolbar.boards.new') }}</NuxtLink>
          <!-- Clone (change feedback-wave-7): the structure of this board, or only its open actions, in a new empty board. -->
          <button class="boards-new" type="button" data-testid="boards-clone" @click="clone('board'); close()"><Icon name="lucide:copy" /> {{ t('clone.board') }}</button>
          <button class="boards-new" type="button" data-testid="boards-clone-actions" :disabled="!board.openActions" @click="clone('actions'); close()"><Icon name="lucide:list-checks" /> {{ t('clone.actions') }}</button>
        </template>
      </Dropdown>
      </div>

    <!-- With an agenda, the phase ring is the shared countdown; otherwise the plain timer. -->
    <AgendaRing v-if="board.snapshot?.agenda" class="timer-slot" />
    <TimerWidget v-else class="timer-slot" />

    <nav ref="toolsEl" class="tools" :aria-label="t('toolbar.tools')">
      <!-- Order by importance (docs/design-system.md, menus): invite, people, actions, find, present, export, activity, settings. -->
      <button class="icon-btn" type="button" data-testid="btn-share" @click="ui.open('share')"><Icon name="lucide:share-2" class="ico" /><span>{{ t('toolbar.share') }}</span><KeyCap k="S" /></button>
      <ParticipantsMenu />
      <!-- Undo and redo of my own latest actions: they appear once there is something to take back (change board-undo-rewind). -->
      <span v-if="board.undoDepth || board.redoDepth" class="undo-pair" role="group" :aria-label="t('undo.title')">
        <button class="icon-btn" type="button" :disabled="!board.undoDepth" :aria-label="t('undo.title')" :title="t('undo.title')" data-testid="btn-undo" @click="runUndo(false)"><Icon name="lucide:undo-2" class="ico" /></button>
        <button class="icon-btn" type="button" :disabled="!board.redoDepth" :aria-label="t('redo.title')" :title="t('redo.title')" data-testid="btn-redo" @click="runUndo(true)"><Icon name="lucide:redo-2" class="ico" /></button>
      </span>
      <HistoryPanel v-if="board.access.canSteer" />
      <button class="icon-btn" type="button" data-testid="btn-actions" @click="ui.open('actions')">
        <Icon name="lucide:list-checks" class="ico" /><span>{{ t('toolbar.actions') }}</span>
        <span v-if="board.openActions" class="badge" data-testid="actions-count">{{ board.openActions }}</span>
      </button>
      <button class="icon-btn" type="button" :aria-pressed="chat.open" :aria-label="chat.unread ? t('chat.unread', { n: chat.unread }) : t('chat.title')" data-testid="btn-chat" @click="chat.toggle()">
        <Icon name="lucide:message-circle" class="ico" /><span>{{ t('chat.title') }}</span>
        <span v-if="chat.unread" class="badge" data-testid="chat-unread">{{ chat.unread }}</span>
      </button>
      <button class="icon-btn" type="button" data-testid="btn-filter" :aria-pressed="ui.filterOpen" @click="ui.filterOpen ? (ui.resetFilter(), ui.filterOpen = false) : (ui.filterOpen = true)"><Icon name="lucide:search" class="ico" /><span>{{ t('toolbar.filter') }}</span><KeyCap k="/" /></button>
      <button class="icon-btn" type="button" data-testid="btn-presenter" :aria-pressed="ui.presenter" @click="ui.presenter = !ui.presenter"><Icon name="lucide:presentation" class="ico" /><span>{{ t('toolbar.presenter') }}</span><KeyCap k="P" /></button>
      <!-- Write only shows or hides the writing areas; their size is set on the area itself (change feedback-wave-4). -->
      <button class="icon-btn" type="button" data-testid="btn-writing" :aria-pressed="!layout.writingHidden" @click="layout.setWritingHidden(!layout.writingHidden)"><Icon :name="layout.writingHidden ? 'lucide:pencil' : 'lucide:pencil-off'" class="ico" /><span>{{ t(layout.writingHidden ? 'toolbar.writing.show' : 'toolbar.writing.hide') }}</span><KeyCap k="W" /></button>
      <!-- Publish every draft at once: lives with the writing controls, shown only while there is something to publish. -->
      <button v-if="drafts.count" class="icon-btn publish-all" type="button" :disabled="board.locked || publishClosed" :title="publishOffTitle ?? t('toolbar.publishAllN', { n: drafts.count })" :aria-label="t('toolbar.publishAllN', { n: drafts.count })" data-testid="publish-all" @click="publish()">
        <Icon name="lucide:send" class="ico" /><!-- The trailing space keeps the visible text ("Tout publier 3") inside the accessible name (WCAG 2.5.3, axe label-content-name-mismatch): Vue drops the whitespace between the two spans. --><span>{{ t('toolbar.publishAll') + ' ' }}</span><span class="badge" data-testid="draft-count">{{ drafts.count }}</span>
      </button>
      <ExportMenu />
      <ActivityFeed />
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
    <!-- The menus slide away and a chevron stays to bring them back: by hand, on scroll on phones, and by default in
      presenter mode (changes mobile-board-space and ux-irritants-wave-2). -->
      <button
      class="mini-btn chrome-toggle" type="button" :aria-expanded="!ui.chromeHidden" :aria-label="t(ui.chromeHidden ? 'toolbar.showMenus' : 'toolbar.hideMenus')"
      :title="t(ui.chromeHidden ? 'toolbar.showMenus' : 'toolbar.hideMenus')" :data-testid="ui.chromeHidden ? 'chrome-show' : 'chrome-hide'" @click="ui.chromeHidden = !ui.chromeHidden"
      ><Icon :name="ui.chromeHidden ? 'lucide:chevrons-down' : 'lucide:chevrons-up'" /></button>
  </header>
</template>

<style scoped>
.undo-pair { display: inline-flex; gap: 2px; }
.toolbar { position: sticky; top: 0; z-index: 30; display: grid; grid-template-columns: 1fr auto 1fr auto; align-items: center; gap: 1rem; min-height: var(--toolbar-h); padding: .35rem 1rem; border-bottom: 1px solid var(--border); }
.brand { display: flex; align-items: center; gap: .75rem; min-width: 0; }
.logo { display: grid; place-items: center; width: 40px; height: 40px; flex: none; font-size: var(--fs-xl); border-radius: var(--r-card); background: var(--accent); color: var(--accent-ink); text-decoration: none; box-shadow: 0 6px 20px -6px var(--accent); transition: transform .2s var(--ease); }
.logo:hover { transform: rotate(-8deg) scale(1.08); }
.boards-head { display: block; padding: .3rem .5rem; font-size: var(--fs-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
/* Links and buttons of the menu look the same: the button reset was missing (change hotfix-ux-wave8). */
.boards-new { display: flex; align-items: center; gap: .4rem; width: 100%; margin: 0; padding: .5rem .6rem; border: 0; border-radius: var(--r-sm); background: none; color: var(--accent); font: inherit; font-weight: 600; text-align: left; text-decoration: none; cursor: pointer; }
.boards-none + .boards-new, :deep(.recent) + .boards-new, .boards-new:first-of-type { margin-top: .3rem; border-top-left-radius: 0; border-top-right-radius: 0; border-top: 1px solid var(--border); }
.boards-new:hover:not(:disabled) { background: var(--accent-soft); }
.boards-new:disabled { color: var(--muted); cursor: not-allowed; }
.boards-new:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.boards-none { margin: 0; padding: .3rem .5rem .5rem; font-size: var(--fs-sm); }
.title { display: grid; min-width: 0; padding: .15rem .5rem; text-align: left; border: 0; border-radius: var(--r-pill); background: transparent; cursor: pointer; }
.title:hover { background: var(--accent-soft); }
.title strong { font-family: var(--f-display); font-size: var(--fs-xl); line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tools { display: flex; justify-content: flex-end; align-items: center; gap: .1rem; }
/* Buttons never shrink below their content: the row slides sideways instead (labels stay centred). */
.tools > *, .tools :deep(.icon-btn) { flex: none; }
.me { margin-left: .5rem; }
@media (max-width: 1100px) {
  .toolbar { grid-template-columns: 1fr auto auto; }
  .timer-slot { grid-column: 2; grid-row: 1; }
  .chrome-toggle { grid-column: 3; grid-row: 1; }
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
/* Icon-only when the labels do not fit (measured in fit()): same visually hidden labels, no shortcut hints. */
.toolbar[data-compact] :deep(.icon-btn > span:not(.badge)) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.toolbar[data-compact] :deep(.icon-btn) { min-width: 44px; }
.toolbar[data-compact] :deep(.keycap) { display: none; }
/* Phone: the board title (not its theme line) and the shield share the first row with the compact clock; the board switcher stays in the profile and on the home page. */
@media (max-width: 520px) {
  .toolbar { gap: .5rem; }
  .brand { gap: .35rem; }
  .logo { width: 34px; height: 34px; }
  .title { padding-inline: .25rem; }
  .title small { display: none; }
  .brand :deep(.boards-btn) { display: none; }
}
.toolbar[data-folded] { row-gap: 0; }
/* The chevron sits next to the board switch and stays when the menus are away. */
.chrome-toggle { flex: none; align-self: center; justify-self: end; }
</style>
