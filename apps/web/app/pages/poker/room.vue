<script setup lang="ts">
// Scrum Poker room (change scrum-poker, ADR-0042, beta; look and layout from change poker-design-v2): one tab creates it, others join by the link,
// cards stay sealed until Reveal. A phone shows a bar, a middle region (the table, then the results) and a dock (the hand, or the next steps):
// the page does not scroll, only the middle region may.
import { formatInvite, type KeyRing, parseInvite, participantRing } from '@retroboard/domain'
import { isValidDeck } from '@retroboard/domain'
import InviteSheet from '~/components/poker/InviteSheet.vue'
import PokerBar from '~/components/poker/PokerBar.vue'
import PokerDock from '~/components/poker/PokerDock.vue'
import PokerHand from '~/components/poker/PokerHand.vue'
import PokerResults from '~/components/poker/PokerResults.vue'
import PokerTable from '~/components/poker/PokerTable.vue'
import RoomBar from '~/components/poker/RoomBar.vue'
import { PokerClient, type PokerView } from '~/poker/client'
import { useMedia } from '~/poker/media'
import { announceOf, dockOf, hintOf, primaryOf, type Say, statusOf } from '~/poker/room-view'
import { pt } from '~/poker/strings'

// A room is never indexed, whatever the indexing switch says (and `/poker/room` is a private prefix of the shell and of the Worker).
useHead({ title: computed(() => pt('poker.pageTitle')), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

/** From 600 px the table is an oval with the round and its primary action in the middle; from 1024 px the results (or a quiet round panel) sit beside it. */
const oval = useMedia('(min-width: 600px)', 'calc(cos(45deg) * 1px)')
const beside = useMedia('(min-width: 1024px)')
const NAME_SLOT = 'retroboard:poker:name'
const ring = ref<KeyRing | null>(null)
const badLink = ref(false)
const name = ref('')
const joined = ref(false)
const view = shallowRef<PokerView | null>(null)
/** The participant link: it lives here and in the invite sheet, never in the page. */
const shareUrl = ref('')
const inviteOpen = ref(false)
/** The control that opened the sheet gets the focus back when it closes (a button is not always focused by a press, Safari). */
let opener: HTMLElement | null = null
let client: PokerClient | null = null

onMounted(() => {
  const invite = parseInvite(location.hash)
  if (invite?.kind !== 'encrypted') { badLink.value = true; return }
  ring.value = invite.ring
  // The link people share never carries the moderator secret.
  shareUrl.value = `${location.origin}/poker/room#${formatInvite(participantRing(invite.ring), 'participant')}`
  try { name.value = sessionStorage.getItem(NAME_SLOT) ?? '' } catch { /* private mode: ask again */ }
  // A reload keeps the seat; a first visit offers the name this browser already uses for boards, to confirm.
  const known = name.value.trim() !== ''
  if (!known) { const identity = useIdentityStore(); identity.load(); name.value = identity.name }
  if (known) void join()
})
onBeforeUnmount(() => client?.close())

async function join() {
  const who = name.value.trim()
  if (!who || !ring.value || joined.value) return
  try { sessionStorage.setItem(NAME_SLOT, who) } catch { /* kept for this page only */ }
  joined.value = true
  const base = useRuntimeConfig().public.wsUrl || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
  const store = (() => { try { return sessionStorage } catch { return undefined } })()
  const kept = (() => { try { return JSON.parse(store?.getItem(`retroboard:poker:deck:${ring.value.roomId}`) ?? 'null') as unknown } catch { return null } })()
  client = new PokerClient({ ring: ring.value, name: who, deck: isValidDeck(kept) ? kept : undefined, socketBase: base, store, onChange: (v) => { view.value = v } })
  await client.start()
}

function openInvite(e: Event) {
  opener = e.currentTarget instanceof HTMLElement ? e.currentTarget : null
  inviteOpen.value = true
}
watch(inviteOpen, async (open) => {
  if (open) return
  await nextTick()
  // The ghost seat goes when somebody joins: the bar's button takes the focus then.
  const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>('[data-testid="poker-invite"]')
  target?.focus()
})

const say = (line: Say) => pt(line.key, line.params)
/** What a screen reader hears when the room changes: the voted count, the reveal with its figures, the new round. One region, polite, once each. */
const announcement = ref('')
watch(view, (now, before) => {
  const line = now ? announceOf(before, now, say) : null
  if (line) announcement.value = say(line)
})
/** The hand returns with a short rise after a reveal (the next round), not when a person first sits down. */
const rise = ref(false)
const round = computed(() => view.value?.round ?? null)
const live = computed(() => !!view.value && view.value.status !== 'board')
const status = computed(() => { const line = view.value ? statusOf(view.value) : null; return line ? say(line) : '' })
const hint = computed(() => { const line = view.value ? hintOf(view.value, say) : null; return line ? say(line) : '' })
const dock = computed(() => (view.value ? dockOf(view.value) : 'none'))
watch(dock, (d) => { if (d === 'revealed') rise.value = true })
/** After the reveal the filled button is the likely next step: Next round when the room agrees, Vote again when it does not (K9). */
const primary = computed(() => primaryOf(view.value?.verdict ?? null))
const title = computed(() => pt(round.value?.revote ? 'poker.round.revote' : 'poker.round', { n: round.value?.n ?? 1 }))
const boardHref = computed(() => `/boards${location.hash}`)
/** The moderator's filled button while a round is open: Invite when alone and nobody has voted, Reveal as soon as a card is in. */
const action = computed<'invite' | 'reveal' | null>(() => {
  const v = view.value
  if (!v?.moderator || !round.value || round.value.revealed) return null
  if (round.value.voted > 0) return v.canReveal ? 'reveal' : null
  return v.seats.length <= 1 ? 'invite' : null
})
</script>

<template>
  <main id="main" class="room" :class="{ live }" data-testid="poker-room">
    <template v-if="live && view">
      <RoomBar :title="title" :status="status" :state="view.status" @invite="openInvite" />
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="poker-live">{{ announcement }}</div>
      <div class="region" :class="{ beside }" tabindex="0" data-testid="poker-region">
        <section class="table" :aria-label="pt('poker.table.title')">
          <PokerTable :seats="view.seats" :revealed="!!round?.revealed" @invite="openInvite">
            <template v-if="oval" #center>
              <p class="round">{{ title }}</p>
              <p class="muted">{{ status }}</p>
              <button v-if="action === 'reveal'" type="button" class="btn btn-primary act" data-testid="poker-reveal" @click="client?.reveal()">
                <Icon name="lucide:eye" /> {{ pt('poker.reveal') }}
              </button>
              <button v-else-if="action === 'invite'" type="button" class="btn btn-primary act" data-testid="poker-invite-cta" @click="openInvite">
                <Icon name="lucide:user-plus" /> {{ pt('poker.invite.cta') }}
              </button>
            </template>
          </PokerTable>
          <p v-if="hint && dock !== 'revealed' && !beside" class="hint" data-testid="poker-hint">{{ hint }}</p>
        </section>
        <PokerResults
          v-if="view.stats" :stats="view.stats" :verdict="view.verdict" :outliers="view.outliers" :unreadable="view.unreadable" :decided="round?.decided ?? null" :moderator="view.moderator"
          @use="client?.decide($event)"
        />
        <aside v-else-if="beside" class="panel" :aria-label="pt('poker.results.title')" data-testid="poker-panel">
          <p class="round">{{ title }}</p>
          <p class="muted">{{ status }}</p>
          <p v-if="hint" class="hint" data-testid="poker-hint">{{ hint }}</p>
        </aside>
      </div>
      <PokerDock v-if="dock !== 'none' && round">
        <template v-if="dock === 'hand'">
          <template v-if="!oval">
            <button v-if="action === 'reveal'" type="button" class="btn btn-primary act" data-testid="poker-reveal" @click="client?.reveal()">
              <Icon name="lucide:eye" /> {{ pt('poker.reveal') }}
            </button>
            <button v-else-if="action === 'invite'" type="button" class="btn btn-primary act" data-testid="poker-invite-cta" @click="openInvite">
              <Icon name="lucide:user-plus" /> {{ pt('poker.invite.cta') }}
            </button>
          </template>
          <PokerHand :deck="round.deck" :mine="view.mine" :rise="rise" @pick="client?.vote($event)" />
        </template>
        <div v-else-if="view.moderator" class="acts" data-testid="poker-acts">
          <button type="button" class="btn act" :class="{ 'btn-primary': primary === 'revote' }" data-testid="poker-revote" @click="client?.nextRound(true)">
            <Icon name="lucide:rotate-ccw" /> {{ pt('poker.revote') }}
          </button>
          <button type="button" class="btn act" :class="{ 'btn-primary': primary === 'next' }" data-testid="poker-next" @click="client?.nextRound()">
            <Icon name="lucide:skip-forward" /> {{ pt('poker.next') }}
          </button>
        </div>
        <p v-else-if="hint" class="hint" data-testid="poker-hint">{{ hint }}</p>
      </PokerDock>
      <InviteSheet v-model:open="inviteOpen" :url="shareUrl" />
    </template>

    <template v-else>
      <PokerBar />
      <p v-if="badLink" class="notice" role="alert" data-testid="poker-bad-link">
        {{ pt('poker.error.link') }} <NuxtLink to="/poker" class="btn btn-sm"><Icon name="lucide:arrow-left" /> {{ pt('poker.back') }}</NuxtLink>
      </p>
      <form v-else-if="ring && !joined" class="name" @submit.prevent="join">
        <label for="poker-name">{{ pt('poker.name.label') }}</label>
        <input id="poker-name" v-model="name" class="field" type="text" maxlength="24" autocomplete="nickname" data-testid="poker-name">
        <p class="hint">{{ pt('poker.name.hint') }}</p>
        <button type="submit" class="btn btn-primary" :disabled="!name.trim()" data-testid="poker-name-join">
          <Icon name="lucide:users" /> {{ pt('poker.name.join') }}
        </button>
      </form>
      <p v-else-if="view" class="notice" role="alert" data-testid="poker-board-hint">
        {{ pt('poker.board.hint') }} <a :href="boardHref" class="btn btn-sm"><Icon name="lucide:layout-dashboard" /> {{ pt('poker.board.open') }}</a>
      </p>
    </template>
  </main>
</template>

<style scoped>
/* Not yet in the room (a bad link, the name step, a board's link): the plain column of the start page. */
.room { max-width: 44rem; margin: 0 auto; padding: var(--sp-4); display: grid; gap: var(--sp-5); align-content: start; }
.hint { margin: 0; font-size: var(--fs-sm); color: var(--muted); text-align: center; }
.notice { margin: 0; padding: var(--sp-1) var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-pill); font-size: var(--fs-sm); color: var(--muted); }
.name { display: grid; gap: var(--sp-3); max-width: 24rem; }
.name .hint { text-align: start; }
/* In the room: the bar, the middle region and the dock over the dynamic viewport. The middle region is the only thing that scrolls. */
.room.live { max-width: none; margin: 0; padding: 0; gap: 0; height: 100dvh; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; align-content: stretch; }
.region { min-height: 0; overflow-y: auto; padding: var(--sp-2) max(var(--sp-3), calc((100% - 44rem) / 2)); display: grid; gap: var(--sp-2); align-content: start; }
.table { display: grid; gap: var(--sp-2); }
/* The middle region scrolls when a crowd needs more room than there is: it takes the focus so that the keyboard can scroll it. */
.region:focus-visible { outline-offset: -2px; }
.acts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-2); }
/* The primary action of a phone is 48 px high; the buttons of the dock are never smaller than a thumb. The filled one has the quiet shadow of a card, no glow. */
.act { min-block-size: 48px; }
.act.btn-primary { box-shadow: var(--shadow-1); }
.round { margin: 0; font-family: var(--f-display); font-size: calc(var(--fs-xl) * var(--type-scale, 1)); font-weight: 700; line-height: 1.1; }
.muted { margin: 0; font-size: calc(var(--fs-sm) * var(--type-scale, 1)); color: var(--muted); }
@media (min-width: 600px) {
  .act { min-block-size: 44px; justify-self: center; min-inline-size: 12rem; }
  .acts { grid-template-columns: repeat(2, minmax(10rem, 14rem)); justify-content: center; }
  /* A tablet: the table takes what the results leave, the results come under it. The region scrolls only when the count of seats needs more room than there is. */
  .region { padding-inline: var(--sp-3); grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(min-content, 1fr) auto; align-content: stretch; }
  .table { block-size: 100%; grid-template-rows: minmax(0, 1fr) auto; min-block-size: 0; }
}
/* A laptop and wider: the table at the left, the results (or the quiet round panel before the reveal) at the right. */
@media (min-width: 1024px) {
  .region.beside { grid-template-columns: minmax(0, 1fr) calc(340px * var(--type-scale, 1)); grid-template-rows: minmax(min-content, 1fr); column-gap: var(--sp-4); }
  .region.beside > :not(.table) { align-self: start; }
}
.panel { display: grid; gap: var(--sp-2); padding: var(--sp-4) var(--sp-3); border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); text-align: center; }
</style>