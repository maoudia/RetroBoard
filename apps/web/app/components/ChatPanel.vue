<script setup lang="ts">
import { connectionState } from '@retroboard/application'
import { CHAT_TEXT_MAX } from '@retroboard/domain'
import type { Peer } from '@retroboard/domain'
const { t, locale } = useT()

/**
 * Live chat (changes board-chat and toast-notifications-v2): a floating lateral drawer, never part of the board layout.
 * It slides in from the chosen side, can be minimised to a bubble that keeps the unread count, closed with X,
 * and shows who is online with their connection state and what they are doing.
 */
const chat = useChatStore()
const board = useBoardStore()
const live = useLiveStore()
const settings = useSettingsStore()
const text = ref('')
const input = ref<HTMLTextAreaElement | null>(null)
const log = ref<HTMLElement | null>(null)
const clearAsk = ref(false)
const layout = useLayoutStore()
const side = computed(() => layout.chatSide ?? settings.s.chatSide)

const time = (at: number) => new Date(at).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
const initial = (n: string | null) => (n?.trim()[0] ?? '?').toUpperCase()
const hue = (n: string | null) => { let h = 0; for (const c of n ?? 'x') h = (h * 31 + c.charCodeAt(0)) % 360; return h }
const avatar = (n: string | null) => ({ background: `hsl(${hue(n)} 70% 72%)` })

/** People here now, with the dot of their connection (direct, relay, reconnecting) and what they do. */
const stateOf = (p: Peer) => connectionState({ me: p.me, conn: p.conn, direct: board.links?.direct ?? [], status: board.status, p2p: board.links?.p2p ?? false })
const people = computed(() => board.peers.filter((p) => !p.hidden))
const myState = computed(() => connectionState({ me: true, direct: board.links?.direct ?? [], status: board.status, p2p: board.links?.p2p ?? false }))
const typing = (p: Peer) => !p.me && live.status(p.conn).status === 'typing'
const someoneTyping = computed(() => people.value.filter(typing).map((p) => p.name ?? t('common.anonymous')))
const peerByName = (name: string | null) => (name ? people.value.find((p) => !p.me && p.name === name) : undefined)

/** Consecutive lines of one author within four minutes read as one block. */
interface Group { key: string; name: string | null; mine: boolean; at: number; items: { id: string; text: string; at: number }[] }
const groups = computed<Group[]>(() => {
  const out: Group[] = []
  for (const m of chat.messages) {
    const last = out.at(-1)
    if (last && last.mine === m.mine && last.name === m.name && m.at - last.items.at(-1)!.at < 240_000) last.items.push({ id: m.id, text: m.text, at: m.at })
    else out.push({ key: m.id, name: m.name, mine: m.mine, at: m.at, items: [{ id: m.id, text: m.text, at: m.at }] })
  }
  return out
})
const who = (g: Group) => (g.mine ? t('chat.me') : g.name ?? t('common.anonymous'))

