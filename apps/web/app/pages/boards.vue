<script setup lang="ts">
import type { SetupResult } from '~/components/BoardSetupForm.vue'
import { LIMITS, phaseClock } from '@retroboard/domain'
import { isSolo } from '~/utils/solo'
import { boardHash, inviteFromHash, inviteRoomId, isRetiredLink } from '~/utils/invite'
import { errorLabel } from '~/utils/labels'
import { safeStorage } from '~/utils/storage'
const { t, locale } = useT()

const route = useRoute()
const { $ports } = useNuxtApp()
const board = useBoardStore()
const identity = useIdentityStore()
const drafts = useDraftsStore()
const recents = useRecentsStore()
const theme = useThemeStore()
const ui = useUiStore()
const layoutStore = useLayoutStore()
const { push } = useToasts()

const invite = computed(() => inviteFromHash(route.hash))
const roomId = computed(() => (invite.value ? inviteRoomId(invite.value) : ''))
const validRoom = computed(() => invite.value !== null)
const boardEl = ref<HTMLElement | null>(null)
useLiveShare(boardEl)
const retiredLink = computed(() => !validRoom.value && isRetiredLink(route.hash))
/** Legacy and solo boards have no roles; encrypted boards are steered by the facilitator key. */
const canSteer = computed(() => invite.value?.kind === 'legacy' || !!invite.value?.ring.facilitatorSecret)
const needsSetup = computed(() => board.ready && !board.settings?.initialized && canSteer.value)
const setupOpen = ref(false)

/** Closed boards: the facilitator destroyed it. Only the (random) room id is remembered, to explain the link next time. */
const closedKey = (id: string) => `retroboard:closed:${id}`
const closed = ref(false)
/** `silent`: the team is moving to a fresh link, this tab opens the new room next and shows no closed page. */
function closeLocal(silent = false) {
  const id = roomId.value
  if (!id || closed.value) return
  closed.value = !silent
  safeStorage.set(closedKey(id), Date.now())
  drafts.clear()
  void recents.remove(id)
  // The transport deletes the encrypted copy itself and stays connected on purpose: a participant who was
  // offline can still learn about the closing from the peers that are here.
}
/** A new avatar colour reaches the others at once (the profile is broadcast on connect and whenever it changes). */
watch(() => identity.identity.hue, (h, old) => { if (old !== undefined && h !== old && board.ready) board.updateIdentity(identity.identity) })
watch(() => board.lastNotice, (n) => {
  if (!n) return
  // "Bob started Group" is only news on open boards, where anyone may move the phase.
  if (n.kind === 'phase.next' && board.settings?.openFacilitation === false) return
  const phase = n.phase ? t(`agenda.phase.${n.phase}` as never) : ''
  push(t(`notice.${n.kind}` as never, { name: n.by ?? t('notice.someone'), column: n.column ?? '', phase } as never), 'info', 5000)
})
watch(() => board.settings?.destroyed, (v) => { if (v) closeLocal(ui.moving) }, { immediate: true })

/** Removed by the facilitator: this tab leaves the board and its copy is gone (change facilitator-moderation). */
const removedKey = (id: string) => `retroboard:removed:${id}`
const removed = ref(false)
function removeLocal() {
  const id = roomId.value
  if (!id || removed.value) return
  removed.value = true
  safeStorage.set(removedKey(id), Date.now())
  drafts.clear()
  void recents.remove(id)
  board.disconnect()
}
watch(() => board.access.removed, (v) => { if (v) removeLocal() })

/** The facilitator moved the team and sent me the new link (verified by the transport): my drafts and passcode follow, then I open it. */
watch(() => board.moved, async (m) => {
  if (!m) return
  drafts.copyTo(m.ring.roomId)
  if (passcode.value !== null && m.ring.passcode) await $ports.vault.set(m.ring.roomId, passcode.value)
  void recents.remove(roomId.value)
  push(t('board.moved.toast'), 'info', 8000)
  await navigateTo(`/boards#${m.hash}`)
})

useHead({ title: computed(() => `${board.settings?.title ?? t('board.defaultTitle')} - RetroBoard`) })

/** Passcode of a protected board: memory only, fetched from the sealed device vault. */
const passcode = ref<string | null>(null)
const needsPasscode = computed(() => invite.value?.kind === 'encrypted' && !!invite.value.ring.passcode && (passcode.value === null || board.accessDenied))

function hasSetupHandoff(id: string): boolean {
  try { return sessionStorage.getItem(`retroboard:init:${id}`) !== null } catch { return false }
}

