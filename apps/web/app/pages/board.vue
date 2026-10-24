<script setup lang="ts">
import { ROOM_ID_RE } from '@retroboard/protocol'
import type { SetupResult } from '~/components/BoardSetupForm.vue'
import { isLocalRoom } from '~/transport'
import { errorLabel } from '~/utils/labels'
const { t, locale } = useT()

const route = useRoute()
const { $ports } = useNuxtApp()
const board = useBoardStore()
const identity = useIdentityStore()
const drafts = useDraftsStore()
const theme = useThemeStore()
const ui = useUiStore()
const { push } = useToasts()

const roomId = computed(() => route.hash.replace(/^#/, ''))
const validRoom = computed(() => ROOM_ID_RE.test(roomId.value) || (isLocalRoom(roomId.value) && roomId.value.length >= 12))
const needsSetup = computed(() => board.ready && !board.settings?.initialized)
const setupOpen = ref(false)

useHead({ title: computed(() => `${board.settings?.title ?? t('board.defaultTitle')} - RetroBoard`) })

function enter() {
  board.disconnect()
  if (!validRoom.value) return
  identity.load()
  drafts.load(roomId.value)
  if (!identity.named) ui.open('name')
  board.connect(roomId.value, identity.identity, $ports.channelFactory)
}

onMounted(enter)
useBoardAgentTools()
watch(roomId, enter)
onBeforeUnmount(() => board.disconnect())

// A freshly created board gets its theme and template from the creator's setup.
watch(needsSetup, (need) => {
  if (!need) { setupOpen.value = false; return }
  let init: SetupResult | null = null
  try { init = JSON.parse(sessionStorage.getItem(`retroboard:init:${roomId.value}`) ?? 'null') as SetupResult | null } catch { init = null }
  if (init) {
    sessionStorage.removeItem(`retroboard:init:${roomId.value}`)
    sendSetup(init)
  } else {
    setupOpen.value = true
  }
})
function sendSetup(s: SetupResult) {
  board.commands.initBoard({ templateId: s.templateId, themeId: s.themeId, title: s.title, locale: s.locale ?? locale.value })
  setupOpen.value = false
}

// The board's theme is shared: everybody sees the same ambiance.
const settings = useSettingsStore()
const recents = useRecentsStore()
const effectiveThemeId = computed(() => (settings.s.themeMode === 'mine' && settings.s.myTheme ? settings.s.myTheme : board.settings?.themeId))
watch(effectiveThemeId, (id) => { if (id && id !== theme.themeId) void theme.use(id, false) }, { immediate: true })

// Remember this board on this device only (title and theme, never content).
watch(() => [board.settings?.title, board.settings?.initialized] as const, ([title, init]) => {
  if (init && title && roomId.value && !isLocalRoom(roomId.value)) recents.touch(roomId.value, title, board.settings!.themeId)
})

// Drafts of a deleted column have nowhere to live.
watch(() => board.columns.map((c) => c.id).join(), () => { if (board.columns.length) drafts.prune(board.columns.map((c) => c.id)) })

// Closing a group that vanished (dissolved by someone else).
watch(() => board.snapshot?.groups, (g) => { if (ui.openGroupId && !g?.some((x) => x.id === ui.openGroupId)) ui.openGroupId = null })

watch(() => board.lastError, (e) => { if (e) push(errorLabel(e.code), 'warn') })

const offline = computed(() => board.status === 'reconnecting' || board.status === 'connecting')
</script>

<template>
  <div class="page" :data-locked="board.locked">
    <AmbientLayer />

    <main v-if="!validRoom" class="invalid card">
      <Icon name="lucide:triangle-alert" class="big" />
      <h1>{{ t('board.invalid.h') }}</h1>
      <p class="muted">{{ t('board.invalid.p') }}</p>
      <NuxtLink class="btn btn-primary" to="/">{{ t('board.invalid.cta') }}</NuxtLink>
    </main>

    <template v-else>
      <AppToolbar v-if="board.ready" />
      <VoteBar v-if="board.ready" />
      <div v-if="offline" class="offline pill" role="status" data-testid="offline"><Icon name="lucide:wifi-off" /> {{ t('board.connecting') }}</div>

      <div v-if="!board.ready" class="loading" role="status"><Icon name="lucide:loader" class="spin" /> {{ t('board.opening') }}</div>

      <main v-else class="board" data-testid="board">
        <BoardColumn v-for="(c, i) in board.columns" :key="c.id" :column="c" :index="i" :total="board.columns.length" />
        <button v-if="board.columns.length < 8" class="add-col" type="button" data-testid="add-column" @click="ui.editColumn(null)">
          <Icon name="lucide:plus" /> {{ t('board.addColumn') }}
        </button>
      </main>

      <ActionsDrawer />
      <ShareDialog />
      <OptionsDialog />
      <NameDialog />
      <TemplateDialog />
      <ColumnEditorDialog />
      <BoardSetupDialog :open="setupOpen" @submit="sendSetup" />
    </template>
  </div>
</template>

<style scoped>
.page { position: relative; display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }
.page > :not(.ambient) { position: relative; z-index: 1; }
.board { flex: 1; min-height: 0; display: flex; gap: 1rem; padding: 1rem; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x proximity; align-items: stretch; }
.board > .col { scroll-snap-align: start; }
.add-col { flex: 0 0 200px; align-self: flex-start; display: flex; align-items: center; justify-content: center; gap: .5rem; min-height: 120px; border: 2px dashed var(--border); border-radius: var(--r-card); background: transparent; color: var(--muted); font-weight: 700; cursor: pointer; transition: border-color .2s, color .2s, background .2s; }
.add-col:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.offline { position: fixed; z-index: 50; top: 76px; left: 50%; translate: -50% 0; box-shadow: var(--shadow-2); background: var(--surface2); }
.loading { display: flex; gap: .6rem; align-items: center; justify-content: center; flex: 1; color: var(--muted); font-weight: 600; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { rotate: 360deg; } }
.invalid { display: grid; gap: .8rem; justify-items: center; text-align: center; margin: auto; padding: 2.5rem; max-width: 420px; }
.big { font-size: 2.5rem; color: var(--danger); }
</style>