function send() {
  const v = text.value.trim()
  if (!v) return
  if (board.commands.postChat(v).ok) { text.value = ''; void nextTick(() => grow()) }
}
function grow() { const el = input.value; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 112)}px` }
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}
function scrollDown() { void nextTick(() => { if (log.value) log.value.scrollTop = log.value.scrollHeight }) }
watch(() => chat.messages.length, scrollDown)
watch(() => chat.open, (v) => { if (v) { scrollDown(); void nextTick(() => input.value?.focus({ preventScroll: true })) } })
function onEscape(e: KeyboardEvent) { if (e.key === 'Escape' && chat.open && !clearAsk.value) { e.stopPropagation(); chat.close() } }
onMounted(() => document.addEventListener('keydown', onEscape, true))
onBeforeUnmount(() => document.removeEventListener('keydown', onEscape, true))
const flip = () => layout.setChatSide(side.value === 'right' ? 'left' : 'right')
</script>

<template>
  <Transition name="chat">
    <aside v-if="chat.open" class="chat glass" :data-side="side" :aria-label="t('chat.title')" data-testid="chat-panel">
      <header>
        <h2><Icon name="lucide:message-circle" /> {{ t('chat.title') }}</h2>
        <span class="online" :data-state="myState" :title="t(`presence.${myState}`)" data-testid="chat-online"><ConnDot :state="myState" /> {{ t('chat.online', { n: people.length }) }}</span>
        <span class="tools">
          <button v-if="board.access.canSteer && chat.messages.length" class="mini-btn" type="button" :aria-label="t('chat.clear')" :title="t('chat.clear')" data-testid="chat-clear" @click="clearAsk = true"><Icon name="lucide:trash" /></button>
          <button class="mini-btn" type="button" :aria-label="t('chat.flip')" :title="t('chat.flip')" data-testid="chat-flip" @click="flip"><Icon name="lucide:arrow-left-right" /></button>
          <button class="mini-btn" type="button" :aria-label="t('chat.minimize')" :title="t('chat.minimize')" data-testid="chat-minimize" @click="chat.minimize()"><Icon :name="side === 'right' ? 'lucide:chevrons-right' : 'lucide:chevrons-left'" /></button>
          <button class="mini-btn" type="button" :aria-label="t('chat.close')" :title="t('chat.close')" data-testid="chat-close" @click="chat.close()"><Icon name="lucide:x" /></button>
        </span>
      </header>

      <ul class="people" :aria-label="t('participants.online')" data-testid="chat-people">
        <li v-for="(p, i) in people" :key="p.key ?? i" class="who" :class="{ typing: typing(p) }" :title="p.name ?? t('common.anonymous')">
          <span class="av" :style="avatar(p.name)">{{ initial(p.name) }}<ConnDot class="cd" :state="stateOf(p)" /></span>
          <span class="nm">{{ p.me ? t('chat.me') : p.name ?? t('common.anonymous') }}</span>
          <Icon v-if="p.role === 'facilitator' && !board.settings?.openFacilitation" name="lucide:crown" class="role" />
          <span v-if="typing(p)" class="dots" aria-hidden="true"><i /><i /><i /></span>
        </li>
      </ul>

      <div ref="log" class="log" role="log" aria-live="polite" :aria-label="t('chat.log')" data-testid="chat-log">
        <ol class="items">
          <li v-if="!chat.messages.length" class="empty muted"><Icon name="lucide:messages-square" /><span>{{ t('chat.empty') }}</span></li>
          <TransitionGroup name="msg">
            <li v-for="g in groups" :key="g.key" class="grp" :class="{ mine: g.mine }">
              <span v-if="!g.mine" class="av sm" :style="avatar(g.name)">{{ initial(g.name) }}<ConnDot v-if="peerByName(g.name)" class="cd" :state="stateOf(peerByName(g.name)!)" /></span>
              <div class="col">
                <span class="meta"><strong>{{ who(g) }}</strong> <time class="muted mono">{{ time(g.at) }}</time></span>
                <p v-for="m in g.items" :key="m.id" class="bub" :data-testid="`chat-msg-${m.id}`" :title="time(m.at)">{{ m.text }}</p>
              </div>
            </li>
          </TransitionGroup>
        </ol>
      </div>
      <p v-if="someoneTyping.length" class="typing-line muted" role="status" aria-live="polite">{{ t('chat.typing', { names: someoneTyping.join(', ') }) }}</p>

      <form class="compose" @submit.prevent="send">
        <label class="sr-only" for="chat-input">{{ t('chat.placeholder') }}</label>
        <textarea id="chat-input" ref="input" v-model="text" rows="1" :maxlength="CHAT_TEXT_MAX" :placeholder="t('chat.placeholder')" data-testid="chat-input" @keydown="onKey" @input="grow" />
        <button class="send" type="submit" :disabled="!text.trim()" :aria-label="t('chat.send')" :title="t('chat.send')" data-testid="chat-send"><Icon name="lucide:send" /><span class="sr-only">{{ t('chat.send') }}</span></button>
      </form>
      <ConfirmDialog v-model:open="clearAsk" danger :title="t('chat.clear.title')" :message="t('chat.clear.msg')" :confirm-label="t('chat.clear.ok')" @confirm="board.commands.clearChat()" />
    </aside>
  </Transition>

  <!-- Minimised: a bubble on the edge with the unread count and who is here; one tap brings the drawer back. -->
  <Transition name="bubble">
    <button v-if="!chat.open && chat.minimized" class="bubble" :data-side="side" type="button" :aria-label="chat.unread ? t('chat.unread', { n: chat.unread }) : t('chat.title')" data-testid="chat-bubble" @click="chat.show()">
      <Icon name="lucide:message-circle" />
      <span v-if="chat.unread" class="badge" data-testid="chat-bubble-unread">{{ chat.unread }}</span>
      <span class="stack" aria-hidden="true"><i v-for="(p, i) in people.slice(0, 3)" :key="i" :style="avatar(p.name)">{{ initial(p.name) }}</i></span>
    </button>
  </Transition>
</template>

<style scoped>
.chat {
  position: fixed; z-index: 45; top: calc(var(--toolbar-actual, 64px) + 12px); bottom: 12px; width: min(380px, calc(100vw - 16px)); display: flex; flex-direction: column;
  border: 1px solid var(--border); border-radius: calc(var(--r-card) + 4px); box-shadow: var(--shadow-2); overflow: hidden;
}
.chat[data-side="right"], .bubble[data-side="right"] { right: 8px; }
.chat[data-side="left"], .bubble[data-side="left"] { left: 8px; }
header { display: flex; align-items: center; gap: .5rem; padding: .65rem .75rem .5rem; }
h2 { display: flex; align-items: center; gap: .4rem; font-size: var(--fs-lg); margin: 0; }
.online { display: inline-flex; align-items: center; gap: .35rem; padding: .15rem .6rem; border-radius: 999px; background: var(--accent-soft); font-size: var(--fs-xs); font-weight: 700; }
.tools { margin-inline-start: auto; display: inline-flex; gap: 2px; }
.people { display: flex; gap: .4rem; margin: 0; padding: .15rem .75rem .6rem; list-style: none; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--border); }
.people::-webkit-scrollbar { display: none; }
.who { display: inline-flex; align-items: center; gap: .4rem; flex: none; padding: .2rem .6rem .2rem .25rem; border-radius: 999px; background: var(--surface2); border: 1px solid var(--border); font-size: var(--fs-sm); font-weight: 600; }
.who.typing { border-color: var(--accent); }
.nm { max-width: 8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role { color: var(--warn, var(--accent)); font-size: var(--fs-sm); }
.av { position: relative; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; font-weight: 800; font-size: var(--fs-xs); color: #1b1b1b; flex: none; }
.av.sm { width: 28px; height: 28px; align-self: flex-end; }
.cd { position: absolute; right: -3px; bottom: -3px; outline: 2px solid var(--surface); }
.dots { display: inline-flex; gap: 2px; }
.dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); animation: chat-dot 1s ease-in-out infinite; }
.dots i:nth-child(2) { animation-delay: .15s; } .dots i:nth-child(3) { animation-delay: .3s; }
@keyframes chat-dot { 50% { transform: translateY(-3px); opacity: .5; } }
.log { flex: 1; min-height: 0; padding: .75rem; overflow-y: auto; scrollbar-width: thin; }
.items { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: .8rem; min-height: 100%; }
.empty { margin: auto; display: grid; justify-items: center; gap: .5rem; text-align: center; font-size: var(--fs-sm); }
.empty :deep(svg) { font-size: var(--fs-3xl); opacity: .6; }
.grp { display: flex; gap: .5rem; align-items: flex-end; max-width: 92%; }
.grp.mine { align-self: flex-end; flex-direction: row-reverse; }
.col { display: grid; gap: 3px; min-width: 0; }
.grp.mine .col { justify-items: end; }
.meta { display: flex; gap: .5rem; align-items: baseline; font-size: var(--fs-xs); padding-inline: .35rem; }
.bub { margin: 0; padding: .45rem .8rem; border-radius: var(--r-card) var(--r-card) var(--r-card) var(--r-xs); background: var(--surface2); border: 1px solid var(--border); font-size: var(--fs-md); line-height: 1.35; overflow-wrap: anywhere; white-space: pre-wrap; width: fit-content; max-width: 100%; }
.grp.mine .bub { border-radius: var(--r-card) var(--r-card) var(--r-xs) var(--r-card); background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.typing-line { margin: 0; padding: 0 1rem .25rem; font-size: var(--fs-xs); }
.compose { display: flex; gap: .5rem; align-items: flex-end; padding: .6rem .75rem .75rem; border-top: 1px solid var(--border); }
.compose textarea { flex: 1; min-height: 42px; max-height: 7rem; resize: none; padding: .6rem 1rem; border: 1px solid var(--control, var(--border)); border-radius: var(--r-card); background: var(--surface); color: inherit; font: inherit; line-height: 1.3; }
.compose textarea:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); outline: none; }
.send { display: grid; place-items: center; flex: none; width: 42px; height: 42px; border-radius: 50%; border: 0; background: var(--accent); color: var(--accent-ink); font-size: var(--fs-lg); cursor: pointer; transition: transform .15s var(--ease), opacity .15s; }
.send:hover:not(:disabled) { transform: scale(1.08); }
.send:disabled { opacity: .4; cursor: default; }

.bubble { position: fixed; z-index: 45; bottom: 18px; display: grid; grid-auto-flow: column; align-items: center; gap: .5rem; min-height: 52px; padding: 0 .9rem; border-radius: 999px; border: 1px solid var(--border); background: var(--accent); color: var(--accent-ink); font-size: var(--fs-xl); cursor: pointer; box-shadow: var(--shadow-2); }
.bubble .badge { position: absolute; top: -6px; right: -4px; min-width: 20px; padding: 0 .35rem; border-radius: 999px; background: var(--danger); color: #fff; font-size: var(--fs-xs); font-weight: 800; text-align: center; }
.stack { display: inline-flex; }
.stack i { display: grid; place-items: center; width: 24px; height: 24px; margin-inline-start: -8px; border-radius: 50%; border: 2px solid var(--accent); font: 800 var(--fs-xs) var(--f-body, inherit); font-style: normal; color: #1b1b1b; }
.stack i:first-child { margin-inline-start: 0; }

/* Slide in from the chosen edge, bubbles pop, new lines rise; none of it under reduced motion. */
.chat-enter-active, .chat-leave-active { transition: transform .38s var(--spring, cubic-bezier(.22, 1, .36, 1)), opacity .25s; }
.chat[data-side="right"].chat-enter-from, .chat[data-side="right"].chat-leave-to { transform: translateX(110%); opacity: 0; }
.chat[data-side="left"].chat-enter-from, .chat[data-side="left"].chat-leave-to { transform: translateX(-110%); opacity: 0; }
.bubble-enter-active, .bubble-leave-active { transition: transform .3s var(--spring, cubic-bezier(.22, 1, .36, 1)), opacity .2s; }
.bubble-enter-from, .bubble-leave-to { transform: scale(.4); opacity: 0; }
.msg-enter-active { animation: msg-in .3s var(--spring, cubic-bezier(.22, 1, .36, 1)); }
@keyframes msg-in { from { opacity: 0; transform: translateY(10px) scale(.97); } }
@media (prefers-reduced-motion: reduce) { .chat-enter-active, .chat-leave-active, .bubble-enter-active, .bubble-leave-active { transition: none; } .msg-enter-active, .dots i { animation: none; } }
</style>
