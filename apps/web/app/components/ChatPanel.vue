<script setup lang="ts">
import { CHAT_TEXT_MAX } from '@retroboard/domain'
const { t, locale } = useT()
const chat = useChatStore()
const board = useBoardStore()
const text = ref('')
const input = ref<HTMLTextAreaElement | null>(null)
const log = ref<HTMLElement | null>(null)
const clearAsk = ref(false)
const time = (at: number) => new Date(at).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
const who = (m: { name: string | null; mine: boolean }) => (m.mine ? t('chat.me') : m.name ?? t('common.anonymous'))
function send() {
  const v = text.value.trim()
  if (!v) return
  if (board.commands.postChat(v).ok) text.value = ''
}
function onKey(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}
function scrollDown() { void nextTick(() => { if (log.value) log.value.scrollTop = log.value.scrollHeight }) }
watch(() => chat.messages.length, scrollDown)
watch(() => chat.open, (v) => { if (v) { scrollDown(); void nextTick(() => input.value?.focus()) } })
function onEscape(e: KeyboardEvent) { if (e.key === 'Escape' && chat.open && !clearAsk.value) { e.stopPropagation(); chat.open = false } }
onMounted(() => document.addEventListener('keydown', onEscape, true))
onBeforeUnmount(() => document.removeEventListener('keydown', onEscape, true))
</script>

<template>
  <aside v-if="chat.open" class="chat glass" :aria-label="t('chat.title')" data-testid="chat-panel">
    <header>
      <h2><Icon name="lucide:message-circle" /> {{ t('chat.title') }}</h2>
      <button v-if="board.access.canSteer && chat.messages.length" class="mini-btn" type="button" :aria-label="t('chat.clear')" :title="t('chat.clear')" data-testid="chat-clear" @click="clearAsk = true"><Icon name="lucide:trash" /></button>
      <button class="mini-btn" type="button" :aria-label="t('chat.close')" :title="t('chat.close')" data-testid="chat-close" @click="chat.open = false"><Icon name="lucide:x" /></button>
    </header>
    <div ref="log" class="log" role="log" aria-live="polite" :aria-label="t('chat.log')" data-testid="chat-log"><ol class="items">
      <li v-if="!chat.messages.length" class="empty muted">{{ t('chat.empty') }}</li>
      <li v-for="m in chat.messages" :key="m.id" class="msg" :class="{ mine: m.mine }" :data-testid="`chat-msg-${m.id}`">
        <span class="meta"><strong>{{ who(m) }}</strong> <time class="muted mono">{{ time(m.at) }}</time></span>
        <p>{{ m.text }}</p>
      </li>
    </ol></div>
    <form class="compose" @submit.prevent="send">
      <label class="sr-only" for="chat-input">{{ t('chat.placeholder') }}</label>
      <textarea id="chat-input" ref="input" v-model="text" rows="1" :maxlength="CHAT_TEXT_MAX" :placeholder="t('chat.placeholder')" data-testid="chat-input" @keydown="onKey" />
      <button class="btn btn-primary btn-sm" type="submit" :disabled="!text.trim()" data-testid="chat-send"><Icon name="lucide:send" /> {{ t('chat.send') }}</button>
    </form>
    <ConfirmDialog v-model:open="clearAsk" danger :title="t('chat.clear.title')" :message="t('chat.clear.msg')" :confirm-label="t('chat.clear.ok')" @confirm="board.commands.clearChat()" />
  </aside>
</template>

<style scoped>
.chat { position: fixed; z-index: 45; right: 12px; bottom: 12px; top: calc(var(--toolbar-actual, 64px) + 12px); width: min(340px, calc(100vw - 24px)); display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--r-card); box-shadow: var(--shadow-2); overflow: hidden; }
header { display: flex; align-items: center; gap: .4rem; padding: .6rem .75rem; border-bottom: 1px solid var(--border); }
h2 { flex: 1; display: flex; align-items: center; gap: .4rem; font-size: var(--fs-lg); }
.log { flex: 1; min-height: 0; padding: .6rem .75rem; overflow-y: auto; }
.items { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: .55rem; }
.empty { margin: auto; text-align: center; font-size: var(--fs-sm); }
.msg { max-width: 88%; padding: .4rem .65rem; border-radius: var(--r-card); background: var(--surface2); align-self: flex-start; }
.msg.mine { align-self: flex-end; background: var(--accent-soft); }
.meta { display: flex; gap: .5rem; align-items: baseline; font-size: var(--fs-xs); }
.msg p { margin: .1rem 0 0; font-size: var(--fs-md); overflow-wrap: anywhere; white-space: pre-wrap; }
.compose { display: flex; gap: .5rem; align-items: flex-end; padding: .6rem .75rem; border-top: 1px solid var(--border); }
.compose textarea { flex: 1; min-height: 38px; max-height: 6.5rem; resize: none; padding: .5rem .75rem; border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); color: inherit; font: inherit; }
@media (max-width: 600px) {
  /* Phones: a drawer from the bottom, the board stays visible above it (change board-chat). */
  .chat { left: 8px; right: 8px; top: auto; width: auto; height: min(70dvh, 520px); bottom: 8px; }
}
</style>
