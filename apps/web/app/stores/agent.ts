import type { BoardDraftConfig, Confirmation } from '@retroboard/application'

interface PendingConfirmation extends Confirmation { resolve: (approved: boolean) => void }

/** State shared between browser agent tools (WebMCP) and the UI. */
export const useAgentStore = defineStore('agent', () => {
  const pending = shallowRef<PendingConfirmation | null>(null)
  /** Form values prepared by an agent on the creation page; the human still clicks Create. */
  const setupDraft = ref<BoardDraftConfig | null>(null)

  /** Asks the human; resolves false if another request replaces this one. */
  function ask(c: Confirmation): Promise<boolean> {
    pending.value?.resolve(false)
    return new Promise((resolve) => { pending.value = { ...c, resolve } })
  }
  function answer(approved: boolean) {
    const p = pending.value
    pending.value = null
    p?.resolve(approved)
  }
  return { pending, setupDraft, ask, answer }
})
