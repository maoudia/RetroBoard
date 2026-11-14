<script setup lang="ts">
import type { LibraryEntry } from '@retroboard/application'
import { getTheme } from '@retroboard/themes'
import { lastOpenedLabel } from '~/utils/relative-time'

/**
 * The board library (change user-drive-storage): the boards this person created or saved, with their team, role and last
 * activity. Open reopens a board with its keys, archive hides it and keeps its data, forget removes it after a confirmation.
 * The list is sealed in this browser; nothing here is sent anywhere.
 */
const { t, locale } = useT()
const library = useLibraryStore()
const team = useTeamStore()
const view = ref<'active' | 'archived'>('active')
const shown = computed(() => (view.value === 'active' ? library.entries : library.archived))
const now = ref(Date.now())
const toForget = ref<LibraryEntry | null>(null)
const forgetOpen = computed({ get: () => toForget.value !== null, set: (v) => { if (!v) toForget.value = null } })

const teamOf = (e: LibraryEntry) => team.teams.find((x) => x.id === (e.teamId ?? team.ws.boards[e.boardId]?.teamId))
const open = (e: LibraryEntry) => { void library.open(e.boardId) }
const archive = (e: LibraryEntry) => { void library.archive(e.boardId, !e.archived) }
function forget() {
  const e = toForget.value
  if (e) void library.forget(e.boardId, { deleteLocalCopy: true })
}
</script>

<template>
  <section class="library" :aria-label="t('library.list')" data-testid="library">
    <div class="seg" role="group" :aria-label="t('library.filter')">
      <button type="button" :class="{ on: view === 'active' }" :aria-pressed="view === 'active'" data-testid="library-active" @click="view = 'active'">{{ t('library.filter.active') }} <span class="n">{{ library.entries.length }}</span></button>
      <button type="button" :class="{ on: view === 'archived' }" :aria-pressed="view === 'archived'" data-testid="library-archived" @click="view = 'archived'">{{ t('library.filter.archived') }} <span class="n">{{ library.archived.length }}</span></button>
    </div>

    <p v-if="!library.ready" class="muted" role="status" data-testid="library-loading">{{ t('board.opening') }}</p>
    <p v-else-if="!shown.length" class="muted empty" data-testid="library-empty">{{ t(view === 'active' ? 'library.empty' : 'library.empty.archived') }}</p>
    <ul v-else class="rows">
      <li v-for="e in shown" :key="e.boardId" class="row" :data-testid="`library-row-${e.boardId}`">
        <div class="main">
          <span class="dot" :style="{ background: getTheme(e.themeId).tokens.accent }" aria-hidden="true" />
          <span class="text">
            <NuxtLink class="title" :to="{ path: '/boards', hash: e.fragment }" :data-testid="`library-open-${e.boardId}`" @click="open(e)">{{ e.title }}</NuxtLink>
            <span class="meta">
              <span v-if="teamOf(e)" class="chip" :data-testid="`library-team-${e.boardId}`"><span aria-hidden="true">{{ teamOf(e)!.emoji }}</span> {{ teamOf(e)!.name }}</span>
              <span class="chip">{{ t(e.role === 'facilitator' ? 'library.role.facilitator' : 'library.role.participant') }}</span>
              <span v-if="e.hasPasscode" class="chip"><Icon name="lucide:lock-keyhole" aria-hidden="true" /> {{ t('library.passcode') }}</span>
              <span v-if="e.solo" class="chip">{{ t('library.solo') }}</span>
              <span class="when muted">{{ lastOpenedLabel(e.lastActivityAt, now, locale) }}</span>
            </span>
          </span>
        </div>
        <div class="acts">
          <NuxtLink class="btn btn-sm btn-primary" :to="{ path: '/boards', hash: e.fragment }" :aria-label="t('library.open.aria', { title: e.title })" @click="open(e)"><Icon name="lucide:arrow-right" /> <span class="lbl">{{ t('library.open') }}</span></NuxtLink>
          <button class="btn btn-sm btn-ghost" type="button" :aria-label="t(e.archived ? 'library.unarchive.aria' : 'library.archive.aria', { title: e.title })" :data-testid="`library-archive-${e.boardId}`" @click="archive(e)">
            <Icon :name="e.archived ? 'lucide:archive-restore' : 'lucide:archive'" /> <span class="lbl">{{ t(e.archived ? 'library.unarchive' : 'library.archive') }}</span>
          </button>
          <button class="btn btn-sm btn-ghost btn-danger" type="button" :aria-label="t('library.forget.aria', { title: e.title })" :data-testid="`library-forget-${e.boardId}`" @click="toForget = e">
            <Icon name="lucide:trash" /> <span class="lbl">{{ t('library.forget') }}</span>
          </button>
        </div>
      </li>
    </ul>

    <ConfirmDialog v-model:open="forgetOpen" danger :title="t('library.forget.title')" :message="t('library.forget.message', { title: toForget?.title ?? '' })" :confirm-label="t('library.forget')" @confirm="forget" />
  </section>
</template>

<style scoped>
.library { display: grid; gap: var(--sp-4); }
.seg { display: inline-flex; width: fit-content; border: 1px solid var(--border); border-radius: 999px; overflow: hidden; }
.seg button { min-height: 36px; padding: 0 var(--sp-4); border: 0; background: var(--surface); color: var(--muted); font-weight: 600; font-size: var(--fs-sm); cursor: pointer; }
.seg button.on { background: color-mix(in srgb, var(--accent) 18%, var(--surface)); color: var(--text); box-shadow: inset 0 -3px 0 var(--accent); }
.seg .n { margin-left: var(--sp-1); font-family: var(--f-mono); font-variant-numeric: tabular-nums; }
.empty { padding: var(--sp-5) 0; }
.rows { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--sp-3); }
.row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); box-shadow: var(--shadow-1); }
.main { display: flex; align-items: center; gap: var(--sp-3); min-width: 0; color: inherit; text-decoration: none; }
.dot { flex: none; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 1px var(--border); }
.text { display: grid; gap: var(--sp-1); min-width: 0; }
.title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--fs-lg); font-weight: 600; color: inherit; text-decoration: none; }
.title:hover { text-decoration: underline; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); font-size: var(--fs-sm); }
.chip { display: inline-flex; align-items: center; gap: var(--sp-1); padding: 0 var(--sp-2); min-height: 24px; border: 1px solid var(--border); border-radius: 999px; font-size: var(--fs-xs); font-weight: 600; background: var(--surface2); }
.when { font-size: var(--fs-xs); }
.acts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--sp-2); }
.btn-ghost.btn-danger { border-color: transparent; }
/* Phones keep the buttons under the title and the labels for assistive technology only; wider screens show them. */
@media (max-width: 600px) {
  .row { grid-template-columns: minmax(0, 1fr); }
  .acts { justify-content: flex-start; }
  .lbl { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .acts .btn { min-width: 44px; min-height: 44px; }
}
[data-screen="tv"] .title { font-size: var(--fs-2xl); }
[data-screen="tv"] .meta { font-size: var(--fs-md); }
</style>
