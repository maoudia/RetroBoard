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
import { dockOf, hintOf, type Say, statusOf } from '~/poker/room-view'
import { pt } from '~/poker/strings'

// A room is never indexed, whatever the indexing switch says (and `/poker/room` is a private prefix of the shell and of the Worker).
useHead({ title: computed(() => pt('poker.pageTitle')), meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

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
const round = computed(() => view.value?.round ?? null)
const live = computed(() => !!view.value && view.value.status !== 'board')
const status = computed(() => { const line = view.value ? statusOf(view.value) : null; return line ? say(line) : '' })
const hint = computed(() => { const line = view.value ? hintOf(view.value, say) : null; return line ? say(line) : '' })
const dock = computed(() => (view.value ? dockOf(view.value) : 'none'))
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
      <div class="region" data-testid="poker-region">
        <section class="table" :aria-label="pt('poker.table.title')">
          <PokerTable :seats="view.seats" :revealed="!!round?.revealed" @invite="openInvite" />
          <p v-if="hint && dock !== 'revealed'" class="hint" data-testid="poker-hint">{{ hint }}</p>
        </section>
        <PokerResults v-if="view.stats" :stats="view.stats" :unreadable="view.unreadable" />
      </div>
      <PokerDock v-if="dock !== 'none' && round">
        <template v-if="dock === 'hand'">
          <button v-if="action === 'reveal'" type="button" class="btn btn-primary act" data-testid="poker-reveal" @click="client?.reveal()">
            <Icon name="lucide:eye" /> {{ pt('poker.reveal') }}
          </button>
          <button v-else-if="action === 'invite'" type="button" class="btn btn-primary act" data-testid="poker-invite-cta" @click="openInvite">
            <Icon name="lucide:user-plus" /> {{ pt('poker.invite.cta') }}
          </button>
          <PokerHand :deck="round.deck" :mine="view.mine" @pick="client?.vote($event)" />
        </template>
        <div v-else-if="view.moderator" class="acts">
          <button type="button" class="btn btn-primary act" data-testid="poker-revote" @click="client?.nextRound(true)">
            <Icon name="lucide:rotate-ccw" /> {{ pt('poker.revote') }}
          </button>
          <button type="button" class="btn act" data-testid="poker-next" @click="client?.nextRound()">
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
.region { min-height: 0; overflow-y: auto; padding: var(--sp-3) max(var(--sp-3), calc((100% - 44rem) / 2)); display: grid; gap: var(--sp-3); align-content: start; }
.table { display: grid; gap: var(--sp-2); }
.acts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-2); }
/* The primary action of a phone is 48 px high; the buttons of the dock are never smaller than a thumb. */
.act { min-block-size: 48px; }
@media (min-width: 600px) { .act { min-block-size: 44px; justify-self: center; min-inline-size: 12rem; } .acts { grid-template-columns: repeat(2, minmax(10rem, 14rem)); justify-content: center; } }
</style>