/** Latest call wins: the passcode lookup is asynchronous, so an older call must not connect after a newer one. */
let entering = 0
async function enter() {
  const mine = ++entering
  board.disconnect()
  closed.value = false
  removed.value = false
  if (!validRoom.value) return
  if (safeStorage.get<number | null>(removedKey(roomId.value), null) !== null) { removed.value = true; return }
  if (safeStorage.get<number | null>(closedKey(roomId.value), null) !== null) { closed.value = true; return }
  identity.load()
  drafts.load(roomId.value)
  const inv = invite.value!
  if (inv.kind !== 'encrypted') return
  if (inv.ring.passcode) {
    if (passcode.value === null) {
      // The creator's code is sealed in the device vault before the page opens; so is any code remembered here.
      passcode.value = await $ports.vault.get(inv.ring.roomId)
      if (mine !== entering) return
    }
    if (passcode.value === null) return
  }
  if (!identity.named) ui.open('name')
  // Only the tab that just created this board may write its first event (the set-up hand-off is still there).
  const creator = hasSetupHandoff(roomId.value)
  board.connect(roomId.value, identity.identity, $ports.encryptedChannelFactory(inv.ring, passcode.value ?? undefined, { creator, solo: isSolo(inv.ring.roomId) }))
}

function unlock(code: string) {
  passcode.value = code
  if (invite.value?.kind === 'encrypted') void $ports.vault.set(invite.value.ring.roomId, code)
  void enter()
}
// A wrong remembered or typed passcode is forgotten, so the prompt is not skipped forever.
watch(() => board.accessDenied, (denied) => {
  if (denied && invite.value?.kind === 'encrypted') void $ports.vault.delete(invite.value.ring.roomId)
})

