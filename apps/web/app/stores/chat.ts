/** View model of the board chat (change board-chat): panel state and the unread count. Messages live in the board ledger. */
export const useChatStore = defineStore('chat', () => {
  const board = useBoardStore()
  const open = ref(false)
  const messages = computed(() => board.snapshot?.chat ?? [])
  /** Last message I have seen: what comes after it, written by others, is unread. Null with the baseline taken: nothing seen yet. */
  const lastSeenId = ref<string | null>(null)
  const baselined = ref(false)
  const seenUpToNow = () => { lastSeenId.value = messages.value.at(-1)?.id ?? null }
  watch(() => board.ready, (ready) => {
    if (ready && !baselined.value) { seenUpToNow(); baselined.value = true } else if (!ready) { baselined.value = false; open.value = false }
  }, { immediate: true })
  watch([messages, open], () => { if (open.value) seenUpToNow() })
  const unread = computed(() => {
    if (open.value || !baselined.value) return 0
    const at = lastSeenId.value ? messages.value.findIndex((m) => m.id === lastSeenId.value) : -1
    return messages.value.slice(at + 1).filter((m) => !m.mine).length
  })
  return { open, messages, unread, toggle: () => { open.value = !open.value } }
})
