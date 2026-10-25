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
    release(id: string) { if (holder.value === id) holder.value = null },
  }
}