onMounted(() => { void enter() })
// Phones: scrolling down a column folds the menus away, scrolling up brings them back (change mobile-board-space).
const phone = import.meta.client ? window.matchMedia('(max-width: 600px)') : null
const lastTop = new WeakMap<EventTarget, number>()
function onBoardScroll(e: Event) {
  const el = e.target as HTMLElement
  if (!phone?.matches || !(el instanceof HTMLElement)) return
  const top = el.scrollTop
  const before = lastTop.get(el) ?? 0
  lastTop.set(el, top)
  if (el.scrollHeight <= el.clientHeight) return
  const dy = top - before
  // Folding changes the column height, which moves scrollTop by itself: ignore the scrolls that follow a toggle.
  if (performance.now() < settleUntil) return
  const next = top < 8 || dy < -24 ? false : dy > 12 && top > 40 ? true : ui.chromeHidden
  if (next !== ui.chromeHidden) { ui.chromeHidden = next; settleUntil = performance.now() + 400 }
}
let settleUntil = 0
// Phones show one column per screen: the dots say where you are and jump to a column (change mobile-board-space).
const activeCol = ref(0)
const visibleCols = computed(() => board.columns.filter((c) => !c.hidden))
function syncActive() {
  const el = boardEl.value
  if (!el || !phone?.matches) return
  // Columns have different widths on phones (narrow leaves the next one peeking): nearest start wins.
  const starts = [...el.querySelectorAll<HTMLElement>('.col')].map((c) => c.offsetLeft - el.offsetLeft)
  let best = 0
  starts.forEach((x, i) => { if (Math.abs(x - el.scrollLeft) < Math.abs((starts[best] ?? 0) - el.scrollLeft)) best = i })
  activeCol.value = Math.max(0, Math.min(visibleCols.value.length - 1, best))
}
const tabsEl = ref<HTMLElement | null>(null)
const isPhone = computed(() => layoutStore.cls === 'phone')
const fabEl = ref<HTMLElement | null>(null)
function openCompose() {
  const col = visibleCols.value[activeCol.value] ?? visibleCols.value[0]
  if (col) ui.openCompose(col.id)
}
// The sheet closed: the button that opened it gets the focus back.
watch(() => ui.composeColumn, async (now, was) => { if (now === null && was !== null) { await nextTick(); fabEl.value?.focus({ preventScroll: true }) } })
// The board changed under the sheet (a column hidden, the window widened, the presenter mode on): it closes.
watch([isPhone, () => ui.presenter, () => visibleCols.value.map((c) => c.id).join()], () => { if (ui.composeColumn !== null && (!isPhone.value || ui.presenter || !visibleCols.value.some((c) => c.id === ui.composeColumn))) ui.closeCompose() })
/** The tab bar scrolls when there are more tabs than fit: the active one stays in view. */
watch(activeCol, async (i) => {
  await nextTick()
  const bar = tabsEl.value
  const tab = bar?.querySelectorAll<HTMLElement>('.tab')[i]
  if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return
  bar.scrollTo({ left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' })
})
function goCol(i: number) {
  const el = boardEl.value
  const col = el?.querySelectorAll<HTMLElement>('.col')[i]
  col?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
}
watch(boardEl, (el, old) => {
  old?.removeEventListener('scroll', onBoardScroll, true)
  old?.removeEventListener('scroll', syncActive)
  el?.addEventListener('scroll', onBoardScroll, { capture: true, passive: true })
  el?.addEventListener('scroll', syncActive, { passive: true })
})
onBeforeUnmount(() => { boardEl.value?.removeEventListener('scroll', onBoardScroll, true); ui.chromeHidden = false })
useBoardAgentTools()
watch(() => route.hash, () => { passcode.value = null; void enter() })
// Anything still waiting to be written is written before the page goes. "Until I leave" needs nothing more:
// that copy lives in the tab (sessionStorage) and goes with it, so a reload or back still reopens the board.
function forgetIfLeaving() { void board.flush() }
onMounted(() => window.addEventListener('pagehide', forgetIfLeaving))
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', forgetIfLeaving)
  forgetIfLeaving()
  board.disconnect()
})

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
  board.commands.initBoard({ templateId: s.templateId, themeId: s.themeId, title: s.title, locale: s.locale ?? locale.value, openFacilitation: s.facilitation !== 'one', ...(s.announceArrivals === false ? { announceArrivals: false } : {}), ...(s.votable ? { votable: s.votable } : {}), ...(s.columns?.length ? { columns: s.columns } : {}) })
  // Votes per person and sealed ballot chosen at creation (advanced mode).
  if (s.voteLimit !== undefined || s.secretVoting || s.votingEnabled === false) board.commands.updateSettings({ ...(s.votingEnabled === false ? { votingEnabled: false } : {}), ...(s.voteLimit !== undefined ? { voteLimit: s.voteLimit } : {}), ...(s.secretVoting ? { secretVoting: true } : {}) })
  // One facilitator: the creator's tab is the lead (it never gets the takeover question).
  if (s.facilitation === 'one' && board.myKey) { ui.takeoverAsked = true; board.sendRole('role.claim', board.myKey) }
  // Carry-over chosen at creation: imported once the board exists, keeping status and owner.
  if (s.importActions?.length) board.commands.importActions(s.importActions)
  if (s.agenda?.phases.length) board.commands.setAgenda(s.agenda.phases, { rules: s.agenda.rules, autoPublish: s.agenda.autoPublish, chain: s.agenda.chain })
  // The facilitator asked for the clock to run as soon as the board exists (facilitator-controls-v2).
  if (s.agenda?.phases.length && s.agenda.autoStart) board.commands.startAgenda()
  setupOpen.value = false
  // A new shared board: the next thing the facilitator does is invite the team.
  // With carried-over actions, the review comes first and the invite panel after it.
  if (!isSolo(roomId.value)) { shareOnReady.value = true; shareAfterReview.value = !!s.importActions?.length }
}
const shareOnReady = ref(false)

