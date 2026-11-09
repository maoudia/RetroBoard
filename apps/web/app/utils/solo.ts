import { ref } from 'vue'
import { safeStorage } from './storage'

/**
 * Solo boards are ordinary encrypted boards whose relay lives in the tab (change solo-parity-and-dedup).
 * The rooms that are solo on this device are remembered here, without a cap: a solo board must never reach the real relay
 * by accident (change solo-board-parity). Only its owner converting it (Share, "Make this board shareable") forgets the mark.
 * Nothing about it is sent anywhere. The list is read synchronously (page setup), so it stays in localStorage rather than IndexedDB;
 * "Erase my data" clears it with the other retroboard: keys.
 */
const KEY = 'retroboard:solo'
const rev = ref(0)
const read = (): string[] => safeStorage.get<string[]>(KEY, [])
export const isSolo = (roomId: string | null | undefined): boolean => { void rev.value; return !!roomId && read().includes(roomId) }
export const markSolo = (roomId: string): void => {
  const l = read()
  if (l.includes(roomId)) return
  safeStorage.set(KEY, [...l, roomId])
  rev.value++
}
export const unmarkSolo = (roomId: string): void => {
  safeStorage.set(KEY, read().filter((r) => r !== roomId))
  rev.value++
}
