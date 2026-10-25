/**
 * One floating popup at a time (name nudge, phase end, talk turns...): a popup claims the slot
 * while it is on screen and the others wait. Memory only.
 */
const holder = ref<string | null>(null)

export function usePopupSlot() {
  return {
    holder,
    /** True when a popup other than `id` is on screen. */
    heldByOther: (id: string) => holder.value !== null && holder.value !== id,
    claim(id: string): boolean {
      if (holder.value !== null && holder.value !== id) return false
      holder.value = id
      return true
    },
    /** Urgent popups (time is up) take the slot from a calmer one, which hides itself. */
    take(id: string) { holder.value = id },
    release(id: string) { if (holder.value === id) holder.value = null },
  }
}