// One facilitator: opening the facilitator link while someone else leads asks before taking over.
const takeoverOpen = ref(false)
const leadName = computed(() => board.peers.find((p) => !p.me && p.role === 'facilitator')?.name ?? t('common.anonymous'))
watch(() => [board.ready, board.settings?.initialized, board.settings?.openFacilitation, board.access.isLead, board.access.role, ui.dialog] as const, ([ready, init, open, lead, role, dialog]) => {
  const holdsLink = invite.value?.kind === 'encrypted' && !!invite.value.ring.facilitatorSecret
  if (ready && init && open === false && !lead && role !== 'participant' && holdsLink && !ui.takeoverAsked && !setupOpen.value && dialog !== 'name') { ui.takeoverAsked = true; takeoverOpen.value = true }
})
function takeOver() { if (board.myKey) board.sendRole('role.claim', board.myKey) }
// The lead lost the role to someone else's takeover.
// Only a role that was really held on a one-facilitator board can be lost: the first snapshots of a new board
// briefly say "lead" before the settings arrive, and must not announce a takeover nobody made.
let ledOneFacilitator = false
watch(() => [board.access.isLead, board.settings?.initialized, board.settings?.openFacilitation] as const, ([lead, init, open]) => {
  if (lead && init && open === false) ledOneFacilitator = true
}, { immediate: true })
watch(() => board.access.isLead, (now, was) => {
  if (was && !now && ledOneFacilitator && board.settings?.openFacilitation === false) push(t('roles.takeover.lost', { name: leadName.value }), 'info', 8000)
})
// Presenter mode styles the whole page (tokens on the root) and ends with the board or Escape.
let menusBefore = false
watch(() => ui.presenter, (on) => {
  if (on) {
    document.documentElement.dataset.presenter = ''
    // The menu bar slides away in presentation mode unless the person chose otherwise (change ux-irritants-wave-2).
    menusBefore = ui.chromeHidden
    if (useSettingsStore().s.presenterHideMenus) ui.chromeHidden = true
  } else { delete document.documentElement.dataset.presenter; ui.focusColumn = null; ui.chromeHidden = menusBefore }
})
// Presentation view: tell the room who started it (change toast-notifications-v2). Everybody gets a popup, the presenter does not.
watch(() => ui.presenter, (on) => { if (board.ready) board.commands.setPresenting(on) })
let announcedAt = 0
watch(() => board.snapshot?.presenting, (p) => {
  if (!p || p.mine || p.at === announcedAt) return
  announcedAt = p.at
  push(p.name ? t('presenter.announce', { name: p.name }) : t('presenter.announce.anon'), 'info', 9000)
}, { immediate: true })
// A new column turn brings the open column into view (change ux-irritants-wave-3).
watch(() => board.snapshot?.turn, async (turn) => {
  if (!turn) return
  await nextTick()
  setTimeout(() => document.querySelector(`[data-testid="column-${turn}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 200)
})
watch(() => ui.focusColumn, async (i) => {
  if (i === null) return
  await nextTick()
  const go = () => document.querySelector('.col[data-focused]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  // The accordion animates widths: the column moves while it grows, so aiming now sweeps past the next column and comes back.
  // Aim once, when the widths have settled (changes ux-irritants-wave-3 and toast-notifications-v2).
  if (ui.focusStyle === 'accordion') setTimeout(go, 450)
  else go()
})
// Column focus (presenter-mode-v2): the attribute drives the layout in base.css.
watch(() => [ui.presenter, ui.focusColumn, ui.focusStyle] as const, ([on, col, style]) => {
  const d = document.documentElement.dataset
  if (on && col !== null) d.focus = style; else delete d.focus
}, { immediate: true })
function onPresenterKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && ui.presenter && ui.dialog === null) { if (ui.focusColumn !== null) ui.focusColumn = null; else ui.presenter = false; return }
  if (ui.presenter && ui.dialog === null && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.altKey && !e.ctrlKey && !e.metaKey) {
    const el = document.activeElement as HTMLElement | null
    if (el?.matches('input, textarea, select, [contenteditable="true"]')) return
    e.preventDefault()
    focusStep(e.key === 'ArrowRight' ? 1 : -1)
  }
}
function focusStep(step: 1 | -1) {
  const n = board.columns.length
  if (!n) return
  ui.focusColumn = ui.focusColumn === null ? (step > 0 ? 0 : n - 1) : (ui.focusColumn + step + n) % n
}
// Swipe sideways moves the focus column by column (change presenter-accordion-motion).
let swipe: { x: number; y: number } | null = null
function onSwipeStart(e: TouchEvent) { const t = e.touches[0]; swipe = t ? { x: t.clientX, y: t.clientY } : null }
function onSwipeEnd(e: TouchEvent) {
  const t = e.changedTouches[0]
  const from = swipe
  swipe = null
  if (!from || !t || !ui.presenter || ui.focusColumn === null) return
  const dx = t.clientX - from.x
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(t.clientY - from.y) * 1.5) return
  focusStep(dx < 0 ? 1 : -1)
}
// Leave guard: unpublished drafts would stay in this browser only; the browser asks first.
function onBeforeUnload(e: BeforeUnloadEvent) { if (drafts.count > 0) e.preventDefault() }
const phaseEnd = usePhaseEnd()
useBoardAnnouncements()
useShortcuts()
/** Ctrl/Cmd+Z takes back my latest group, move, edit or colour change (change board-undo-rewind); fields keep their own undo. */
const runUndo = useUndo()
function onUndoKey(e: KeyboardEvent) {
  const key = e.key.toLowerCase()
  const redo = (key === 'z' && e.shiftKey) || key === 'y'
  if (!(e.ctrlKey || e.metaKey) || e.altKey || (key !== 'z' && key !== 'y') || (e.shiftKey && key !== 'z')) return
  const owner = keyboardOwner(e.target)
  if (owner.typing) return
  e.preventDefault()
  runUndo(redo)
}
onMounted(() => { document.addEventListener('keydown', onUndoKey); document.addEventListener('keydown', onPresenterKey); window.addEventListener('beforeunload', onBeforeUnload) })
onBeforeUnmount(() => { if (ui.presenter && board.ready) board.commands.setPresenting(false); document.removeEventListener('keydown', onUndoKey); document.removeEventListener('keydown', onPresenterKey); window.removeEventListener('beforeunload', onBeforeUnload); ui.presenter = false })
const shareAfterReview = ref(false)
watch(() => shareOnReady.value && !!board.settings?.initialized && ui.dialog === null && (!shareAfterReview.value || ui.reviewDone), (go) => {
  if (!go) return
  shareOnReady.value = false
  ui.open('share')
})

// The board's theme is shared: everybody sees the same ambiance.
// Imposed: everyone sees the board's theme; only light or dark is personal.
const effectiveThemeId = computed(() => board.settings?.themeId)
watch(effectiveThemeId, (id) => { if (id && id !== theme.themeId) void theme.use(id, false) }, { immediate: true })

// Remember this board on this device only (title and theme, never content).
watch(() => [board.settings?.title, board.settings?.initialized] as const, ([title, init]) => {
  if (init && title && roomId.value) void recents.touch(roomId.value, title, board.settings!.themeId, boardHash(invite.value!, 'facilitator'))
})

// Drafts of a deleted column have nowhere to live.
watch(() => board.columns.map((c) => c.id).join(), () => { if (board.columns.length) drafts.prune(board.columns.map((c) => c.id)) })

// Closing a group that vanished (dissolved by someone else).
watch(() => board.snapshot?.groups, (g) => { if (ui.openGroupId && !g?.some((x) => x.id === ui.openGroupId)) ui.openGroupId = null })

watch(() => board.lastError, (e) => { if (e) push(errorLabel(e.code), 'warn') })

// Automatic hand-over: one facilitator tab sends `agenda.advance` when the planned time is over. The command is
// idempotent (the domain checks phase and clock), so several facilitators sending it converge on the same state.
const autoTick = ref<ReturnType<typeof setInterval> | null>(null)
function checkAutoAdvance() {
  const a = board.snapshot?.agenda
  if (!a?.chain || a.pausedAt !== null || a.current < 0 || a.current + 1 >= a.phases.length) return
  if (!board.access.canSteer) return
  if (phaseClock(a, Date.now()).remainingMs <= 0) board.commands.advanceAgenda(a.current)
}
onMounted(() => { autoTick.value = setInterval(checkAutoAdvance, 1000) })
onBeforeUnmount(() => { if (autoTick.value) clearInterval(autoTick.value) })

// Auto-publish: when the Write phase ends, everyone's drafts are published (if the agenda says so).
const { publish: publishDrafts } = usePublish()
watch(() => board.snapshot?.agenda?.current, (cur, prev) => {
  const a = board.snapshot?.agenda
  if (!a || cur === undefined || prev === undefined || cur <= prev) return
  if (a.autoPublish && a.phases[prev]?.kind === 'write' && drafts.count > 0) publishDrafts()
})

// The Write phase is for writing: entering it (or opening the board during it) unfolds every writing area.
const phaseKind = computed(() => { const a = board.snapshot?.agenda; return a && a.current >= 0 ? a.phases[a.current]?.kind : undefined })
watch(phaseKind, (k) => { if (k === 'write' && (layoutStore.writingHidden || Object.keys(layoutStore.current.writeOff ?? {}).length)) layoutStore.setWritingHidden(false) }, { immediate: true })

const offline = computed(() => board.status === 'reconnecting' || board.status === 'connecting')
</script>

<template>
  <div class="page" :class="{ 'chrome-hidden': ui.chromeHidden }" :data-locked="board.locked">
    <AmbientLayer />

    <ServicePage
      v-if="!validRoom" icon="lucide:link-2-off" :title="t(retiredLink ? 'board.retired.h' : 'board.invalid.h')"
      :lead="t(retiredLink ? 'board.retired.p' : 'board.invalid.p')" :testid="retiredLink ? 'retired-link' : 'invalid-link'"
    >
      <template #actions><NuxtLink class="btn btn-primary" to="/"><Icon name="lucide:arrow-left" /> {{ t('board.invalid.cta') }}</NuxtLink></template>
    </ServicePage>

    <ServicePage
      v-else-if="removed" icon="lucide:user-x" :title="t('board.removed.title')" :lead="t('board.removed.lead')" testid="board-removed"
    >
      <template #actions><NuxtLink class="btn btn-primary" to="/new" data-testid="removed-new"><Icon name="lucide:plus" /> {{ t('board.closed.new') }}</NuxtLink><NuxtLink class="btn" to="/"><Icon name="lucide:house" /> {{ t('service.home') }}</NuxtLink></template>
    </ServicePage>

    <ServicePage
      v-else-if="closed" icon="lucide:flame" :title="t('board.closed.title')" :lead="t('board.closed.lead')" testid="board-closed"
    >
      <template #actions><NuxtLink class="btn btn-primary" to="/new" data-testid="closed-new"><Icon name="lucide:plus" /> {{ t('board.closed.new') }}</NuxtLink><NuxtLink class="btn" to="/"><Icon name="lucide:house" /> {{ t('service.home') }}</NuxtLink></template>
    </ServicePage>

    <template v-else>
      <AppToolbar v-if="board.ready" />
      <PhaseStepper v-if="board.ready && board.snapshot?.agenda" />
      <CursorLayer v-if="board.ready" />
      <PresenterJoin v-if="board.ready && ui.presenter" />
      <PresenterFocus v-if="board.ready && ui.presenter" />
      <PresenterWalk v-if="board.ready && ui.presenter" />
      <PresenterSpotlight v-if="board.ready && ui.presenter" />
      <TalkBanner v-if="board.ready" />
      <VoteBar v-if="board.ready && board.votingEnabled" />
      <TurnBar v-if="board.ready && board.snapshot?.turn" />
      <RevealCountdown v-if="board.ready" />
      <BoardFilter v-if="board.ready && ui.filterOpen" />
      <div v-if="board.roomFull" class="offline pill" role="status" data-testid="room-full"><Icon name="lucide:users" /> {{ t('board.full', { n: LIMITS.maxConnections }) }}</div>
      <div v-else-if="offline && board.ready" class="offline pill" role="status" data-testid="offline"><Icon name="lucide:wifi-off" /> {{ board.ready ? t('board.reconnecting') : t('board.connecting') }}</div>
      <div v-if="board.replicaFailing" class="offline pill warn" role="alert" data-testid="replica-failing"><Icon name="lucide:hard-drive" /> {{ t('board.replicaFailing') }}</div>

      <HiddenColumns v-if="board.ready && board.hiddenColumns.length" />
      <WaitingForBoard v-if="board.status === 'waiting' && !board.ready" :can-start="canSteer" @retry="enter" />
      <div v-else-if="!board.ready && !needsPasscode" class="opening" role="status" aria-live="polite" data-testid="board-opening">
        <div class="opening-cols" aria-hidden="true"><span v-for="n in 3" :key="n" class="sk"><i /><i /><i /></span></div>
        <div class="opening-card glass">
          <span class="ring" aria-hidden="true" />
          <strong>{{ t('board.opening') }}</strong>
          <small class="muted" :data-testid="offline ? 'offline' : undefined">{{ offline ? t('board.opening.offline') : t('board.opening.hint') }}</small>
        </div>
      </div>

      <main v-else-if="board.ready" ref="boardEl" class="board" data-testid="board" @touchstart.passive="onSwipeStart" @touchend.passive="onSwipeEnd">
        <template v-for="(c, i) in board.columns" :key="c.id">
          <BoardColumn v-if="!c.hidden" :column="c" :index="i" :total="board.columns.length" />
        </template>
        <button v-if="board.columns.length < 8" class="add-col" type="button" data-testid="add-column" @click="ui.editColumn(null)">
          <Icon name="lucide:plus" /> {{ t('board.addColumn') }}
        </button>
      </main>
      <!-- Phones: the columns as a tab bar in the thumb zone, one tab per column; the board scrolls and snaps to the tapped column (change responsive-and-i18n-hardening). -->
      <nav v-if="board.ready && visibleCols.length > 1" ref="tabsEl" class="col-tabs" :aria-label="t('board.dots')" data-reserve-bottom="tabs" data-testid="col-tabs">
        <button
          v-for="(c, i) in visibleCols" :key="c.id" type="button" class="tab" :class="{ on: i === activeCol }" :aria-label="t('board.dot', { n: i + 1, total: visibleCols.length, title: c.title })"
          :aria-current="i === activeCol ? 'true' : undefined" :data-testid="`col-tab-${i}`" @click="goCol(i)"
        >
          <Icon :name="`lucide:${c.icon}`" class="tab-ico" aria-hidden="true" />
          <span class="tab-name" aria-hidden="true">{{ c.title }}</span>
        </button>
      </nav>
      <!-- Phones: one thumb-sized button writes an idea; the composer opens as a bottom sheet on the column in view, chips pick another (change publishing-ux-redesign). -->
      <button
        v-if="board.ready && isPhone && !ui.presenter && !layoutStore.writingHidden && ui.composeColumn === null" ref="fabEl" class="compose-fab" :class="{ 'above-tabs': visibleCols.length > 1 }" type="button"
        :aria-label="t('compose.open')" :title="t('compose.open')" data-testid="compose-open" @click="openCompose"
      >
        <Icon name="lucide:pencil" /><span class="fab-label" aria-hidden="true">{{ t('compose.open') }}</span>
      </button>
      <ChatPanel v-if="board.ready" />
      <ActionsDrawer />
      <ShareDialog :passcode="passcode" @convert="enter" />
      <RankingDialog />
      <ReportDialog />
      <ExportDialog />
      <ActionsReviewDialog />
      <OptionsDialog />
      <NameDialog />
      <LiveRegions />
      <NameNudge />
      <NameConflict />
      <LazyPhaseEndPopup v-if="phaseEnd.ended.value" :key="phaseEnd.ended.value.id" :ended="phaseEnd.ended.value" @close="phaseEnd.dismiss" />
      <ConfirmDialog v-model:open="takeoverOpen" confirm-icon="lucide:key-round" :title="t('roles.takeover.title')" :message="t('roles.takeover.msg', { name: leadName })" :confirm-label="t('roles.takeover.ok')" @confirm="takeOver" />
      <TemplateDialog />
      <ConfirmDialog :open="ui.dialog === 'toClose'" confirm-icon="lucide:flag" :title="t('agenda.toClose.title')" :message="t('agenda.toClose.msg')" :confirm-label="t('agenda.toClose.ok')" @update:open="(v: boolean) => { if (!v && ui.dialog === 'toClose') ui.close() }" @confirm="board.commands.goToClosing()" />
      <ColumnEditorDialog />
      <PaletteDialog />
      <DestroyDialog />
      <ShortcutsDialog />
      <BoardSetupDialog :open="setupOpen" @submit="sendSetup" />
      <PasscodeDialog :open="needsPasscode" :wrong="board.accessDenied" @submit="unlock" />
    </template>
  </div>
</template>

<style scoped>
.page { position: relative; display: flex; flex-direction: column; height: 100dvh; overflow: hidden; }
.page > :not(.ambient, .chat, .bubble, .bubble-box, .talk) { position: relative; z-index: 1; }
/* Folded menus on phones: only the slim top bar stays (change mobile-board-space). */
.page :deep(.tools), .page :deep(.stepper), .page :deep(.votebar) { max-height: 220px; transition: max-height .3s var(--ease), opacity .2s, padding .3s, margin .3s; }
.chrome-hidden :deep(.tools), .chrome-hidden :deep(.stepper), .chrome-hidden :deep(.votebar) { max-height: 0; opacity: 0; padding-block: 0; margin-block: 0; overflow: hidden; pointer-events: none; visibility: hidden; transition: max-height .3s var(--ease), opacity .2s, padding .3s, margin .3s, visibility 0s .3s; }
@media (prefers-reduced-motion: reduce) { .page :deep(.tools), .page :deep(.stepper), .page :deep(.votebar), .chrome-hidden :deep(.tools), .chrome-hidden :deep(.stepper), .chrome-hidden :deep(.votebar) { transition: none; } }
.board { flex: 1; min-height: 0; display: flex; gap: 1rem; padding: 1rem; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x proximity; align-items: stretch; }
.board > .col { scroll-snap-align: start; }
.col-tabs { display: none; }
.compose-fab { display: none; }
@media (max-width: 600px) {
  /* One column per screen, swipe sideways, snap on each (change mobile-board-space). The width menu works here:
     narrow and normal leave the next column peeking, which tells there is more on the right (ux-irritants-wave-2). */
  .board { scroll-snap-type: x mandatory; gap: .6rem; padding: .5rem; scroll-padding-inline: .5rem; }
  .board > .col { flex: 0 0 90% !important; min-width: 0 !important; max-width: none !important; scroll-snap-align: start; scroll-snap-stop: always; }
  .board > .col[data-size="narrow"] { flex-basis: 72% !important; }
  .board > .col[data-size="wide"], .board > .col[data-size="full"], .board > .col[data-size="custom"] { flex-basis: 100% !important; }
  .board > .add-col { flex: 0 0 90%; scroll-snap-align: start; }
  /* Tab bar at the foot of the screen: one tab per column (icon over a short name), the current one lit. Tabs are 56 px
     high (the thumb), at least 64 px wide; more tabs than fit slide sideways. */
  .col-tabs { display: flex; flex: none; overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; padding-bottom: env(safe-area-inset-bottom); border-top: 1px solid var(--border); background: var(--surface); }
  .col-tabs::-webkit-scrollbar { display: none; }
  .tab { position: relative; flex: 1 0 4rem; min-width: 0; min-height: 56px; display: grid; justify-items: center; align-content: center; gap: 2px; padding: var(--sp-1) var(--sp-1); border: 0; background: transparent; color: var(--muted); font: inherit; font-size: var(--fs-xs); font-weight: 600; cursor: pointer; }
  .tab::before { content: ''; position: absolute; inset: 0 var(--sp-3) auto; height: 3px; border-radius: 0 0 var(--r-pill) var(--r-pill); background: transparent; transition: background .2s; }
  .tab.on { color: var(--accent); }
  .tab.on::before { background: var(--accent); }
  .tab-ico { font-size: var(--fs-xl); }
  .tab-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* The write button floats at the right of the thumb zone, just above the tab bar (or the foot of the screen with a single column). */
  .page > .compose-fab { position: fixed; z-index: 20; right: var(--sp-3); bottom: calc(var(--sp-3) + env(safe-area-inset-bottom)); display: inline-flex; align-items: center; gap: var(--sp-2); min-height: 56px; padding: 0 var(--sp-4); border: 0; border-radius: var(--r-pill); background: var(--accent); color: var(--accent-ink); font: inherit; font-weight: 700; box-shadow: var(--shadow-2); cursor: pointer; }
  .page:has([data-testid="group-panel"]) > .compose-fab { display: none; } /* the open group covers the column: its last actions must not sit under the button */
  .page > .compose-fab.above-tabs { bottom: calc(56px + var(--sp-3) + env(safe-area-inset-bottom)); }
}
.add-col { flex: 0 0 200px; align-self: flex-start; display: flex; align-items: center; justify-content: center; gap: .5rem; min-height: 120px; border: 2px dashed var(--border); border-radius: var(--r-card); background: transparent; color: var(--muted); font-weight: 700; cursor: pointer; transition: border-color .2s, color .2s, background .2s; }
.add-col:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.offline { position: fixed; z-index: 50; top: 76px; left: 50%; translate: -50% 0; box-shadow: var(--shadow-2); background: var(--surface2); }
.offline.warn { top: 124px; border: 1px solid var(--warn, var(--danger)); }
.opening { position: relative; flex: 1; display: grid; place-items: center; padding: var(--sp-4); overflow: hidden; }
.opening-cols { position: absolute; inset: var(--sp-4); display: flex; gap: var(--sp-4); opacity: .5; pointer-events: none; }
.opening-cols .sk { flex: 1; display: flex; flex-direction: column; gap: var(--sp-3); min-width: 0; }
.opening-cols .sk:nth-child(n + 2) { display: none; }
@media (min-width: 720px) { .opening-cols .sk:nth-child(n + 2) { display: flex; } }
.opening-cols i { display: block; height: 4.5rem; border-radius: var(--r-card); background: var(--surface2); animation: pulse 1.6s ease-in-out infinite; }
.opening-cols i:nth-child(2) { height: 3.5rem; animation-delay: .2s; }
.opening-cols i:nth-child(3) { height: 5.5rem; animation-delay: .4s; }
.opening-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); padding: var(--sp-5) var(--sp-6); max-width: min(22rem, 100%); text-align: center; border-radius: var(--r-card); }
.opening-card strong { font-size: var(--fs-lg); }
.opening-card small { font-size: var(--fs-sm); }
.ring { width: 2.25rem; height: 2.25rem; margin-bottom: var(--sp-2); border-radius: 50%; border: 3px solid var(--surface2); border-top-color: var(--accent, currentColor); animation: spin 1s linear infinite; }
@keyframes pulse { 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .ring, .opening-cols i { animation: none; } }
@keyframes spin { to { rotate: 360deg; } }
.invalid { display: grid; gap: .8rem; justify-items: center; text-align: center; margin: auto; padding: 2.5rem; max-width: 420px; }
.big { font-size: var(--fs-3xl); color: var(--danger); }
</style>
